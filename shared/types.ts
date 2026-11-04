// Shared domain types used by the Convex backend and the React client.

export const FIELD_TYPES = ['short_text', 'long_text', 'number', 'date', 'single_select'] as const
export type FieldType = (typeof FIELD_TYPES)[number]

export const FIELD_STATUSES = ['supported', 'missing', 'conflicting', 'needs_review'] as const
export type FieldStatus = (typeof FIELD_STATUSES)[number]

export const REVIEW_STATES = ['unreviewed', 'approved', 'edited', 'cleared', 'resolved'] as const
export type ReviewState = (typeof REVIEW_STATES)[number]

export type DocumentKind = 'txt' | 'docx' | 'pdf' | 'image'

export interface FormSection {
  id: string
  title: string
}

export interface FormField {
  id: string
  sectionId: string
  label: string
  type: FieldType
  required: boolean
  description: string
  choices: string[]
  extractionHint: string
}

export interface FormSchema {
  sections: FormSection[]
  fields: FormField[]
}

/** A paragraph (txt/docx) or page (pdf) boundary inside a document's extracted text. */
export interface Segment {
  index: number
  start: number
  end: number
  pageNumber?: number
}

/** The minimum a verifier needs to know about a source document. */
export interface SourceDocument {
  id: string
  name: string
  text: string
  segments: Segment[]
}

/** One citation, after deterministic verification. */
export interface Evidence {
  documentId: string
  quote: string
  /** The value this quote supports (used to show both sides of a conflict). */
  claimedValue: string | null
  startOffset: number | null
  endOffset: number | null
  paragraphIndex: number | null
  pageNumber: number | null
  /** True only if the quote was found in the cited document's text. */
  sourceMatchVerified: boolean
  /** Why verification failed, when it did. */
  verifyNote: string | null
}

export type RepairOutcome = 'fixed' | 'still_unverified' | 'now_missing'

export interface RepairRecord {
  attempted: boolean
  outcome: RepairOutcome
  failedQuotes: string[]
  note: string
}

/** The immutable, verified extraction for one field. */
export interface RawResult {
  value: string | null
  status: FieldStatus
  /** The model's one-sentence reason. */
  reason: string
  /** Deterministic verifier notes, e.g. "quote not found in source". */
  issues: string[]
  evidence: Evidence[]
  /** The status the model itself claimed, before verification. */
  modelStatus: 'supported' | 'missing' | 'conflicting'
  repair: RepairRecord | null
  /** Advisory second opinion from a separate auditor call. Never changes status. */
  audit?: AuditRecord | null
}

export interface AuditRecord {
  verdict: 'agrees' | 'disagrees' | 'unsure'
  note: string
}

/** The reviewer's working copy for one field. */
export interface CurrentResult {
  value: string | null
  state: ReviewState
  editedAt: number | null
  /** For resolved conflicts: which evidence item was chosen. */
  chosenEvidenceIndex: number | null
}
