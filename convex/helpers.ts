import type { Doc, Id } from './_generated/dataModel'
import type { MutationCtx, QueryCtx } from './_generated/server'
import type { RawResult, SourceDocument } from '../shared/types'

export function toSourceDocument(d: Doc<'documents'>): SourceDocument {
  return { id: d._id, name: d.name, text: d.text, segments: d.segments }
}

export async function getSchemaForProject(ctx: QueryCtx, projectId: Id<'projects'>) {
  return await ctx.db
    .query('schemas')
    .withIndex('by_project', (q) => q.eq('projectId', projectId))
    .unique()
}

export async function getDocumentsForProject(ctx: QueryCtx, projectId: Id<'projects'>) {
  return await ctx.db
    .query('documents')
    .withIndex('by_project', (q) => q.eq('projectId', projectId))
    .collect()
}

export async function insertResults(
  ctx: MutationCtx,
  runId: Id<'runs'>,
  projectId: Id<'projects'>,
  results: Record<string, RawResult>,
) {
  for (const [fieldId, raw] of Object.entries(results)) {
    await ctx.db.insert('field_results', {
      runId,
      projectId,
      fieldId,
      raw,
      current: { value: raw.value, state: 'unreviewed', editedAt: null, chosenEvidenceIndex: null },
    })
  }
}

export function utcDay(at: number) {
  return new Date(at).toISOString().slice(0, 10)
}

export async function deleteProjectCascade(ctx: MutationCtx, projectId: Id<'projects'>) {
  const runs = await ctx.db
    .query('runs')
    .withIndex('by_project', (q) => q.eq('projectId', projectId))
    .collect()
  for (const run of runs) {
    const results = await ctx.db
      .query('field_results')
      .withIndex('by_run', (q) => q.eq('runId', run._id))
      .collect()
    for (const r of results) await ctx.db.delete(r._id)
    const logs = await ctx.db
      .query('review_log')
      .withIndex('by_run', (q) => q.eq('runId', run._id))
      .collect()
    for (const l of logs) await ctx.db.delete(l._id)
    await ctx.db.delete(run._id)
  }
  for (const d of await getDocumentsForProject(ctx, projectId)) {
    for (const id of d.pageImageIds ?? []) await ctx.storage.delete(id)
    await ctx.db.delete(d._id)
  }
  const schema = await getSchemaForProject(ctx, projectId)
  if (schema) await ctx.db.delete(schema._id)
  await ctx.db.delete(projectId)
}
