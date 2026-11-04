// Extraction pipeline: first pass -> deterministic verification -> one repair
// pass per field with unverified citations -> deterministic re-verification.
// The model calls are injected so the precomputed demo and live runs share code.

import type { ModelField, ModelOutput } from './model-output'
import type { FormField, RawResult, SourceDocument } from './types'
import { applyRepair, markRepairFailed, needsRepair, verifyField } from './verify'
import { FIELDS_PER_CALL } from './limits'

export interface PipelineHooks {
  /** Extract a batch of fields. Must return validated output or throw. */
  extract: (fields: FormField[], docs: SourceDocument[]) => Promise<ModelOutput>
  /** Repair one field whose citations failed. Must return validated output or throw. */
  repair: (
    field: FormField,
    docs: SourceDocument[],
    failed: { documentId: string; quote: string }[],
  ) => Promise<ModelField | undefined>
  onProgress?: (message: string) => unknown
}

export interface PipelineStats {
  fieldCount: number
  firstPassUnverifiedFields: number
  firstPassUnverifiedQuotes: number
  repairsAttempted: number
  repairsFixed: number
  repairsNowMissing: number
  repairsStillUnverified: number
  statusCounts: Record<string, number>
}

export interface PipelineResult {
  results: Record<string, RawResult>
  stats: PipelineStats
}

/** Batch fields by section, keeping each call to at most FIELDS_PER_CALL fields. */
export function batchFields(fields: FormField[]): FormField[][] {
  if (fields.length <= FIELDS_PER_CALL) return [fields]
  const batches: FormField[][] = []
  let current: FormField[] = []
  let currentSection: string | null = null
  for (const f of fields) {
    const sectionChanged = currentSection !== null && f.sectionId !== currentSection
    if (current.length >= FIELDS_PER_CALL || (sectionChanged && current.length >= FIELDS_PER_CALL / 2)) {
      batches.push(current)
      current = []
    }
    current.push(f)
    currentSection = f.sectionId
  }
  if (current.length) batches.push(current)
  return batches
}

export async function runPipeline(
  fields: FormField[],
  docs: SourceDocument[],
  hooks: PipelineHooks,
): Promise<PipelineResult> {
  const results: Record<string, RawResult> = {}
  const batches = batchFields(fields)

  for (let i = 0; i < batches.length; i++) {
    await hooks.onProgress?.(
      batches.length > 1
        ? `Extracting fields with Meta AI (batch ${i + 1} of ${batches.length})`
        : 'Extracting fields with Meta AI',
    )
    const output = await hooks.extract(batches[i], docs)
    for (const field of batches[i]) {
      const answer = output.fields.find((f) => f.fieldId === field.id)
      results[field.id] = verifyField(field, answer, docs)
    }
  }

  await hooks.onProgress?.('Verifying citations against source text')
  const toRepair = fields.filter((f) => needsRepair(results[f.id]))
  const firstPassUnverifiedQuotes = toRepair.reduce(
    (n, f) => n + results[f.id].evidence.filter((e) => !e.sourceMatchVerified).length,
    0,
  )

  let fixed = 0
  let nowMissing = 0
  let still = 0
  for (let i = 0; i < toRepair.length; i++) {
    const field = toRepair[i]
    await hooks.onProgress?.(`Repair pass ${i + 1} of ${toRepair.length}: re-citing "${field.label}"`)
    const original = results[field.id]
    const failed = original.evidence
      .filter((e) => !e.sourceMatchVerified)
      .map((e) => ({ documentId: e.documentId, quote: e.quote }))
    try {
      const answer = await hooks.repair(field, docs, failed)
      const repaired = applyRepair(original, verifyField(field, answer, docs))
      results[field.id] = repaired
      if (repaired.repair?.outcome === 'fixed') fixed++
      else if (repaired.repair?.outcome === 'now_missing') nowMissing++
      else still++
    } catch (err) {
      results[field.id] = markRepairFailed(original, err instanceof Error ? err.message : String(err))
      still++
    }
  }

  const statusCounts: Record<string, number> = {}
  for (const r of Object.values(results)) statusCounts[r.status] = (statusCounts[r.status] ?? 0) + 1

  return {
    results,
    stats: {
      fieldCount: fields.length,
      firstPassUnverifiedFields: toRepair.length,
      firstPassUnverifiedQuotes,
      repairsAttempted: toRepair.length,
      repairsFixed: fixed,
      repairsNowMissing: nowMissing,
      repairsStillUnverified: still,
      statusCounts,
    },
  }
}
