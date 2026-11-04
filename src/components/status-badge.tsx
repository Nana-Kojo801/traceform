import { AlertTriangle, CircleCheck, CircleDashed, GitCompareArrows, PencilLine, RotateCcw, ShieldCheck, Eraser, Scale } from 'lucide-react'
import type { FieldStatus, ReviewState } from '@shared/types'
import { Badge } from '@/components/ui/badge'

export const STATUS_META: Record<FieldStatus, { label: string; tone: 'supported' | 'conflicting' | 'missing' | 'review'; description: string }> = {
  supported: { label: 'Supported', tone: 'supported', description: 'Answer backed by a quote that was found in the source.' },
  conflicting: { label: 'Conflict', tone: 'conflicting', description: 'Sources disagree. Both sides are shown; nothing was picked for you.' },
  missing: { label: 'Missing', tone: 'missing', description: 'Not documented in any source. Left blank on purpose.' },
  needs_review: { label: 'Needs review', tone: 'review', description: 'Failed a deterministic check (citation, type, or evidence).' },
}

export function StatusBadge({ status }: { status: FieldStatus }) {
  const meta = STATUS_META[status]
  const Icon =
    status === 'supported' ? CircleCheck : status === 'conflicting' ? GitCompareArrows : status === 'missing' ? CircleDashed : AlertTriangle
  return (
    <Badge tone={meta.tone} title={meta.description}>
      <Icon aria-hidden />
      {meta.label}
    </Badge>
  )
}

export const REVIEW_META: Record<ReviewState, { label: string }> = {
  unreviewed: { label: 'Unreviewed' },
  approved: { label: 'Approved' },
  edited: { label: 'Edited' },
  cleared: { label: 'Cleared' },
  resolved: { label: 'Resolved' },
}

export function ReviewBadge({ state }: { state: ReviewState }) {
  if (state === 'unreviewed') return null
  const Icon = state === 'approved' ? ShieldCheck : state === 'edited' ? PencilLine : state === 'cleared' ? Eraser : state === 'resolved' ? Scale : RotateCcw
  return (
    <Badge tone="accent" title="Human review state">
      <Icon aria-hidden />
      {REVIEW_META[state].label}
    </Badge>
  )
}
