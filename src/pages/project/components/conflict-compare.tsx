import { useMutation } from 'convex/react'
import { Check } from 'lucide-react'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import { api } from '@convex/_generated/api'
import type { FormField } from '@shared/types'
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
      toast.success(`Chose ${formatValue(e.claimedValue, field.type)}`)
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }
}

/** Sources disagree: an iOS-style single choice list. Nothing is picked for you. */
export function ConflictCompare({ field, result, docName, active, onShowEvidence }: Props) {
  const pick = useResolve(result, field)
  const chosen = result.current.state === 'resolved' ? result.current.chosenEvidenceIndex : null

  return (
    <section aria-label="Choose a value">
      <p className="px-4 pb-1.5 text-[13px] text-muted">Choose a value</p>
      <div className="card overflow-hidden" role="radiogroup" aria-label={field.label}>
        {result.raw.evidence.map((e, i) => {
          const isChosen = chosen === i
          const inView = active?.index === i
          return (
            <div
              key={i}
              data-trace-source={inView && e.sourceMatchVerified ? 'true' : undefined}
              className={cn('relative flex items-start gap-3.5 px-4 py-3.5', i > 0 && 'before:absolute before:left-[52px] before:right-0 before:top-0 before:h-px before:bg-line-soft')}
            >
              <button
                role="radio"
                aria-checked={isChosen}
                disabled={!e.sourceMatchVerified || e.claimedValue === null}
                onClick={() => pick(i)}
                className={cn(
                  'mt-1.5 grid size-[22px] shrink-0 place-items-center rounded-full outline-none transition-[background-color,box-shadow] duration-200 active:scale-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
                  isChosen ? 'bg-ink text-white' : 'shadow-[inset_0_0_0_2px_#c7c7cc] hover:shadow-[inset_0_0_0_2px_var(--ink)]',
                )}
                aria-label={`Choose ${formatValue(e.claimedValue, field.type)}`}
              >
                {isChosen && (
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 600, damping: 22 }} className="grid place-items-center">
                    <Check className="size-3" strokeWidth={3.5} />
                  </motion.span>
                )}
              </button>
              <div className="min-w-0 flex-1">
                <button onClick={() => pick(i)} disabled={!e.sourceMatchVerified || e.claimedValue === null} className="flex items-center gap-2 text-left outline-none">
                  <span className="text-[24px] font-bold tracking-[-0.02em] tabular-nums">{formatValue(e.claimedValue, field.type) || '—'}</span>
                  <span className="cite">{i + 1}</span>
                </button>
                <button onClick={() => onShowEvidence(i)} className={cn('mt-0.5 block text-left text-[13.5px] outline-none hover:text-ink', inView ? 'text-ink' : 'text-muted')}>
                  {docName(e.documentId)}
                  {inView ? ' · in view' : ' · show'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
