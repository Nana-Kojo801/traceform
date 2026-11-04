import { ConvexError, v } from 'convex/values'
import { internalMutation, internalQuery, mutation, query } from './_generated/server'
import { internal } from './_generated/api'
import { rawResultV, runStatsV } from './schema'
import { getDocumentsForProject, getSchemaForProject, insertResults, utcDay } from './helpers'
import { DEFAULT_DAILY_RUN_CAP, MAX_DOCUMENTS_PER_PROJECT, MAX_TOTAL_CHARS, RUN_COOLDOWN_MS } from '../shared/limits'

const STALE_RUN_MS = 10 * 60 * 1000

export function dailyCap() {
  const n = Number(process.env.DAILY_RUN_CAP)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_DAILY_RUN_CAP
}

export function modelName() {
  return process.env.META_MODEL || 'muse-spark-1.3'
}

/** Public connection/config status. Never returns the key itself. */
export const status = query({
  args: {},
  handler: async (ctx) => {
    const today = await ctx.db
      .query('usage_days')
      .withIndex('by_day', (q) => q.eq('day', utcDay(Date.now())))
      .unique()
    return {
      keyConfigured: Boolean(process.env.MODEL_API_KEY),
      model: modelName(),
      dailyRunsUsed: today?.liveRuns ?? 0,
      dailyRunCap: dailyCap(),
      cooldownMs: RUN_COOLDOWN_MS,
    }
  },
})

/** Runs for a project (newest first) with their results. */
export const workspace = query({
  args: { projectId: v.id('projects'), runId: v.optional(v.id('runs')) },
  handler: async (ctx, { projectId, runId }) => {
    const runs = await ctx.db
      .query('runs')
      .withIndex('by_project', (q) => q.eq('projectId', projectId))
      .order('desc')
      .collect()
    const latest = runs[0] ?? null
    const selected =
      (runId ? runs.find((r) => r._id === runId && r.status === 'completed') : undefined) ??
      runs.find((r) => r.status === 'completed') ??
      null
    const results = selected
      ? await ctx.db
          .query('field_results')
          .withIndex('by_run', (q) => q.eq('runId', selected._id))
          .collect()
      : []
    const log = selected
      ? (
          await ctx.db
            .query('review_log')
            .withIndex('by_run', (q) => q.eq('runId', selected._id))
            .order('desc')
            .take(50)
        )
      : []
    return {
      runs: runs.map((r) => ({
        _id: r._id,
        status: r.status,
        startedAt: r.startedAt,
        finishedAt: r.finishedAt,
        isPrecomputed: r.isPrecomputed,
        model: r.model,
        error: r.error,
        progress: r.progress,
        stats: r.stats,
      })),
      latest,
      selected,
      results,
      log,
    }
  },
})

/** Start a live extraction with Meta's model. All credit caps are checked here. */
export const startLive = mutation({
  args: { projectId: v.id('projects') },
  handler: async (ctx, { projectId }) => {
    const project = await ctx.db.get(projectId)
    if (!project) throw new ConvexError('Project not found.')
    if (!process.env.MODEL_API_KEY) {
      throw new ConvexError('The Meta API key is not configured on the server (MODEL_API_KEY).')
    }
    const schema = await getSchemaForProject(ctx, projectId)
    if (!schema || schema.fields.length === 0) throw new ConvexError('Add at least one form field first.')
    const docs = (await getDocumentsForProject(ctx, projectId)).filter((d) => d.parseStatus === 'parsed')
    if (docs.length === 0) throw new ConvexError('Upload at least one parsed document first.')
    if (docs.length > MAX_DOCUMENTS_PER_PROJECT) {
      throw new ConvexError(`Limit: at most ${MAX_DOCUMENTS_PER_PROJECT} documents per extraction.`)
    }
    const totalChars = docs.reduce((n, d) => n + d.text.length, 0)
    if (totalChars > MAX_TOTAL_CHARS) {
      throw new ConvexError(
        `Limit: documents total ${totalChars.toLocaleString()} characters; the cap is ${MAX_TOTAL_CHARS.toLocaleString()} per extraction. Remove a document.`,
      )
    }

    const now = Date.now()
    const running = await ctx.db
      .query('runs')
      .withIndex('by_project', (q) => q.eq('projectId', projectId))
      .filter((q) => q.eq(q.field('status'), 'running'))
      .collect()
    for (const r of running) {
      if (now - r.startedAt > STALE_RUN_MS) {
        await ctx.db.patch(r._id, { status: 'failed', error: 'Run timed out.', finishedAt: now })
      } else {
        throw new ConvexError('An extraction is already running for this project.')
      }
    }
    if (project.lastRunStartedAt && now - project.lastRunStartedAt < RUN_COOLDOWN_MS) {
      const wait = Math.ceil((RUN_COOLDOWN_MS - (now - project.lastRunStartedAt)) / 1000)
      throw new ConvexError(`Cooldown: please wait ${wait}s before running this project again.`)
    }

    const day = utcDay(now)
    const usage = await ctx.db
      .query('usage_days')
      .withIndex('by_day', (q) => q.eq('day', day))
      .unique()
    const cap = dailyCap()
    if ((usage?.liveRuns ?? 0) >= cap) {
      throw new ConvexError(`Daily cap reached: ${cap} live extractions per day for this demo. Try again tomorrow (UTC).`)
    }
    if (usage) await ctx.db.patch(usage._id, { liveRuns: usage.liveRuns + 1 })
    else await ctx.db.insert('usage_days', { day, liveRuns: 1 })

    await ctx.db.patch(projectId, { lastRunStartedAt: now })
    const runId = await ctx.db.insert('runs', {
      projectId,
      schemaId: schema._id,
      model: modelName(),
      startedAt: now,
      status: 'running',
      progress: 'Queued',
      isPrecomputed: false,
    })
    await ctx.scheduler.runAfter(0, internal.extraction.execute, { runId })
    return runId
  },
})

// ---------- internal helpers used by the extraction action ----------

export const getRunContext = internalQuery({
  args: { runId: v.id('runs') },
  handler: async (ctx, { runId }) => {
    const run = await ctx.db.get(runId)
    if (!run) return null
    const schema = await ctx.db.get(run.schemaId)
    const docs = (await getDocumentsForProject(ctx, run.projectId)).filter((d) => d.parseStatus === 'parsed')
    return { run, schema, docs }
  },
})

export const getProjectContext = internalQuery({
  args: { projectId: v.id('projects') },
  handler: async (ctx, { projectId }) => {
    const schema = await getSchemaForProject(ctx, projectId)
    const docs = (await getDocumentsForProject(ctx, projectId)).filter((d) => d.parseStatus === 'parsed')
    return { fields: schema?.fields ?? [], docs }
  },
})

export const setProgress = internalMutation({
  args: { runId: v.id('runs'), progress: v.string() },
  handler: async (ctx, { runId, progress }) => {
    await ctx.db.patch(runId, { progress })
  },
})

export const complete = internalMutation({
  args: { runId: v.id('runs'), results: v.record(v.string(), rawResultV), stats: runStatsV },
  handler: async (ctx, { runId, results, stats }) => {
    const run = await ctx.db.get(runId)
    if (!run) return
    await insertResults(ctx, runId, run.projectId, results)
    await ctx.db.patch(runId, { status: 'completed', finishedAt: Date.now(), stats, progress: 'Done' })
  },
})

export const fail = internalMutation({
  args: { runId: v.id('runs'), error: v.string() },
  handler: async (ctx, { runId, error }) => {
    await ctx.db.patch(runId, { status: 'failed', finishedAt: Date.now(), error: error.slice(0, 500) })
  },
})
