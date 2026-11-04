import type { FieldStatus, ReviewState } from '@shared/types'
import { cn } from '@/lib/utils'

export const STATUS_META: Record<FieldStatus, { glyph: string; label: string; short: string; color: string; description: string }> = {
  supported: { glyph: '✓', label: 'Supported', short: 'OK', color: 'text-ok', description: 'Backed by a quote that code found in the source.' },
  conflicting: { glyph: '≠', label: 'Conflict', short: 'CONFLICT', color: 'text-conflict', description: 'Sources give different values. Both are shown; nothing was picked for you.' },
  missing: { glyph: '—', label: 'Blank', short: 'BLANK', color: 'text-muted', description: 'Not stated in any source. Left blank on purpose.' },
  needs_review: { glyph: '!', label: 'Needs review', short: 'REVIEW', color: 'text-review', description: 'Failed a deterministic check: citation, type, or evidence.' },
}

/** Status as a mono glyph and word, never colour alone. */
export function StatusMark({ status, long, className }: { status: FieldStatus; long?: boolean; className?: string }) {
  const m = STATUS_META[status]
  return (
    <span className={cn('font-mono text-[11px] font-medium uppercase tracking-[0.03em] whitespace-nowrap', m.color, className)} title={m.description}>
      {m.glyph} {long ? m.label : m.short}
    </span>
  )
}

export const REVIEW_META: Record<ReviewState, { label: string }> = {
  unreviewed: { label: 'Open' },
  approved: { label: 'Approved' },
  edited: { label: 'Edited' },
  cleared: { label: 'Cleared' },
  resolved: { label: 'Resolved' },
}

export function ReviewMark({ state, className }: { state: ReviewState; className?: string }) {
  if (state === 'unreviewed') return null
  return (
    <span className={cn('font-mono text-[10.5px] font-medium uppercase tracking-[0.04em] text-ink', className)}>
      ■ {REVIEW_META[state].label}
    </span>
  )
}
