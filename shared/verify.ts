// Deterministic, model-free verification of extracted answers.
// Every live and precomputed result passes through `verifyField`.

import type { ModelField } from './model-output'
import type { Evidence, FormField, RawResult, SourceDocument } from './types'

interface NormalizedText {
  text: string
  /** map[i] = index in the original string of normalized character i */
  map: number[]
}

const QUOTE_CHARS: Record<string, string> = {
  '‘': "'",
  '’': "'",
  '‚': "'",
  '‛': "'",
  '′': "'",
  '“': '"',
  '”': '"',
  '„': '"',
  '‟': '"',
  '″': '"',
  '–': '-',
  '—': '-',
  '‒': '-',
  '−': '-',
  ' ': ' ',
  '…': '...',
}

/**
 * Normalize for matching: unify curly quotes and dashes, collapse whitespace,
 * lowercase. Keeps a map back to original offsets so a match can be highlighted.
 */
export function normalizeWithMap(input: string): NormalizedText {
  let text = ''
  const map: number[] = []
  let lastWasSpace = true // also trims leading whitespace
  for (let i = 0; i < input.length; i++) {
    const ch = input[i]
    const replaced = QUOTE_CHARS[ch] ?? ch
    if (/\s/.test(replaced)) {
      if (!lastWasSpace) {
        text += ' '
        map.push(i)
        lastWasSpace = true
      }
      continue
    }
    for (const c of replaced.toLowerCase()) {
      text += c
      map.push(i)
    }
    lastWasSpace = false
  }
  if (text.endsWith(' ')) {
    text = text.slice(0, -1)
    map.pop()
  }
  return { text, map }
}

export function normalizeText(input: string): string {
  return normalizeWithMap(input).text
}

/** Strip wrapping quotation marks a model sometimes adds around a citation. */
function cleanQuote(quote: string): string {
  let q = quote.trim()
  for (;;) {
    const m = q.match(/^["'“”‘’](.*)["'“”‘’]$/s)
    if (!m) break
    q = m[1].trim()
  }
  return q
}

export interface QuoteMatch {
  start: number
  end: number
}

/** Find a quote in a document. Returns original-text offsets or null. */
export function findQuote(docText: string, quote: string): QuoteMatch | null {
  const needle = normalizeText(cleanQuote(quote))
  if (needle.length < 3) return null
  const hay = normalizeWithMap(docText)
  const idx = hay.text.indexOf(needle)
  if (idx === -1) return null
  const start = hay.map[idx]
  const end = hay.map[idx + needle.length - 1] + 1
  return { start, end }
}

function locateSegment(doc: SourceDocument, offset: number) {
  const seg = doc.segments.find((s) => offset >= s.start && offset < s.end)
  return {
    paragraphIndex: seg ? seg.index : null,
    pageNumber: seg?.pageNumber ?? null,
  }
}

export function verifyEvidence(
  docs: SourceDocument[],
  item: { documentId: string; quote: string; value: string | null },
): Evidence {
  const base: Evidence = {
    documentId: item.documentId,
    quote: item.quote,
    claimedValue: item.value,
    startOffset: null,
    endOffset: null,
    paragraphIndex: null,
    pageNumber: null,
    sourceMatchVerified: false,
    verifyNote: null,
  }
  const doc = docs.find((d) => d.id === item.documentId)
  if (!doc) return { ...base, verifyNote: 'unknown source' }
  const match = findQuote(doc.text, item.quote)
  if (!match) return { ...base, verifyNote: 'quote not found in source' }
  return {
    ...base,
    startOffset: match.start,
    endOffset: match.end,
    ...locateSegment(doc, match.start),
    sourceMatchVerified: true,
  }
}

// ---------- type checks ----------

export type TypeCheck = { ok: true; value: string } | { ok: false; note: string }

export function normalizeNumber(value: string): string | null {
  const cleaned = value.replace(/[$€£,\s]/g, '').replace(/usd$/i, '')
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null
  const n = Number(cleaned)
  return Number.isFinite(n) ? String(n) : null
}

const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
]

/** Parse a date into YYYY-MM-DD without timezone drift. */
export function normalizeDate(value: string): string | null {
  const v = value.trim()
  let y: number, m: number, d: number
  let iso = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (iso) {
    y = +iso[1]; m = +iso[2]; d = +iso[3]
  } else if ((iso = v.match(/^([A-Za-z]+)\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})$/))) {
    const mi = MONTHS.findIndex((name) => name.startsWith(iso![1].toLowerCase().slice(0, 3)))
    if (mi === -1) return null
    y = +iso[3]; m = mi + 1; d = +iso[2]
  } else if ((iso = v.match(/^(\d{1,2})\s+([A-Za-z]+)\.?,?\s+(\d{4})$/))) {
    const mi = MONTHS.findIndex((name) => name.startsWith(iso![2].toLowerCase().slice(0, 3)))
    if (mi === -1) return null
    y = +iso[3]; m = mi + 1; d = +iso[1]
  } else {
    return null
  }
  const dt = new Date(Date.UTC(y, m - 1, d))
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export function checkType(field: FormField, value: string): TypeCheck {
  const v = value.trim()
  if (!v) return { ok: false, note: 'empty value' }
  switch (field.type) {
    case 'number': {
      const n = normalizeNumber(v)
      return n === null ? { ok: false, note: `"${v}" is not a number` } : { ok: true, value: n }
    }
    case 'date': {
      const d = normalizeDate(v)
      return d === null ? { ok: false, note: `"${v}" is not a valid date` } : { ok: true, value: d }
    }
    case 'single_select': {
      const choice = field.choices.find((c) => c.toLowerCase() === v.toLowerCase())
      return choice
        ? { ok: true, value: choice }
        : { ok: false, note: `"${v}" is not one of the allowed choices` }
    }
    default:
      return { ok: true, value: v }
  }
}

