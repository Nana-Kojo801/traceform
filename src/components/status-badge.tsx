import { ArrowLeftRight, Check, Minus, RotateCw } from 'lucide-react'
import type { FieldStatus } from '@shared/types'
import { cn } from '@/lib/utils'

export const STATUS_META: Record<FieldStatus, { label: string; pill: string; icon: string; description: string }> = {
  supported: { label: 'Verified', pill: 'bg-ok-soft text-ok-text', icon: 'bg-ok text-white', description: 'The quote was found in the source.' },
  conflicting: { label: 'Sources disagree', pill: 'bg-warn-soft text-warn-text', icon: 'bg-warn text-white', description: 'Sources give different values. You choose.' },
  missing: { label: 'Not in any source', pill: 'bg-fill text-ink-2', icon: 'bg-line text-muted', description: 'No document states this. It stays blank.' },
  needs_review: { label: 'Needs a look', pill: 'bg-bad-soft text-bad-text', icon: 'bg-bad text-white', description: 'A check failed. Look at the source before approving.' },
}

/** Filled circle with a glyph: never colour alone. */
export function StatusIcon({ status, size = 20, className, inverted }: { status: FieldStatus; size?: number; className?: string; inverted?: boolean }) {
  const m = STATUS_META[status]
  const glyph = Math.round(size * 0.55)
  const stroke = 3.2
  return (
    <span
      className={cn('grid shrink-0 place-items-center rounded-full', inverted ? 'bg-white' : m.icon, className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={m.label}
      title={m.description}
    >
      {status === 'supported' && <Check size={glyph} strokeWidth={stroke} className={inverted ? 'text-ok-text' : undefined} />}
      {status === 'conflicting' && <ArrowLeftRight size={glyph} strokeWidth={2.8} className={inverted ? 'text-warn-text' : undefined} />}
      {status === 'missing' && <Minus size={glyph} strokeWidth={stroke} className={inverted ? 'text-muted' : undefined} />}
      {status === 'needs_review' && <span className={cn('text-[11px] font-bold leading-none', inverted && 'text-bad-text')} style={{ fontSize: glyph + 2 }}>!</span>}
    </span>
  )
}

export function StatusPill({ status, label, className }: { status: FieldStatus; label?: string; className?: string }) {
  const m = STATUS_META[status]
  return (
    <span className={cn('inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold', m.pill, className)}>
      {status === 'conflicting' ? <ArrowLeftRight className="size-3.5" strokeWidth={2.6} /> : status === 'supported' ? <Check className="size-3.5" strokeWidth={3} /> : status === 'missing' ? <Minus className="size-3.5" strokeWidth={3} /> : <span className="font-bold">!</span>}
      {label ?? m.label}
    </span>
  )
}

export function RepairIcon({ size = 20 }: { size?: number }) {
  return (
    <span className="grid shrink-0 place-items-center rounded-full bg-ink text-hl" style={{ width: size, height: size }} aria-hidden>
      <RotateCw size={Math.round(size * 0.55)} strokeWidth={2.8} />
    </span>
  )
}
