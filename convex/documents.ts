import { ConvexError, v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { segmentV } from './schema'
import { getDocumentsForProject } from './helpers'
import { MAX_DOCUMENTS_PER_PROJECT, MAX_FILE_BYTES, MAX_TOTAL_CHARS } from '../shared/limits'

export const list = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, { projectId }) => {
    const docs = await getDocumentsForProject(ctx, projectId)
    return docs.sort((a, b) => a.createdAt - b.createdAt)
  },
})

export const add = mutation({
  args: {
    projectId: v.id('projects'),
    name: v.string(),
    kind: v.union(v.literal('txt'), v.literal('docx'), v.literal('pdf')),
    text: v.string(),
    segments: v.array(segmentV),
    parseStatus: v.union(v.literal('parsed'), v.literal('failed'), v.literal('needs_ocr')),
    parseError: v.optional(v.string()),
    sizeBytes: v.number(),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId)
    if (!project) throw new ConvexError('Project not found.')
    const existing = await getDocumentsForProject(ctx, args.projectId)
    if (existing.length >= MAX_DOCUMENTS_PER_PROJECT) {
      throw new ConvexError(`Limit reached: at most ${MAX_DOCUMENTS_PER_PROJECT} documents per project.`)
    }
    if (args.sizeBytes > MAX_FILE_BYTES) {
      throw new ConvexError(`File is larger than ${Math.round(MAX_FILE_BYTES / 1024)} KB.`)
    }
    // Per-document text cap: a single document can never exceed the per-run budget.
    if (args.text.length > MAX_TOTAL_CHARS) {
      throw new ConvexError(
        `Extracted text is ${args.text.length.toLocaleString()} characters; the limit is ${MAX_TOTAL_CHARS.toLocaleString()} per extraction.`,
      )
    }
    for (const s of args.segments) {
      if (s.start < 0 || s.end > args.text.length || s.start > s.end) {
        throw new ConvexError('Invalid segment boundaries.')
      }
    }
    return await ctx.db.insert('documents', {
      projectId: args.projectId,
      name: args.name.slice(0, 200),
      kind: args.kind,
      text: args.text,
      segments: args.segments,
      parseStatus: args.parseStatus,
      parseError: args.parseError?.slice(0, 500),
      sizeBytes: args.sizeBytes,
      createdAt: Date.now(),
    })
  },
})

export const remove = mutation({
  args: { documentId: v.id('documents') },
  handler: async (ctx, { documentId }) => {
    const doc = await ctx.db.get(documentId)
    if (!doc) return
    await ctx.db.delete(documentId)
  },
})