function canonical(field: FormField, value: string | null): string | null {
  if (value === null) return null
  const t = checkType(field, value)
  return t.ok ? t.value : value.trim()
}

// ---------- field verification ----------

/**
 * Turn one model answer into a verified RawResult. Rules (spec section 4):
 * 1. unknown documentId -> needs_review
 * 2. quote must exist in that document (normalized) -> otherwise needs_review
 * 3. type checks -> failures become needs_review
 * 4. supported with zero verified evidence -> needs_review
 * 5. conflicting needs verified evidence for 2+ distinct values -> otherwise needs_review
 * 6. missing stays blank
 */
export function verifyField(
  field: FormField,
  answer: ModelField | undefined,
  docs: SourceDocument[],
): RawResult {
  if (!answer) {
    return {
      value: null,
      status: 'needs_review',
      reason: 'The model returned no answer for this field.',
      issues: ['no answer returned'],
      evidence: [],
      modelStatus: 'missing',
      repair: null,
    }
  }

  const issues: string[] = []

  if (answer.status === 'missing') {
    return {
      value: null,
      status: 'missing',
      reason: answer.reason,
      issues,
      evidence: [],
      modelStatus: 'missing',
      repair: null,
    }
  }

  const evidence = answer.evidence.map((e) => {
    const verified = verifyEvidence(docs, e)
    return { ...verified, claimedValue: canonical(field, e.value ?? answer.value) }
  })
  for (const e of evidence) {
    if (!e.sourceMatchVerified && e.verifyNote) {
      const note = `${e.verifyNote}: "${truncate(e.quote, 80)}"`
      if (!issues.includes(note)) issues.push(note)
    }
  }
  const verified = evidence.filter((e) => e.sourceMatchVerified)

  if (answer.status === 'conflicting') {
    const typeIssues = verified
      .map((e) => (e.claimedValue === null ? null : checkType(field, e.claimedValue)))
      .filter((t): t is { ok: false; note: string } => t !== null && !t.ok)
    typeIssues.forEach((t) => issues.push(t.note))
    const distinct = new Set(
      verified.map((e) => e.claimedValue).filter((v): v is string => v !== null).map((v) => v.toLowerCase()),
    )
    const ok = distinct.size >= 2 && typeIssues.length === 0 && verified.length === evidence.length
    if (distinct.size < 2) issues.push('conflict needs verified evidence for 2+ distinct values')
    return {
      value: null,
      status: ok ? 'conflicting' : 'needs_review',
      reason: answer.reason,
      issues,
      evidence,
      modelStatus: 'conflicting',
      repair: null,
    }
  }

  // supported
  let value = answer.value
  let typeOk = true
  if (value === null || !value.trim()) {
    issues.push('supported answer has no value')
    typeOk = false
    value = null
  } else {
    const t = checkType(field, value)
    if (t.ok) value = t.value
    else {
      issues.push(t.note)
      typeOk = false
    }
  }
  if (verified.length === 0) issues.push('no verified evidence')
  const allVerified = verified.length === evidence.length
  const status = typeOk && verified.length > 0 && allVerified ? 'supported' : 'needs_review'
  return {
    value,
    status,
    reason: answer.reason,
    issues,
    evidence,
    modelStatus: 'supported',
    repair: null,
  }
}

/** Fields whose citations failed source matching get one repair pass. */
export function needsRepair(result: RawResult): boolean {
  return result.evidence.some((e) => !e.sourceMatchVerified)
}

/** Merge a repair-pass result into the record for the original field. */
export function applyRepair(original: RawResult, repaired: RawResult): RawResult {
  const failedQuotes = original.evidence.filter((e) => !e.sourceMatchVerified).map((e) => e.quote)
  let outcome: 'fixed' | 'still_unverified' | 'now_missing'
  if (repaired.status === 'missing') outcome = 'now_missing'
  else if (!needsRepair(repaired) && repaired.status !== 'needs_review') outcome = 'fixed'
  else outcome = 'still_unverified'
  const note =
    outcome === 'fixed'
      ? 'Fixed on second pass: the model re-cited a verbatim quote that was found in the source.'
      : outcome === 'now_missing'
        ? 'On the second pass the model could not cite a verbatim quote and marked the field missing.'
        : 'Still unverified after the second pass.'
  return { ...repaired, repair: { attempted: true, outcome, failedQuotes, note } }
}

/** Record that a repair was needed but could not be completed (e.g. API error). */
export function markRepairFailed(original: RawResult, error: string): RawResult {
  return {
    ...original,
    repair: {
      attempted: true,
      outcome: 'still_unverified',
      failedQuotes: original.evidence.filter((e) => !e.sourceMatchVerified).map((e) => e.quote),
      note: `Repair pass failed: ${error}`,
    },
  }
}

function truncate(s: string, n: number) {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s
}
