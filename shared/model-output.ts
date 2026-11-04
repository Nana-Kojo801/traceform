import { z } from 'zod'
import type { FormField } from './types'

/**
 * The JSON shape we ask Meta's model to return. Kept deliberately flat so it
 * fits the Model API's strict structured-output subset (every key required,
 * additionalProperties: false, no oneOf/allOf).
 */
export const modelEvidenceSchema = z.object({
  documentId: z.string(),
  quote: z.string(),
  value: z.string().nullable(),
})

export const modelFieldSchema = z.object({
  fieldId: z.string(),
  status: z.enum(['supported', 'missing', 'conflicting']),
  value: z.string().nullable(),
  reason: z.string(),
  evidence: z.array(modelEvidenceSchema),
})

export const modelOutputSchema = z.object({
  fields: z.array(modelFieldSchema),
})

export type ModelEvidence = z.infer<typeof modelEvidenceSchema>
export type ModelField = z.infer<typeof modelFieldSchema>
export type ModelOutput = z.infer<typeof modelOutputSchema>

/** JSON Schema sent as `text.format` to the Responses API. */
export const modelOutputJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['fields'],
  properties: {
    fields: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['fieldId', 'status', 'value', 'reason', 'evidence'],
        properties: {
          fieldId: { type: 'string' },
          status: { type: 'string', enum: ['supported', 'missing', 'conflicting'] },
          value: { type: ['string', 'null'] },
          reason: { type: 'string' },
          evidence: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['documentId', 'quote', 'value'],
              properties: {
                documentId: { type: 'string' },
                quote: { type: 'string' },
                value: { type: ['string', 'null'] },
              },
            },
          },
        },
      },
    },
  },
} as const

export type ParseResult =
  | { ok: true; output: ModelOutput }
  | { ok: false; error: string }

/**
 * Parse and validate raw model text. Tolerates a ```json fence, since some
 * responses wrap JSON even when asked not to.
 */
export function parseModelOutput(text: string, expectedFields: FormField[]): ParseResult {
  let body = text.trim()
  const fence = body.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/)
  if (fence) body = fence[1]
  let json: unknown
  try {
    json = JSON.parse(body)
  } catch {
    return { ok: false, error: 'Model output was not valid JSON.' }
  }
  const parsed = modelOutputSchema.safeParse(json)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return {
      ok: false,
      error: `Model output did not match the expected shape (${issue?.path.join('.') || 'root'}: ${issue?.message ?? 'invalid'}).`,
    }
  }
  const expected = new Set(expectedFields.map((f) => f.id))
  // Drop answers for fields we did not ask about; keep the first answer per field.
  const seen = new Set<string>()
  const fields = parsed.data.fields.filter((f) => {
    if (!expected.has(f.fieldId) || seen.has(f.fieldId)) return false
    seen.add(f.fieldId)
    return true
  })
  return { ok: true, output: { fields } }
}

// ---------- auditor pass ("model second opinion", advisory only) ----------

export const auditOutputSchema = z.object({
  audits: z.array(
    z.object({
      fieldId: z.string(),
      verdict: z.enum(['agrees', 'disagrees', 'unsure']),
      note: z.string(),
    }),
  ),
})

export type AuditOutput = z.infer<typeof auditOutputSchema>

export const auditOutputJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['audits'],
  properties: {
    audits: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['fieldId', 'verdict', 'note'],
        properties: {
          fieldId: { type: 'string' },
          verdict: { type: 'string', enum: ['agrees', 'disagrees', 'unsure'] },
          note: { type: 'string' },
        },
      },
    },
  },
} as const

export function parseAuditOutput(text: string): AuditOutput | null {
  try {
    const parsed = auditOutputSchema.safeParse(JSON.parse(text.trim().replace(/^```(?:json)?\s*|\s*```$/g, '')))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}
