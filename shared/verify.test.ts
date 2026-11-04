import { describe, expect, it } from 'vitest'
import { checkType, findQuote, normalizeDate, normalizeText, verifyField } from './verify'
import { parseModelOutput } from './model-output'
import { runPipeline } from './pipeline'
import { segmentParagraphs } from './segments'
import { SAMPLE_DOCUMENTS } from './sample/sample-documents'
import { SAMPLE_SCHEMA } from './sample/sample-schema'
import { PRECOMPUTED_FIRST_PASS, PRECOMPUTED_REPAIRS } from './sample/sample-precomputed'
import type { FormField, SourceDocument } from './types'

const docs: SourceDocument[] = SAMPLE_DOCUMENTS.map((d) => ({
  id: d.key,
  name: d.name,
  text: d.text,
  segments: segmentParagraphs(d.text),
}))
const field = (id: string) => SAMPLE_SCHEMA.fields.find((f) => f.id === id) as FormField

describe('quote normalization and matching', () => {
  it('normalizes whitespace, curly quotes, dashes and case', () => {
    expect(normalizeText('  Hello\n\n  “World” — OK ')).toBe('hello "world" - ok')
  })

  it('finds a quote despite whitespace, case and quote-style differences', () => {
    const text = 'Our office said: "We request  $48,000\nto cover costs."'
    const m = findQuote(text, '“we REQUEST $48,000 to cover costs.”')
    expect(m).not.toBeNull()
    expect(text.slice(m!.start, m!.end)).toBe('We request  $48,000\nto cover costs.')
  })

  it('returns offsets that map back to the original document text', () => {
    const doc = docs[0]
    const m = findQuote(doc.text, 'project title: neighborhood meal delivery expansion')!
    expect(doc.text.slice(m.start, m.end)).toBe('Project title: Neighborhood Meal Delivery Expansion')
  })

  it('does not match paraphrases', () => {
    expect(findQuote(docs[0].text, 'We are asking for $48,000')).toBeNull()
  })

  it('rejects trivially short quotes', () => {
    expect(findQuote(docs[0].text, 'a')).toBeNull()
  })
})

describe('fabricated citation rejection', () => {
  it('marks a supported answer with a non-verbatim quote as needs_review', () => {
    const r = verifyField(
      field('households_served'),
      {
        fieldId: 'households_served',
        status: 'supported',
        value: '320',
        reason: 'x',
        evidence: [{ documentId: 'application', quote: 'We will feed 320 families weekly.', value: '320' }],
      },
      docs,
    )
    expect(r.status).toBe('needs_review')
    expect(r.evidence[0].sourceMatchVerified).toBe(false)
    expect(r.evidence[0].verifyNote).toBe('quote not found in source')
  })

  it('flags an unknown documentId', () => {
    const r = verifyField(
      field('project_title'),
      {
        fieldId: 'project_title',
        status: 'supported',
        value: 'Neighborhood Meal Delivery Expansion',
        reason: 'x',
        evidence: [{ documentId: 'nope', quote: 'Project title: Neighborhood Meal Delivery Expansion', value: null }],
      },
      docs,
    )
    expect(r.status).toBe('needs_review')
    expect(r.evidence[0].verifyNote).toBe('unknown source')
  })

  it('supported with zero evidence becomes needs_review', () => {
    const r = verifyField(
      field('project_title'),
      { fieldId: 'project_title', status: 'supported', value: 'X', reason: 'x', evidence: [] },
      docs,
    )
    expect(r.status).toBe('needs_review')
    expect(r.issues).toContain('no verified evidence')
  })

  it('verified quote records offsets and paragraph index', () => {
    const r = verifyField(
      field('project_title'),
      {
        fieldId: 'project_title',
        status: 'supported',
        value: 'Neighborhood Meal Delivery Expansion',
        reason: 'x',
        evidence: [{ documentId: 'application', quote: 'Project title: Neighborhood Meal Delivery Expansion', value: null }],
      },
      docs,
    )
    expect(r.status).toBe('supported')
    expect(r.evidence[0].sourceMatchVerified).toBe(true)
    expect(r.evidence[0].paragraphIndex).toBe(1)
  })
})

describe('type and enum validation', () => {
  it('parses numbers with currency and separators', () => {
    expect(checkType(field('requested_amount'), '$48,000')).toEqual({ ok: true, value: '48000' })
    expect(checkType(field('requested_amount'), 'forty').ok).toBe(false)
  })
  it('parses dates into ISO form', () => {
    expect(normalizeDate('March 3, 2027')).toBe('2027-03-03')
    expect(normalizeDate('2027-03-03')).toBe('2027-03-03')
    expect(normalizeDate('3 March 2027')).toBe('2027-03-03')
    expect(normalizeDate('2027-02-30')).toBeNull()
    expect(normalizeDate('soon')).toBeNull()
  })
  it('enforces single-select choices and canonicalizes case', () => {
    expect(checkType(field('application_type'), 'new')).toEqual({ ok: true, value: 'New' })
    expect(checkType(field('application_type'), 'Continuation').ok).toBe(false)
  })
  it('a type failure on a supported answer becomes needs_review', () => {
    const r = verifyField(
      field('application_type'),
      {
        fieldId: 'application_type',
        status: 'supported',
        value: 'First-time',
        reason: 'x',
        evidence: [{ documentId: 'application', quote: 'Application type: New.', value: null }],
      },
      docs,
    )
    expect(r.status).toBe('needs_review')
  })
})

