import { ConvexError, v } from 'convex/values'
import { mutation, type MutationCtx } from './_generated/server'
import type { Doc, Id } from './_generated/dataModel'

async function load(ctx: MutationCtx, resultId: Id<'field_results'>) {
  const r = await ctx.db.get(resultId)
  if (!r) throw new ConvexError('Field result not found.')
  return r
}

async function log(ctx: MutationCtx, r: Doc<'field_results'>, action: string, detail?: string) {
  await ctx.db.insert('review_log', {
    projectId: r.projectId,
    runId: r.runId,
    fieldId: r.fieldId,
    action,
    detail: detail?.slice(0, 200),
    at: Date.now(),
  })
}

export const approve = mutation({
  args: { resultId: v.id('field_results') },
  handler: async (ctx, { resultId }) => {
    const r = await load(ctx, resultId)
    if (r.current.value === null) throw new ConvexError('There is no value to approve. Edit or resolve it first.')
    await ctx.db.patch(resultId, { current: { ...r.current, state: 'approved', editedAt: Date.now() } })
    await log(ctx, r, 'approved', r.current.value)
  },
})

export const edit = mutation({
  args: { resultId: v.id('field_results'), value: v.string() },
  handler: async (ctx, { resultId, value }) => {
    const r = await load(ctx, resultId)
    const trimmed = value.slice(0, 5000)
    await ctx.db.patch(resultId, {
      current: { value: trimmed, state: 'edited', editedAt: Date.now(), chosenEvidenceIndex: null },
    })
    // Coalesce autosave keystrokes into one log entry per field burst.
    const last = await ctx.db
      .query('review_log')
      .withIndex('by_run', (q) => q.eq('runId', r.runId))
      .order('desc')
      .first()
    if (last && last.fieldId === r.fieldId && last.action === 'edited' && Date.now() - last.at < 60_000) {
      await ctx.db.patch(last._id, { detail: trimmed.slice(0, 200), at: Date.now() })
    } else {
      await log(ctx, r, 'edited', trimmed)
    }
  },
})

export const clear = mutation({
  args: { resultId: v.id('field_results') },
  handler: async (ctx, { resultId }) => {
    const r = await load(ctx, resultId)
    await ctx.db.patch(resultId, {
      current: { value: null, state: 'cleared', editedAt: Date.now(), chosenEvidenceIndex: null },
    })
    await log(ctx, r, 'cleared')
  },
})

export const restore = mutation({
  args: { resultId: v.id('field_results') },
  handler: async (ctx, { resultId }) => {
    const r = await load(ctx, resultId)
    await ctx.db.patch(resultId, {
      current: { value: r.raw.value, state: 'unreviewed', editedAt: Date.now(), chosenEvidenceIndex: null },
    })
    await log(ctx, r, 'restored to extracted value')
  },
})

/** Pick one side of a conflict. */
export const resolve = mutation({
  args: { resultId: v.id('field_results'), evidenceIndex: v.number() },
  handler: async (ctx, { resultId, evidenceIndex }) => {
    const r = await load(ctx, resultId)
    const e = r.raw.evidence[evidenceIndex]
    if (!e) throw new ConvexError('That citation does not exist.')
    if (!e.sourceMatchVerified) throw new ConvexError('Only verified citations can be chosen.')
    if (e.claimedValue === null) throw new ConvexError('That citation has no value to choose.')
    await ctx.db.patch(resultId, {
      current: { value: e.claimedValue, state: 'resolved', editedAt: Date.now(), chosenEvidenceIndex: evidenceIndex },
    })
    await log(ctx, r, 'resolved conflict', e.claimedValue)
  },
})
