import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import type { Id } from './_generated/dataModel'
import { deleteProjectCascade, insertResults } from './helpers'
import { SAMPLE_DOCUMENTS } from '../shared/sample/sample-documents'
import { SAMPLE_SCHEMA } from '../shared/sample/sample-schema'
import { PRECOMPUTED_FIRST_PASS, PRECOMPUTED_REPAIRS } from '../shared/sample/sample-precomputed'
import { segmentParagraphs } from '../shared/segments'
import { runPipeline } from '../shared/pipeline'
import type { ModelField } from '../shared/model-output'
import type { SourceDocument } from '../shared/types'

export const find = query({
  args: {},
  handler: async (ctx) => {
    const p = await ctx.db
      .query('projects')
      .filter((q) => q.eq(q.field('isDemo'), true))
      .first()
    return p?._id ?? null
  },
})

/**
 * Create (or recreate) the sample project with precomputed results. The fixture
 * output goes through the same pipeline and deterministic verifier as live runs.
 */
export const load = mutation({
  args: { reset: v.optional(v.boolean()) },
  handler: async (ctx, { reset }) => {
    const existing = await ctx.db
      .query('projects')
      .filter((q) => q.eq(q.field('isDemo'), true))
      .first()
    if (existing && !reset) return existing._id
    if (existing) await deleteProjectCascade(ctx, existing._id)

    const now = Date.now()
    const projectId = await ctx.db.insert('projects', {
      name: 'Harbor Light grant intake (sample)',
      description: 'Fictional small-nonprofit grant application: narrative, follow-up email, and board minutes.',
      createdAt: now,
      isDemo: true,
    })
    const keyToId: Record<string, Id<'documents'>> = {}
    const docs: SourceDocument[] = []
    for (const d of SAMPLE_DOCUMENTS) {
      const segments = segmentParagraphs(d.text)
      const id = await ctx.db.insert('documents', {
        projectId,
        name: d.name,
        kind: d.kind,
        text: d.text,
        segments,
        parseStatus: 'parsed',
        sizeBytes: new TextEncoder().encode(d.text).length,
        createdAt: now + docs.length,
      })
      keyToId[d.key] = id
      docs.push({ id, name: d.name, text: d.text, segments })
    }
    const schemaId = await ctx.db.insert('schemas', {
      projectId,
      sections: SAMPLE_SCHEMA.sections,
      fields: SAMPLE_SCHEMA.fields,
      updatedAt: now,
    })

    const mapIds = (f: ModelField): ModelField => ({
      ...f,
      evidence: f.evidence.map((e) => ({ ...e, documentId: keyToId[e.documentId] ?? e.documentId })),
    })
    const { results, stats } = await runPipeline(SAMPLE_SCHEMA.fields, docs, {
      extract: async () => ({ fields: PRECOMPUTED_FIRST_PASS.fields.map(mapIds) }),
      repair: async (field) => {
        const r = PRECOMPUTED_REPAIRS[field.id]
        return r ? mapIds(r) : undefined
      },
    })
    const runId = await ctx.db.insert('runs', {
      projectId,
      schemaId,
      model: 'precomputed fixture',
      startedAt: now,
      finishedAt: now,
      status: 'completed',
      isPrecomputed: true,
      progress: 'Done',
      stats: { ...stats, modelCalls: 0, parseRetries: 0, inputTokens: 0, outputTokens: 0, durationMs: 0 },
    })
    await insertResults(ctx, runId, projectId, results)
    return projectId
  },
})