describe('conflict handling', () => {
  const amount = field('requested_amount')
  it('keeps conflicting when 2+ distinct verified values exist', () => {
    const r = verifyField(amount, PRECOMPUTED_FIRST_PASS.fields.find((f) => f.fieldId === 'requested_amount'), docs)
    expect(r.status).toBe('conflicting')
    expect(r.value).toBeNull()
    expect(r.evidence.map((e) => e.claimedValue)).toEqual(['48000', '54000'])
  })
  it('downgrades a conflict with only one distinct value', () => {
    const r = verifyField(
      amount,
      {
        fieldId: 'requested_amount',
        status: 'conflicting',
        value: null,
        reason: 'x',
        evidence: [
          { documentId: 'application', quote: 'We request $48,000 to cover a part-time delivery coordinator', value: '48000' },
          { documentId: 'application', quote: 'We request $48,000', value: '$48,000' },
        ],
      },
      docs,
    )
    expect(r.status).toBe('needs_review')
  })
  it('missing stays blank even if evidence was sent', () => {
    const r = verifyField(
      field('fiscal_sponsor'),
      { fieldId: 'fiscal_sponsor', status: 'missing', value: 'Guess Inc', reason: 'x', evidence: [] },
      docs,
    )
    expect(r.status).toBe('missing')
    expect(r.value).toBeNull()
  })
})

describe('model output validation (Zod)', () => {
  it('accepts valid JSON, including a fenced block', () => {
    const json = JSON.stringify(PRECOMPUTED_FIRST_PASS)
    expect(parseModelOutput(json, SAMPLE_SCHEMA.fields).ok).toBe(true)
    expect(parseModelOutput('```json\n' + json + '\n```', SAMPLE_SCHEMA.fields).ok).toBe(true)
  })
  it('rejects non-JSON and wrong shapes', () => {
    expect(parseModelOutput('not json', SAMPLE_SCHEMA.fields).ok).toBe(false)
    expect(parseModelOutput('{"fields":[{"fieldId":"x"}]}', SAMPLE_SCHEMA.fields).ok).toBe(false)
    expect(parseModelOutput('{"fields":[{"fieldId":"project_title","status":"guess","value":null,"reason":"","evidence":[]}]}', SAMPLE_SCHEMA.fields).ok).toBe(false)
  })
  it('drops unknown and duplicate field ids', () => {
    const out = parseModelOutput(
      JSON.stringify({
        fields: [
          { fieldId: 'evil', status: 'missing', value: null, reason: '', evidence: [] },
          { fieldId: 'project_title', status: 'missing', value: null, reason: 'a', evidence: [] },
          { fieldId: 'project_title', status: 'missing', value: null, reason: 'b', evidence: [] },
        ],
      }),
      SAMPLE_SCHEMA.fields,
    )
    expect(out.ok && out.output.fields.map((f) => f.reason)).toEqual(['a'])
  })
})

describe('pipeline with repair pass (precomputed fixture)', () => {
  it('catches the planted fabricated citation and repairs it', async () => {
    const { results, stats } = await runPipeline(SAMPLE_SCHEMA.fields, docs, {
      extract: async () => PRECOMPUTED_FIRST_PASS,
      repair: async (f) => PRECOMPUTED_REPAIRS[f.id],
    })
    expect(stats.firstPassUnverifiedFields).toBe(1)
    expect(stats.repairsFixed).toBe(1)
    expect(results.households_served.repair?.outcome).toBe('fixed')
    expect(results.households_served.repair?.failedQuotes[0]).toMatch(/every week/)
    expect(results.households_served.status).toBe('supported')
    expect(results.requested_amount.status).toBe('conflicting')
    expect(results.fiscal_sponsor.status).toBe('missing')
    for (const id of ['organization_name', 'primary_contact_email', 'project_title', 'project_location', 'start_date', 'application_type']) {
      expect(results[id].status, id).toBe('supported')
    }
  })

  it('records a still-unverified outcome when repair fails', async () => {
    const { results, stats } = await runPipeline(SAMPLE_SCHEMA.fields, docs, {
      extract: async () => PRECOMPUTED_FIRST_PASS,
      repair: async () => {
        throw new Error('boom')
      },
    })
    expect(stats.repairsStillUnverified).toBe(1)
    expect(results.households_served.status).toBe('needs_review')
    expect(results.households_served.repair?.outcome).toBe('still_unverified')
  })
})

describe('auditor pass (advisory)', () => {
  it('attaches verdicts without changing status', async () => {
    const { results, stats } = await runPipeline(SAMPLE_SCHEMA.fields, docs, {
      extract: async () => PRECOMPUTED_FIRST_PASS,
      repair: async (f) => PRECOMPUTED_REPAIRS[f.id],
      audit: async (items) => ({
        audits: items.map((it) => ({
          fieldId: it.field.id,
          verdict: it.field.id === 'project_location' ? ('disagrees' as const) : ('agrees' as const),
          note: 'n',
        })),
      }),
    })
    expect(results.project_location.audit?.verdict).toBe('disagrees')
    expect(results.project_location.status).toBe('supported')
    expect(results.fiscal_sponsor.audit).toBeUndefined()
    expect(stats.audit).toMatchObject({ ran: true, agrees: 7, disagrees: 1 })
  })

  it('an auditor failure does not fail the run', async () => {
    const { results, stats } = await runPipeline(SAMPLE_SCHEMA.fields, docs, {
      extract: async () => PRECOMPUTED_FIRST_PASS,
      repair: async (f) => PRECOMPUTED_REPAIRS[f.id],
      audit: async () => null,
    })
    expect(stats.audit.ran).toBe(false)
    expect(stats.audit.error).toMatch(/not valid/)
    expect(results.project_title.status).toBe('supported')
  })
})
