import { useEffect, useRef, useState } from 'react'
import { useMutation } from 'convex/react'
import { Check, CircleCheck, CircleDashed, CircleX, Eraser, Loader2, Quote, RotateCcw, ShieldCheck, Wrench } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@convex/_generated/api'
import type { FormField } from '@shared/types'
import { checkType } from '@shared/verify'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input, NativeSelect, Textarea } from '@/components/ui/input'
import { ReviewBadge, STATUS_META, StatusBadge } from '@/components/status-badge'
import { formatValue, relativeTime } from '@/lib/format'
import { errorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'
import { ConflictCompare } from './conflict-compare'
import type { ActiveEvidence, DocumentRow, FieldResultRow } from './types'

const TYPE_LABEL: Record<FormField['type'], string> = {
  short_text: 'Short text',
  long_text: 'Long text',
  number: 'Number',
  date: 'Date (YYYY-MM-DD)',
  single_select: 'Single select',
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

interface Props {
  field: FormField
  result: FieldResultRow | undefined
  documents: DocumentRow[]
  active: ActiveEvidence | null
  onShowEvidence: (index: number) => void
  isPrecomputed: boolean
  sectionTitle: string
}

export function FieldDetail({ field, result, documents, active, onShowEvidence, sectionTitle }: Props) {
  const edit = useMutation(api.review.edit)
  const approve = useMutation(api.review.approve)
  const clear = useMutation(api.review.clear)
  const restore = useMutation(api.review.restore)

  const serverValue = result?.current.value ?? ''
  const [draft, setDraft] = useState(serverValue)
  const [save, setSave] = useState<SaveState>('idle')
  const dirty = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync from server when not actively typing.
  useEffect(() => {
    if (!dirty.current) setDraft(serverValue)
  }, [serverValue])

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])

  if (!result) {
    return (
      <div className="h-full rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-base font-semibold">{field.label}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This field was added after the selected run. Run the extraction again to fill it.
        </p>
      </div>
    )
  }

  const r = result
  const docName = (id: string) => documents.find((d) => d._id === id)?.name ?? 'Removed document'

  async function persist(value: string) {
    setSave('saving')
    try {
      await edit({ resultId: r._id, value })
      setSave('saved')
    } catch (err) {
      setSave('error')
      toast.error(errorMessage(err))
    } finally {
      dirty.current = false
    }
  }

  function onChange(value: string) {
    setDraft(value)
    dirty.current = true
    setSave('saving')
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => persist(value), 600)
  }

  async function act(fn: () => Promise<unknown>, done: string) {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
      if (dirty.current) await persist(draft)
    }
    try {
      await fn()
      dirty.current = false
      toast.success(done)
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  const typeCheck = draft.trim() ? checkType(field, draft) : null
  const verifiedCount = r.raw.evidence.filter((e) => e.sourceMatchVerified).length
  const changed = r.current.state !== 'unreviewed' || (r.current.value ?? '') !== (r.raw.value ?? '')

  const inputProps = {
    id: `value-${field.id}`,
    value: draft,
    'aria-describedby': `value-help-${field.id}`,
  }

  return (
    <article className="scrollbar-thin flex h-full min-h-0 flex-col overflow-y-auto rounded-2xl border border-border bg-surface animate-fade-in">
      <header className="border-b border-border p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground">{sectionTitle}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h2 className="text-base font-semibold">{field.label}</h2>
          <StatusBadge status={r.raw.status} />
          <ReviewBadge state={r.current.state} />
          {r.raw.repair?.outcome === 'fixed' && (
            <Badge tone="accent">
              <Wrench aria-hidden /> Fixed on second pass
            </Badge>
          )}
          {r.raw.repair && r.raw.repair.outcome !== 'fixed' && (
            <Badge tone="review">
              <Wrench aria-hidden /> {r.raw.repair.outcome === 'now_missing' ? 'Repair: now missing' : 'Still unverified'}
            </Badge>
          )}
        </div>
        <p className="mt-1 text-xs text-subtle-foreground">
          {TYPE_LABEL[field.type]}
          {field.required ? ' · required' : ''}
          {field.description ? ` · ${field.description}` : ''}
        </p>
      </header>

      <div className="space-y-4 p-4">
        {/* Reviewer value */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor={`value-${field.id}`} className="text-xs font-medium text-muted-foreground">
              Reviewed value
            </label>
            <span className="text-[11px] text-subtle-foreground" aria-live="polite">
              {save === 'saving' && (
                <span className="inline-flex items-center gap-1">
                  <Loader2 className="size-3 animate-spin" aria-hidden /> Saving…
                </span>
              )}
              {save === 'saved' && (
                <span className="inline-flex items-center gap-1 text-supported">
                  <Check className="size-3" aria-hidden /> Saved
                </span>
              )}
              {save === 'error' && <span className="text-review">Not saved</span>}
              {save === 'idle' && r.current.editedAt && `Updated ${relativeTime(r.current.editedAt)}`}
            </span>
          </div>
          {field.type === 'single_select' ? (
            <NativeSelect {...inputProps} onChange={(e) => onChange(e.target.value)}>
              <option value="">(blank)</option>
              {field.choices.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              {draft && !field.choices.includes(draft) && <option value={draft}>{draft}</option>}
            </NativeSelect>
          ) : field.type === 'long_text' ? (
            <Textarea {...inputProps} onChange={(e) => onChange(e.target.value)} placeholder="Blank" />
          ) : (
            <Input
              {...inputProps}
              onChange={(e) => onChange(e.target.value)}
              inputMode={field.type === 'number' ? 'decimal' : undefined}
              placeholder={r.raw.status === 'missing' ? 'Blank: not documented in any source' : r.raw.status === 'conflicting' ? 'Choose a side below, or type a value' : 'Blank'}
            />
          )}
          <p id={`value-help-${field.id}`} className="mt-1.5 min-h-4 text-xs text-subtle-foreground">
            {typeCheck && !typeCheck.ok ? (
              <span className="text-review">{typeCheck.note}</span>
            ) : draft && (field.type === 'number' || field.type === 'date') ? (
              `Reads as ${formatValue(typeCheck?.ok ? typeCheck.value : draft, field.type)}`
            ) : r.raw.value !== null && (r.current.value ?? '') !== r.raw.value ? (
              <>Extracted value: {formatValue(r.raw.value, field.type)}</>
            ) : null}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => act(() => approve({ resultId: r._id }), 'Approved')}
              disabled={!draft.trim() || r.current.state === 'approved'}
            >
              <ShieldCheck /> Approve
            </Button>
            <Button size="sm" variant="secondary" onClick={() => act(() => clear({ resultId: r._id }), 'Cleared')} disabled={r.current.state === 'cleared'}>
              <Eraser /> Clear
            </Button>
            <Button size="sm" variant="ghost" onClick={() => act(() => restore({ resultId: r._id }), 'Restored to extracted value')} disabled={!changed}>
              <RotateCcw /> Restore extracted
            </Button>
          </div>
        </div>

        {r.raw.repair && (
          <div className="rounded-xl border border-accent/30 bg-accent-soft/40 p-3">
            <h3 className="flex items-center gap-1.5 text-xs font-medium">
              <Wrench className="size-3.5 text-accent" aria-hidden /> Repair pass
            </h3>
            <p className="mt-1 text-[13px] text-muted-foreground">{r.raw.repair.note}</p>
            {r.raw.repair.failedQuotes.length > 0 && (
              <div className="mt-2">
                <p className="text-[11px] uppercase tracking-wide text-subtle-foreground">First-pass quote that failed verification</p>
                {r.raw.repair.failedQuotes.map((q) => (
                  <p key={q} className="mt-1 text-[13px] text-review line-through decoration-review/60">
                    {q}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {r.raw.status === 'conflicting' && (
          <ConflictCompare field={field} result={r} docName={docName} active={active} onShowEvidence={onShowEvidence} />
        )}

        {r.raw.status === 'missing' && (
          <div className="rounded-xl border border-dashed border-border-strong p-3 text-[13px] text-muted-foreground">
            <p className="flex items-center gap-1.5 font-medium text-foreground">
              <CircleDashed className="size-4 text-missing" aria-hidden /> Not documented
            </p>
            <p className="mt-1">
              No source states this. It stays blank on purpose: TraceForm never infers a fact from absence. If you know the answer
              from elsewhere, type it above and it will be marked as edited by you.
            </p>
          </div>
        )}

        {/* Verification */}
        <div>
          <h3 className="text-xs font-medium text-muted-foreground">Verification</h3>
          <dl className="mt-2 grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl bg-surface-2 p-3">
              <dt className="text-[11px] font-medium uppercase tracking-wide text-subtle-foreground">Source match</dt>
              <dd className="mt-1 text-[13px]">
                {r.raw.evidence.length === 0
                  ? 'No citations'
                  : `${verifiedCount} of ${r.raw.evidence.length} quote${r.raw.evidence.length === 1 ? '' : 's'} found verbatim in the source`}
              </dd>
              <dd className="mt-0.5 text-[11.5px] text-subtle-foreground">Checked by code, not by the model.</dd>
            </div>
            <div className="rounded-xl bg-surface-2 p-3">
              <dt className="text-[11px] font-medium uppercase tracking-wide text-subtle-foreground">Answer validation</dt>
              <dd className="mt-1 text-[13px]">
                {r.current.state === 'unreviewed' ? 'Not yet confirmed by a human' : `Human review: ${r.current.state}`}
              </dd>
              <dd className="mt-0.5 text-[11.5px] text-subtle-foreground">Only a reviewer can confirm what a quote means.</dd>
            </div>
          </dl>
          {r.raw.issues.length > 0 && (
            <ul className="mt-2 space-y-1">
              {r.raw.issues.map((issue) => (
                <li key={issue} className="flex items-start gap-1.5 text-xs text-review">
                  <CircleX className="mt-px size-3.5 shrink-0" aria-hidden />
                  {issue}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-subtle-foreground">{STATUS_META[r.raw.status].description}</p>
        </div>

        {r.raw.status !== 'conflicting' && r.raw.evidence.length > 0 && (
          <div>
            <h3 className="text-xs font-medium text-muted-foreground">Evidence</h3>
            <ul className="mt-2 space-y-2">
              {r.raw.evidence.map((e, i) => {
                const isActive = active?.index === i
                return (
                  <li key={i}>
                    <button
                      onClick={() => e.sourceMatchVerified && onShowEvidence(i)}
                      disabled={!e.sourceMatchVerified}
                      className={cn(
                        'w-full rounded-xl border p-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                        e.sourceMatchVerified ? 'border-border hover:border-accent/50 hover:bg-surface-2' : 'cursor-default border-review/30 bg-review-soft',
                        isActive && e.sourceMatchVerified && 'border-accent/60 bg-accent-soft',
                      )}
                    >
                      <span className="flex items-center gap-1.5 text-[11.5px] text-subtle-foreground">
                        {e.sourceMatchVerified ? (
                          <CircleCheck className="size-3.5 text-supported" aria-hidden />
                        ) : (
                          <CircleX className="size-3.5 text-review" aria-hidden />
                        )}
                        <span className="truncate">{docName(e.documentId)}</span>
                        {e.paragraphIndex !== null && <span>· ¶{e.paragraphIndex + 1}</span>}
                        {e.pageNumber !== null && <span>· page {e.pageNumber}</span>}
                        <span className="ml-auto">{e.sourceMatchVerified ? 'Show in source' : (e.verifyNote ?? 'unverified')}</span>
                      </span>
                      <span className="mt-1.5 flex gap-2 text-[13px] leading-relaxed">
                        <Quote className="mt-1 size-3 shrink-0 text-subtle-foreground" aria-hidden />
                        <span className={e.sourceMatchVerified ? '' : 'line-through decoration-review/60'}>{e.quote}</span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {r.raw.reason && (
          <div>
            <h3 className="text-xs font-medium text-muted-foreground">Model’s reason</h3>
            <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{r.raw.reason}</p>
          </div>
        )}
      </div>
    </article>
  )
}
