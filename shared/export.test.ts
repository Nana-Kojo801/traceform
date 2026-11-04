import { describe, expect, it } from 'vitest'
import { exportFileName, toCsv, toJson, type ExportInput } from './export'
import type { RawResult } from './types'

const raw = (value: string | null, status: RawResult['status']): RawResult => ({
  value,
  status,
  reason: 'r',
  issues: [],
  evidence: [],
  modelStatus: 'supported',
  repair: null,
})

const input: ExportInput = {
  project: { name: 'Harbor Light', isDemo: true },
  schema: {
    sections: [{ id: 's', title: 'S' }],
    fields: [
      { id: 'a', sectionId: 's', label: 'A', type: 'short_text', required: true, description: '', choices: [], extractionHint: '' },
      { id: 'b', sectionId: 's', label: 'B', type: 'number', required: true, description: '', choices: [], extractionHint: '' },
      { id: 'c', sectionId: 's', label: 'C', type: 'short_text', required: false, description: '', choices: [], extractionHint: '' },
    ],
  },
  documents: [],
  run: { model: 'muse-spark-1.3', startedAt: 0, isPrecomputed: false },
  results: [
    { fieldId: 'a', raw: raw('Raw A', 'supported'), current: { value: 'Edited "A"', state: 'edited', editedAt: 1, chosenEvidenceIndex: null } },
    { fieldId: 'b', raw: raw(null, 'conflicting'), current: { value: '54000', state: 'resolved', editedAt: 1, chosenEvidenceIndex: 1 } },
    { fieldId: 'c', raw: raw('=HYPERLINK()', 'supported'), current: { value: '=HYPERLINK()', state: 'cleared', editedAt: 1, chosenEvidenceIndex: null } },
  ],
  exportedAt: Date.UTC(2026, 10, 4),
}

describe('CSV export', () => {
  it('has stable headers and the reviewed values', () => {
    const [header, row] = toCsv(input).trim().split('\r\n')
    expect(header).toBe('"project_name","a","a__status","a__review","b","b__status","b__review","c","c__status","c__review"')
    expect(row).toBe('"Harbor Light","Edited ""A""","supported","edited","54000","conflicting","resolved","","supported","cleared"')
  })
  it('neutralizes formula injection', () => {
    const csv = toCsv({ ...input, results: [{ ...input.results[2], current: { ...input.results[2].current, state: 'approved' } }] })
    expect(csv).toContain(`"'=HYPERLINK()"`)
  })
})

describe('JSON export', () => {
  it('contains reviewed values alongside the raw extraction', () => {
    const data = JSON.parse(toJson(input))
    expect(data.fields[0]).toMatchObject({ fieldId: 'a', value: 'Edited "A"', extractedValue: 'Raw A', reviewState: 'edited' })
    expect(data.fields[1]).toMatchObject({ value: '54000', status: 'conflicting', reviewState: 'resolved' })
    expect(data.fields[2].value).toBeNull()
  })
  it('builds a safe filename', () => {
    expect(exportFileName('Harbor Light / Demo', 'csv', input.exportedAt)).toBe('traceform-harbor-light-demo-2026-11-04.csv')
  })
})
