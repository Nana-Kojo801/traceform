// Stretch: scanned PDFs and photos as sources via Muse Spark vision.
// The browser renders pages to JPEG and uploads them to Convex storage; this
// action sends them to Meta's model for a verbatim transcription. The
// transcription becomes the document text, clearly labeled "model
// transcription", and citations are verified against it like any other text.

import { ConvexError, v } from 'convex/values'
import { action, internalMutation, mutation } from './_generated/server'
import { internal } from './_generated/api'
import type { Id } from './_generated/dataModel'
import { getDocumentsForProject, utcDay } from './helpers'
import { dailyCap } from './runs'
import { callStructured, type ResponsesInputItem } from '../shared/model-provider'
import { parseTranscription, transcriptionJsonSchema } from '../shared/model-output'
import { TRANSCRIBE_INSTRUCTIONS } from '../shared/prompt'
import { joinPages } from '../shared/segments'
import { MAX_DOCUMENTS_PER_PROJECT, MAX_TOTAL_CHARS, MAX_TRANSCRIBE_PAGES } from '../shared/limits'

const MAX_PAGE_IMAGE_BYTES = 3 * 1024 * 1024
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => await ctx.storage.generateUploadUrl(),
})

/** Check caps and count this transcription against the daily live-call cap. */
export const reserve = internalMutation({
  args: { projectId: v.id('projects') },
  handler: async (ctx, { projectId }) => {
    const project = await ctx.db.get(projectId)
    if (!project) throw new ConvexError('Project not found.')
    const docs = await getDocumentsForProject(ctx, projectId)
    if (docs.length >= MAX_DOCUMENTS_PER_PROJECT) {
      throw new ConvexError(`Limit reached: at most ${MAX_DOCUMENTS_PER_PROJECT} documents per project.`)
    }
    const day = utcDay(Date.now())
    const usage = await ctx.db
      .query('usage_days')
      .withIndex('by_day', (q) => q.eq('day', day))
      .unique()
    const cap = dailyCap()
    if ((usage?.liveRuns ?? 0) >= cap) {
      throw new ConvexError(`Daily cap reached: ${cap} live Meta calls per day for this demo.`)
    }
    if (usage) await ctx.db.patch(usage._id, { liveRuns: usage.liveRuns + 1 })
    else await ctx.db.insert('usage_days', { day, liveRuns: 1 })
  },
})

export const insertTranscribed = internalMutation({
  args: {
    projectId: v.id('projects'),
    name: v.string(),
    kind: v.union(v.literal('pdf'), v.literal('image')),
    text: v.string(),
    segments: v.array(v.object({ index: v.number(), start: v.number(), end: v.number(), pageNumber: v.optional(v.number()) })),
    sizeBytes: v.number(),
    note: v.string(),
    pageImageIds: v.array(v.id('_storage')),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('documents', {
      projectId: args.projectId,
      name: args.name.slice(0, 200),
      kind: args.kind,
      text: args.text,
      segments: args.segments,
      parseStatus: 'parsed',
      sizeBytes: args.sizeBytes,
      createdAt: Date.now(),
      transcribed: true,
      transcriptionNote: args.note.slice(0, 300),
      pageImageIds: args.pageImageIds,
    })
  },
})

function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

export const transcribe = action({
  args: {
    projectId: v.id('projects'),
    name: v.string(),
    kind: v.union(v.literal('pdf'), v.literal('image')),
    sizeBytes: v.number(),
    storageIds: v.array(v.id('_storage')),
  },
  handler: async (ctx, args): Promise<Id<'documents'>> => {
    const cleanup = async () => {
      for (const id of args.storageIds) await ctx.storage.delete(id).catch(() => {})
    }
    const apiKey = process.env.MODEL_API_KEY
    if (!apiKey) {
      await cleanup()
      throw new ConvexError('The Meta API key is not configured, so scanned pages cannot be transcribed.')
    }
    if (args.storageIds.length === 0 || args.storageIds.length > MAX_TRANSCRIBE_PAGES) {
      await cleanup()
      throw new ConvexError(`Send between 1 and ${MAX_TRANSCRIBE_PAGES} page images.`)
    }
    try {
      await ctx.runMutation(internal.transcribe.reserve, { projectId: args.projectId })
    } catch (err) {
      await cleanup()
      throw err
    }

    const content: ResponsesInputItem['content'] = [
      { type: 'input_text', text: `Transcribe these ${args.storageIds.length} page image(s) from "${args.name}".` },
    ]
    for (const id of args.storageIds) {
      const blob = await ctx.storage.get(id)
      if (!blob || blob.size > MAX_PAGE_IMAGE_BYTES || !IMAGE_TYPES.includes(blob.type)) {
        await cleanup()
        throw new ConvexError('Each page image must be a JPEG, PNG, or WebP under 3 MB.')
      }
      content.push({ type: 'input_image', image_url: `data:${blob.type};base64,${toBase64(await blob.arrayBuffer())}` })
    }

    let parsed
    try {
      const res = await callStructured(
        {
          apiKey,
          model: process.env.META_MODEL || 'muse-spark-1.3',
          baseUrl: process.env.META_API_BASE || 'https://api.meta.ai/v1',
          reasoningEffort: 'low',
        },
        TRANSCRIBE_INSTRUCTIONS,
        [{ role: 'user', content }],
        { name: 'traceform_transcription', schema: transcriptionJsonSchema },
      )
      parsed = parseTranscription(res.text)
    } catch (err) {
      await cleanup()
      throw new ConvexError(`Transcription failed: ${err instanceof Error ? err.message : 'unknown error'}`)
    }
    if (!parsed) {
      await cleanup()
      throw new ConvexError('Transcription output was not valid.')
    }
    const pages = [...parsed.pages].sort((a, b) => a.pageNumber - b.pageNumber).map((p) => p.text.replace(/\r\n?/g, '\n'))
    const { text, segments } = joinPages(pages)
    if (text.replace(/\[illegible\]|\s/g, '').length < 10) {
      await cleanup()
      throw new ConvexError('No legible text was found in the image.')
    }
    if (text.length > MAX_TOTAL_CHARS) {
      await cleanup()
      throw new ConvexError('The transcription is longer than the per-extraction character limit.')
    }
    return await ctx.runMutation(internal.transcribe.insertTranscribed, {
      projectId: args.projectId,
      name: args.name,
      kind: args.kind,
      text,
      segments,
      sizeBytes: args.sizeBytes,
      note: parsed.note,
      pageImageIds: args.storageIds,
    })
  },
})
