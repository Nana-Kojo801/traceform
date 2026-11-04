import type { CurrentResult, FormSchema, RawResult } from './types'

export interface ExportFieldResult {
  fieldId: string
  raw: RawResult
  current: CurrentResult
}

export interface ExportInput {
  project: { name: string; isDemo: boolean }
  schema: FormSchema
  documents: { id: string; name: string }[]
  run: { model: string; startedAt: number; isPrecomputed: boolean } | null
  results: ExportFieldResult[]
  exportedAt: number
}

function csvCell(value: string): string {
  // Guard against spreadsheet formula injection, then quote.
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  return `"${safe.replace(/"/g, '""')}"`
}

/** The reviewer's value takes precedence over the raw extraction. */
export function finalValue(r: ExportFieldResult | undefined): string {
  if (!r) return ''
  if (r.current.state === 'cleared') return ''
  return r.current.value ?? ''
}

/**
 * One row per project. Headers are stable for a schema: for every field,
 * `<fieldId>`, `<fieldId>__status`, `<fieldId>__review`, in schema order.
 */
export function toCsv(input: ExportInput): string {
  const headers = ['project_name']
  const row = [input.project.name]
  for (const field of input.schema.fields) {
    const r = input.results.find((x) => x.fieldId === field.id)
    headers.push(field.id, `${field.id}__status`, `${field.id}__review`)
    row.push(finalValue(r), r?.raw.status ?? '', r?.current.state ?? '')
  }
  return `${headers.map(csvCell).join(',')}\r\n${row.map(csvCell).join(',')}\r\n`
}

export function toJson(input: ExportInput): string {
  const docName = (id: string) => input.documents.find((d) => d.id === id)?.name ?? null
  return JSON.stringify(
    {
      project: input.project.name,
      sampleData: input.project.isDemo,
      exportedAt: new Date(input.exportedAt).toISOString(),
      run: input.run
        ? {
            model: input.run.model,
            startedAt: new Date(input.run.startedAt).toISOString(),
            precomputed: input.run.isPrecomputed,
          }
        : null,
      note: 'sourceMatchVerified means the quote exists in the cited document. reviewState shows whether a human validated the answer.',
      fields: input.schema.fields.map((field) => {
        const r = input.results.find((x) => x.fieldId === field.id)
        return {
          fieldId: field.id,
          label: field.label,
          type: field.type,
          value: r ? finalValue(r) || null : null,
          reviewState: r?.current.state ?? null,
          extractedValue: r?.raw.value ?? null,
          status: r?.raw.status ?? null,
          reason: r?.raw.reason ?? null,
          issues: r?.raw.issues ?? [],
          repair: r?.raw.repair ?? null,
          evidence: (r?.raw.evidence ?? []).map((e) => ({
            document: docName(e.documentId),
            documentId: e.documentId,
            quote: e.quote,
            claimedValue: e.claimedValue,
            sourceMatchVerified: e.sourceMatchVerified,
            startOffset: e.startOffset,
            endOffset: e.endOffset,
            paragraphIndex: e.paragraphIndex,
            pageNumber: e.pageNumber,
            verifyNote: e.verifyNote,
          })),
        }
      }),
    },
    null,
    2,
  )
}

export function exportFileName(projectName: string, ext: 'csv' | 'json', at: number): string {
  const slug = projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'project'
  const d = new Date(at).toISOString().slice(0, 10)
  return `traceform-${slug}-${d}.${ext}`
}
