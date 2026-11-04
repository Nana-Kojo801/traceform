import { useMutation } from 'convex/react'
import { toast } from 'sonner'
import { api } from '@convex/_generated/api'
import type { FormField } from '@shared/types'
import { Button, Kbd } from '@/components/ui/button'
import { formatValue } from '@/lib/format'
import { errorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'
import type { ActiveEvidence, FieldResultRow } from './types'

interface Props {
  field: FormField
  result: FieldResultRow
  docName: (id: string) => string
  active: ActiveEvidence | null
  onShowEvidence: (index: number) => void
}

export function useResolve(result: FieldResultRow | undefined, field: FormField) {
  const resolve = useMutation(api.review.resolve)
  return async (i: number) => {
    const e = result?.raw.evidence[i]
    if (!result || !e) return
    try {
      await resolve({ resultId: result._id, evidenceIndex: i })
      toast.success(`Resolved: ${formatValue(e.claimedValue, field.type)}`)
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }
}

/** Both sides of a conflict, side by side, separated by a rule. Nothing is picked for you. */
export function ConflictCompare({ field, result, docName, active, onShowEvidence }: Props) {
  const pick = useResolve(result, field)
  const chosen = result.current.state === 'resolved' ? result.current.chosenEvidenceIndex : null

  return (
    <div className="grid grid-cols-1 border-y border-t-ink sm:grid-cols-2" style={{ borderTopColor: 'var(--ink)' }}>
      {result.raw.evidence.map((e, i) => {
        const isChosen = chosen === i
        const inView = active?.index === i
        return (
          <div
            key={i}
            data-trace-source={inView && e.sourceMatchVerified ? 'true' : undefined}
            className={cn(
              'flex flex-col gap-3 py-[18px]',
              i % 2 === 0 ? 'sm:border-r sm:border-line sm:pr-5' : 'border-t border-line sm:border-t-0 sm:pl-5',
            )}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-mono text-[11px] uppercase text-muted">
                Side {String.fromCharCode(65 + i)}
                <span className="fn text-ink">{i + 1}</span>
                {isChosen ? <span className="text-ink"> · chosen</span> : inView ? ' · in view' : ''}
              </span>
              {i < 2 && <Kbd>{i + 1}</Kbd>}
            </div>
            <span className={cn('text-[34px] font-semibold leading-none tracking-[-0.04em] tabular-nums sm:text-[40px]', isChosen && 'bg-hl self-start px-1')}>
              {formatValue(e.claimedValue, field.type) || '—'}
            </span>
            <button
              onClick={() => onShowEvidence(i)}
              disabled={!e.sourceMatchVerified}
              className="text-left font-serif text-[15px] leading-[1.5] text-ink-2 outline-none hover:text-ink focus-visible:outline-2 focus-visible:outline-ink"
            >
              “{e.quote}”
            </button>
            <span className="font-mono text-[11.5px] text-muted">
              {e.sourceMatchVerified ? '✓' : '!'} {docName(e.documentId)}
              {e.paragraphIndex !== null && ` · ¶${e.paragraphIndex + 1}`}
            </span>
            <Button
              variant={isChosen ? 'ink' : 'outline'}
              className="self-start"
              disabled={!e.sourceMatchVerified || e.claimedValue === null}
              onClick={() => pick(i)}
              aria-pressed={isChosen}
            >
              {isChosen ? '✓ ' : 'Use '}
              {formatValue(e.claimedValue, field.type)}
            </Button>
          </div>
        )
      })}
    </div>
  )
}
