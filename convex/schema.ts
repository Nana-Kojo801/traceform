import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export const segmentV = v.object({
  index: v.number(),
  start: v.number(),
  end: v.number(),
  pageNumber: v.optional(v.number()),
})

export const sectionV = v.object({ id: v.string(), title: v.string() })

export const fieldV = v.object({
  id: v.string(),
  sectionId: v.string(),
  label: v.string(),
  type: v.union(
    v.literal('short_text'),
    v.literal('long_text'),
    v.literal('number'),
    v.literal('date'),
    v.literal('single_select'),
  ),
  required: v.boolean(),
  description: v.string(),
  choices: v.array(v.string()),
  extractionHint: v.string(),
})

export const evidenceV = v.object({
  documentId: v.string(),
  quote: v.string(),
  claimedValue: v.union(v.string(), v.null()),
  startOffset: v.union(v.number(), v.null()),
  endOffset: v.union(v.number(), v.null()),
  paragraphIndex: v.union(v.number(), v.null()),
  pageNumber: v.union(v.number(), v.null()),
  sourceMatchVerified: v.boolean(),
  verifyNote: v.union(v.string(), v.null()),
})

export const statusV = v.union(
  v.literal('supported'),
  v.literal('missing'),
  v.literal('conflicting'),
  v.literal('needs_review'),
)

export const reviewStateV = v.union(
  v.literal('unreviewed'),
  v.literal('approved'),
  v.literal('edited'),
  v.literal('cleared'),
  v.literal('resolved'),
)

export const rawResultV = v.object({
  value: v.union(v.string(), v.null()),
  status: statusV,
  reason: v.string(),
  issues: v.array(v.string()),
  evidence: v.array(evidenceV),
  modelStatus: v.union(v.literal('supported'), v.literal('missing'), v.literal('conflicting')),
  repair: v.union(
    v.null(),
    v.object({
      attempted: v.boolean(),
      outcome: v.union(v.literal('fixed'), v.literal('still_unverified'), v.literal('now_missing')),
      failedQuotes: v.array(v.string()),
      note: v.string(),
    }),
  ),
})

export const currentResultV = v.object({
  value: v.union(v.string(), v.null()),
  state: reviewStateV,
  editedAt: v.union(v.number(), v.null()),
  chosenEvidenceIndex: v.union(v.number(), v.null()),
})

export const runStatsV = v.object({
  fieldCount: v.number(),
  firstPassUnverifiedFields: v.number(),
  firstPassUnverifiedQuotes: v.number(),
  repairsAttempted: v.number(),
  repairsFixed: v.number(),
  repairsNowMissing: v.number(),
  repairsStillUnverified: v.number(),
  statusCounts: v.record(v.string(), v.number()),
  modelCalls: v.number(),
  parseRetries: v.number(),
  inputTokens: v.number(),
  outputTokens: v.number(),
  durationMs: v.number(),
})

export default defineSchema({
  projects: defineTable({
    name: v.string(),
    description: v.string(),
    createdAt: v.number(),
    isDemo: v.boolean(),
    lastRunStartedAt: v.optional(v.number()),
  }).index('by_createdAt', ['createdAt']),

  documents: defineTable({
    projectId: v.id('projects'),
    name: v.string(),
    kind: v.union(v.literal('txt'), v.literal('docx'), v.literal('pdf')),
    text: v.string(),
    segments: v.array(segmentV),
    parseStatus: v.union(v.literal('parsed'), v.literal('failed'), v.literal('needs_ocr')),
    parseError: v.optional(v.string()),
    sizeBytes: v.number(),
    createdAt: v.number(),
  }).index('by_project', ['projectId']),

  schemas: defineTable({
    projectId: v.id('projects'),
    sections: v.array(sectionV),
    fields: v.array(fieldV),
    updatedAt: v.number(),
  }).index('by_project', ['projectId']),

  runs: defineTable({
    projectId: v.id('projects'),
    schemaId: v.id('schemas'),
    model: v.string(),
    startedAt: v.number(),
    finishedAt: v.optional(v.number()),
    status: v.union(v.literal('running'), v.literal('completed'), v.literal('failed')),
    progress: v.optional(v.string()),
    error: v.optional(v.string()),
    isPrecomputed: v.boolean(),
    stats: v.optional(runStatsV),
  }).index('by_project', ['projectId']),

  field_results: defineTable({
    runId: v.id('runs'),
    projectId: v.id('projects'),
    fieldId: v.string(),
    raw: rawResultV,
    current: currentResultV,
  })
    .index('by_run', ['runId'])
    .index('by_run_field', ['runId', 'fieldId']),

  review_log: defineTable({
    projectId: v.id('projects'),
    runId: v.id('runs'),
    fieldId: v.string(),
    action: v.string(),
    detail: v.optional(v.string()),
    at: v.number(),
  }).index('by_run', ['runId']),

  usage_days: defineTable({
    day: v.string(),
    liveRuns: v.number(),
  }).index('by_day', ['day']),
})
