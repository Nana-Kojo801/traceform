import { v } from 'convex/values'
import { action, internalAction } from './_generated/server'
import { internal } from './_generated/api'
import { toSourceDocument } from './helpers'
import { callStructured, listModels, ModelApiError, type ModelConfig } from '../shared/model-provider'
import { auditOutputJsonSchema, parseAuditOutput, parseModelOutput, type ModelOutput } from '../shared/model-output'
import {
  AUDIT_INSTRUCTIONS,
  buildAuditInput,
  buildExtractionInput,
  buildRepairInput,
  EXTRACTION_INSTRUCTIONS,
  REPAIR_INSTRUCTIONS,
} from '../shared/prompt'
import { runPipeline } from '../shared/pipeline'
import { MAX_PARSE_RETRIES } from '../shared/limits'
import type { FormField } from '../shared/types'
import { applyRepair, verifyField } from '../shared/verify'

function config(): ModelConfig | null {
  const apiKey = process.env.MODEL_API_KEY
  if (!apiKey) return null
  return {
    apiKey,
    model: process.env.META_MODEL || 'muse-spark-1.3',
    baseUrl: process.env.META_API_BASE || 'https://api.meta.ai/v1',
    reasoningEffort: process.env.META_REASONING_EFFORT || 'medium',
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export const execute = internalAction({
  args: { runId: v.id('runs') },
  handler: async (ctx, { runId }) => {
    const started = Date.now()
    const context = await ctx.runQuery(internal.runs.getRunContext, { runId })
    if (!context || !context.schema) {
      await ctx.runMutation(internal.runs.fail, { runId, error: 'Run context not found.' })
      return
    }
    const cfg = config()
    if (!cfg) {
      await ctx.runMutation(internal.runs.fail, { runId, error: 'The Meta API key is not configured.' })
      return
    }
    const docs = context.docs.map(toSourceDocument)
    const fields = context.schema.fields as FormField[]
    const counters = { modelCalls: 0, parseRetries: 0, inputTokens: 0, outputTokens: 0 }

    /** One structured call with bounded retries for malformed output and transient errors. */
    async function callValidated(instructions: string, input: string, expected: FormField[]): Promise<ModelOutput> {
      let lastError = 'unknown error'
      let transientRetries = 0
      for (let attempt = 0; attempt <= MAX_PARSE_RETRIES; ) {
        try {
          counters.modelCalls++
          const res = await callStructured(cfg!, instructions, input)
          counters.inputTokens += res.inputTokens
          counters.outputTokens += res.outputTokens
          const parsed = parseModelOutput(res.text, expected)
          if (parsed.ok) return parsed.output
          lastError = parsed.error
          counters.parseRetries++
          attempt++
        } catch (err) {
          if (err instanceof ModelApiError && err.retryable && transientRetries < 2) {
            transientRetries++
            await sleep(1000 * 2 ** transientRetries + Math.random() * 500)
            continue
          }
          throw err
        }
      }
      throw new Error(`${lastError} (after ${MAX_PARSE_RETRIES} retries)`)
    }

    try {
      const { results, stats } = await runPipeline(fields, docs, {
        extract: (batch, d) => callValidated(EXTRACTION_INSTRUCTIONS, buildExtractionInput(batch, d), batch),
        repair: async (field, d, failed) => {
          const out = await callValidated(REPAIR_INSTRUCTIONS, buildRepairInput(field, d, failed), [field])
          return out.fields.find((f) => f.fieldId === field.id)
        },
        audit:
          process.env.META_AUDITOR === 'off'
            ? undefined
            : async (items) => {
                counters.modelCalls++
                const res = await callStructured({ ...cfg, reasoningEffort: 'low' }, AUDIT_INSTRUCTIONS, buildAuditInput(items), {
                  name: 'traceform_audit',
                  schema: auditOutputJsonSchema,
                })
                counters.inputTokens += res.inputTokens
                counters.outputTokens += res.outputTokens
                return parseAuditOutput(res.text)
              },
        onProgress: (progress) => ctx.runMutation(internal.runs.setProgress, { runId, progress }),
      })
      await ctx.runMutation(internal.runs.complete, {
        runId,
        results,
        stats: { ...stats, ...counters, durationMs: Date.now() - started },
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      await ctx.runMutation(internal.runs.fail, { runId, error: message })
    }
  },
})

/**
 * Evaluation probe (internal, CLI only: `npx convex run extraction:probeRepair`).
 * Injects a deliberately fabricated quote for one field, confirms the verifier
 * rejects it, then sends the real repair call to Meta and re-verifies.
 */
export const probeRepair = internalAction({
  args: { projectId: v.id('projects'), fieldId: v.string(), fabricatedQuote: v.string(), value: v.string() },
  handler: async (ctx, { projectId, fieldId, fabricatedQuote, value }) => {
    const cfg = config()
    if (!cfg) throw new Error('MODEL_API_KEY is not set.')
    const data = await ctx.runQuery(internal.runs.getProjectContext, { projectId })
    const field = data.fields.find((f) => f.id === fieldId) as FormField | undefined
    if (!field || data.docs.length === 0) throw new Error('Field or documents not found.')
    const docs = data.docs.map(toSourceDocument)
    const first = verifyField(
      field,
      { fieldId, status: 'supported', value, reason: 'probe', evidence: [{ documentId: docs[0].id, quote: fabricatedQuote, value }] },
      docs,
    )
    const failed = first.evidence.filter((e) => !e.sourceMatchVerified).map((e) => ({ documentId: e.documentId, quote: e.quote }))
    const res = await callStructured(cfg, REPAIR_INSTRUCTIONS, buildRepairInput(field, docs, failed))
    const parsed = parseModelOutput(res.text, [field])
    if (!parsed.ok) return { firstPassStatus: first.status, repairError: parsed.error }
    const repaired = applyRepair(first, verifyField(field, parsed.output.fields[0], docs))
    return {
      firstPassStatus: first.status,
      firstPassIssues: first.issues,
      repairOutcome: repaired.repair?.outcome,
      repairedStatus: repaired.status,
      repairedValue: repaired.value,
      repairedQuotes: repaired.evidence.map((e) => ({ quote: e.quote, verified: e.sourceMatchVerified })),
      tokens: { input: res.inputTokens, output: res.outputTokens },
    }
  },
})

/** Free connectivity check (GET /models): no tokens consumed. */
export const testConnection = action({
  args: {},
  handler: async () => {
    const cfg = config()
    if (!cfg) return { ok: false, message: 'MODEL_API_KEY is not set on the server.' }
    try {
      const models = await listModels(cfg)
      const available = models.includes(cfg.model)
      return {
        ok: available,
        message: available
          ? `Connected. ${cfg.model} is available.`
          : `Connected, but ${cfg.model} was not in the model list.`,
      }
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : 'Connection failed.' }
    }
  },
})
