import { ConvexError, v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { deleteProjectCascade, getDocumentsForProject, getSchemaForProject } from './helpers'

export const list = query({
  args: {},
  handler: async (ctx) => {
    const projects = await ctx.db.query('projects').withIndex('by_createdAt').order('desc').collect()
    return await Promise.all(
      projects.map(async (p) => {
        const docs = await getDocumentsForProject(ctx, p._id)
        const schema = await getSchemaForProject(ctx, p._id)
        const runs = await ctx.db
          .query('runs')
          .withIndex('by_project', (q) => q.eq('projectId', p._id))
          .order('desc')
          .collect()
        const lastRun = runs[0] ?? null
        const completed = runs.find((r) => r.status === 'completed') ?? null
        const results = completed
          ? await ctx.db
              .query('field_results')
              .withIndex('by_run', (q) => q.eq('runId', completed._id))
              .collect()
          : []
        const order = new Map((schema?.fields ?? []).map((f, i) => [f.id, i]))
        const answers = results
          .slice()
          .sort((a, b) => (order.get(a.fieldId) ?? 99) - (order.get(b.fieldId) ?? 99))
          .map((r) => r.raw.status)
        return {
          ...p,
          documentCount: docs.length,
          documentKinds: docs.map((d) => d.kind),
          transcribedCount: docs.filter((d) => d.transcribed).length,
          fieldCount: schema?.fields.length ?? 0,
          answers,
          reviewedCount: results.filter((r) => r.current.state !== 'unreviewed').length,
          lastRun: lastRun
            ? {
                status: lastRun.status,
                startedAt: lastRun.startedAt,
                isPrecomputed: lastRun.isPrecomputed,
                durationMs: lastRun.stats?.durationMs ?? null,
                modelCalls: lastRun.stats?.modelCalls ?? null,
              }
            : null,
        }
      }),
    )
  },
})

export const get = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, { projectId }) => {
    return await ctx.db.get(projectId)
  },
})

export const create = mutation({
  args: { name: v.string(), description: v.string() },
  handler: async (ctx, { name, description }) => {
    const trimmed = name.trim()
    if (!trimmed) throw new ConvexError('Project name is required.')
    if (trimmed.length > 120) throw new ConvexError('Project name must be 120 characters or fewer.')
    const projectId = await ctx.db.insert('projects', {
      name: trimmed,
      description: description.trim().slice(0, 500),
      createdAt: Date.now(),
      isDemo: false,
    })
    await ctx.db.insert('schemas', { projectId, sections: [], fields: [], updatedAt: Date.now() })
    return projectId
  },
})

export const rename = mutation({
  args: { projectId: v.id('projects'), name: v.string(), description: v.string() },
  handler: async (ctx, { projectId, name, description }) => {
    const trimmed = name.trim()
    if (!trimmed) throw new ConvexError('Project name is required.')
    await ctx.db.patch(projectId, { name: trimmed.slice(0, 120), description: description.trim().slice(0, 500) })
  },
})

export const remove = mutation({
  args: { projectId: v.id('projects') },
  handler: async (ctx, { projectId }) => {
    const project = await ctx.db.get(projectId)
    if (!project) return
    await deleteProjectCascade(ctx, projectId)
  },
})
