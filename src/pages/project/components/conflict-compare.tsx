import { useMutation } from 'convex/react'
import { Check, CircleCheck, CircleX, GitCompareArrows, Quote } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@convex/_generated/api'
import type { FormField } from '@shared/types'
import { Button } from '@/components/ui/button'
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

export function ConflictCompare({ field, result, docName, active, onShowEvidence }: Props) {
  const resolve = useMutation(api.review.resolve)
  const chosen = result.current.state === 'resolved' ? result.current.chosenEvidenceIndex : null

  return (
    <div className="rounded-xl border border-conflicting/30 bg-conflicting-soft/40 p-3">
      <p className="flex items-center gap-1.5 text-[13px] font-medium">
        <GitCompareArrows className="size-4 text-conflicting" aria-hidden />
        The sources disagree. TraceForm does not pick a side for you.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {result.raw.evidence.map((e, i) => {
          const isChosen = chosen === i
          const isActive = active?.index === i
          return (
            <div
              key={i}
              data-trace-source={isActive && e.sourceMatchVerified ? 'true' : undefined}
              className={cn(
                'flex flex-col rounded-xl border bg-surface p-3 transition-colors',
                isChosen ? 'border-accent/70' : isActive ? 'border-conflicting/60' : 'border-border',
              )}
            >
              <p className="text-[11px] uppercase tracking-wide text-subtle-foreground">Side {String.fromCharCode(65 + i)}</p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums">{formatValue(e.claimedValue, field.type) || '—'}</p>
              <p className="mt-1 flex items-center gap-1 truncate text-[11.5px] text-subtle-foreground">
                {e.sourceMatchVerified ? (
                  <CircleCheck className="size-3.5 shrink-0 text-supported" aria-label="Quote verified" />
                ) : (
                  <CircleX className="size-3.5 shrink-0 text-review" aria-label="Quote not verified" />
                )}
                <span className="truncate">{docName(e.documentId)}</span>
                {e.paragraphIndex !== null && <span>· ¶{e.paragraphIndex + 1}</span>}
              </p>
              <p className="mt-2 flex flex-1 gap-1.5 text-[13px] leading-relaxed text-muted-foreground">
                <Quote className="mt-1 size-3 shrink-0" aria-hidden />
                <span>{e.quote}</span>
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Button size="xs" variant="ghost" onClick={() => onShowEvidence(i)} disabled={!e.sourceMatchVerified}>
                  Show in source
                </Button>
                <Button
                  size="xs"
                  variant={isChosen ? 'default' : 'secondary'}
                  disabled={!e.sourceMatchVerified || e.claimedValue === null}
                  onClick={async () => {
                    try {
                      await resolve({ resultId: result._id, evidenceIndex: i })
                      toast.success(`Resolved: ${formatValue(e.claimedValue, field.type)}`)
                    } catch (err) {
                      toast.error(errorMessage(err))
                    }
                  }}
                  aria-pressed={isChosen}
                >
                  {isChosen && <Check />}
                  {isChosen ? 'Chosen' : 'Use this value'}
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
