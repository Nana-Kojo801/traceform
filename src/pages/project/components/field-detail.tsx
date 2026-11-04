import { useEffect, useRef, useState } from 'react'
import { useMutation } from 'convex/react'
import { toast } from 'sonner'
import { api } from '@convex/_generated/api'
import type { FormField } from '@shared/types'
import { checkType } from '@shared/verify'
import { Button, Kbd } from '@/components/ui/button'
import { LineInput } from '@/components/ui/input'
import { ReviewMark, STATUS_META } from '@/components/status-badge'
import { formatValue, relativeTime } from '@/lib/format'
import { errorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'
import { ConflictCompare } from './conflict-compare'
import type { ActiveEvidence, DocumentRow, FieldResultRow } from './types'

const TYPE_LABEL: Record<FormField['type'], string> = {
  short_text: 'Text',
  long_text: 'Long text',
  number: 'Number',
  date: 'Date',
  single_select: 'Single select',
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

interface Props {
  field: FormField
  index: number
  sectionTitle: string
  result: FieldResultRow | undefined
  documents: DocumentRow[]
  active: ActiveEvidence | null
  onShowEvidence: (index: number) => void
  isPrecomputed: boolean
}

export function FieldDetail({ field, index, sectionTitle, result, documents, active, onShowEvidence, isPrecomputed }: Props) {
  const edit = useMutation(api.review.edit)
  const approve = useMutation(api.review.approve)
  const clear = useMutation(api.review.clear)
  const restore = useMutation(api.review.restore)

  const serverValue = result?.current.value ?? ''
  const [draft, setDraft] = useState(serverValue)
  const [save, setSave] = useState<SaveState>('idle')
  const dirty = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!dirty.current) setDraft(serverValue)
  }, [serverValue])

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )

  const eyebrow = `${String(index).padStart(2, '0')} · ${sectionTitle} · ${TYPE_LABEL[field.type]}${field.required ? ' · Required' : ''}`

  if (!result) {
    return (
      <div className="px-6 py-7 md:px-8">
        <p className="cap">{eyebrow}</p>
        <h1 className="mt-2.5 text-[28px] font-semibold tracking-[-0.035em]">{field.label}</h1>
        <p className="mt-4 text-[14px] text-ink-2">This field was added after the selected run. Run extraction again to fill it.</p>
      </div>
    )
  }

  const r = result
  const docName = (id: string) => documents.find((d) => d._id === id)?.name ?? 'Removed document'
  const meta = STATUS_META[r.raw.status]
  const verifiedCount = r.raw.evidence.filter((e) => e.sourceMatchVerified).length

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

  async function flush() {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
      if (dirty.current) await persist(draft)
    }
  }

  async function act(fn: () => Promise<unknown>, done: string) {
    await flush()
    try {
      await fn()
      dirty.current = false
      toast.success(done)
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  const typeCheck = draft.trim() ? checkType(field, draft) : null
  const changed = r.current.state !== 'unreviewed' || (r.current.value ?? '') !== (r.raw.value ?? '')

  const statusLine =
    r.raw.status === 'supported'
      ? `${verifiedCount} of ${r.raw.evidence.length} quote${r.raw.evidence.length === 1 ? '' : 's'} verified by code`
      : r.raw.status === 'conflicting'
        ? 'Sources give different values. You decide.'
        : r.raw.status === 'missing'
          ? 'Not stated in any source'
          : (r.raw.issues[0] ?? 'Failed a deterministic check')

  const helper =
    save === 'saving'
      ? 'Saving'
      : save === 'saved'
        ? '✓ Saved'
        : save === 'error'
          ? '! Not saved'
          : typeCheck && !typeCheck.ok
            ? null
            : r.current.editedAt
              ? `Updated ${relativeTime(r.current.editedAt)}`
              : 'Autosaves · extracted value can be restored'

  const showValue = r.raw.status !== 'conflicting' || r.current.state === 'resolved' || r.current.state === 'edited'

  return (
    <article className="animate-fade-in pb-24 lg:pb-10">
      <header className="px-6 pt-7 md:px-8">
        <p className="cap">{eyebrow}</p>
        <h1 className="mt-2.5 text-[26px] font-semibold leading-[1.1] tracking-[-0.035em] md:text-[30px]">{field.label}</h1>
        <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <p className={cn('font-mono text-xs uppercase', meta.color)}>
            {meta.glyph} {meta.label} · <span className="normal-case">{statusLine}</span>
          </p>
          <ReviewMark state={r.current.state} />
        </div>
        {field.description && <p className="mt-2 text-[13px] text-muted">{field.description}</p>}
      </header>

      {r.raw.repair && (
        <section className="mx-6 mt-6 border-t border-dashed border-line-strong pt-3 md:mx-8" aria-label="Repair pass">
          <p className="font-mono text-[11px] uppercase text-ink">
            ↻ {r.raw.repair.outcome === 'fixed' ? 'Repaired on second pass' : r.raw.repair.outcome === 'now_missing' ? 'Withdrawn on second pass' : 'Still unverified after second pass'}
          </p>
          {r.raw.repair.failedQuotes.map((q) => (
            <p key={q} className="mt-1.5 font-serif text-[14.5px] leading-[1.45] text-faint line-through">
              “{q}”
            </p>
          ))}
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">{r.raw.repair.note}</p>
        </section>
      )}

      {r.raw.status === 'conflicting' && (
        <div className="mt-6 px-6 md:px-8">
          <ConflictCompare field={field} result={r} docName={docName} active={active} onShowEvidence={onShowEvidence} />
        </div>
      )}

      {/* Reviewed value */}
      <section className="mt-6 flex flex-col gap-2 px-6 md:px-8" aria-label="Reviewed value">
        <label htmlFor={`value-${field.id}`} className="cap">
          Reviewed value
        </label>
        <div className="flex flex-wrap items-end gap-2.5">
          {field.type === 'single_select' ? (
            <select
              id={`value-${field.id}`}
              value={draft}
              onChange={(e) => onChange(e.target.value)}
              onBlur={flush}
              className="h-11 min-w-0 flex-1 border-0 border-b border-ink bg-transparent text-[20px] font-medium outline-none focus-visible:border-b-2"
            >
              <option value="">(blank)</option>
              {field.choices.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              {draft && !field.choices.includes(draft) && <option value={draft}>{draft}</option>}
            </select>
          ) : (
            <LineInput
              id={`value-${field.id}`}
              value={showValue ? draft : draft}
              onChange={(e) => onChange(e.target.value)}
              onBlur={flush}
              inputMode={field.type === 'number' ? 'decimal' : undefined}
              placeholder={r.raw.status === 'missing' ? 'Blank · type a value if you know it' : r.raw.status === 'conflicting' ? 'Pick a side, or type a value' : 'Blank'}
              className={cn('flex-1 basis-56', (field.type === 'number' || field.type === 'date') && 'tabular-nums')}
            />
          )}
          <div className="flex gap-2">
            <Button
              variant="ink"
              className="max-lg:hidden"
              onClick={() => act(() => approve({ resultId: r._id }), 'Approved')}
              disabled={!draft.trim() || r.current.state === 'approved'}
            >
              Approve <Kbd dark>A</Kbd>
            </Button>
            <Button onClick={() => act(() => clear({ resultId: r._id }), 'Cleared')} disabled={r.current.state === 'cleared'}>
              Clear
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-2 font-mono text-[11px] uppercase tracking-[0.03em]">
          <span className={cn(save === 'saved' ? 'text-ok' : save === 'error' ? 'text-review' : 'text-faint')} aria-live="polite">
            {typeCheck && !typeCheck.ok ? (
              <span className="normal-case text-review">! {typeCheck.note}</span>
            ) : save === 'saving' ? (
              <span className="working">{helper}</span>
            ) : (
              helper
            )}
            {draft && typeCheck?.ok && (field.type === 'number' || field.type === 'date') && save !== 'saving' && (
              <span className="ml-2 normal-case text-muted">reads as {formatValue(typeCheck.value, field.type)}</span>
            )}
          </span>
          {changed && (
            <button onClick={() => act(() => restore({ resultId: r._id }), 'Restored to extracted value')} className="normal-case tracking-normal text-[12.5px] text-ink underline underline-offset-4 hover:decoration-2" style={{ fontFamily: 'var(--font-sans)' }}>
              Restore extracted{r.raw.value ? ` (${formatValue(r.raw.value, field.type)})` : ''}
            </button>
          )}
        </div>
      </section>

      {r.raw.status === 'missing' && (
        <p className="mx-6 mt-6 border-l-0 font-serif text-[15px] leading-[1.55] text-ink-2 md:mx-8">
          No source states this, so the field stays blank. Traceform never infers a fact from absence.
        </p>
      )}

      {/* Evidence as footnotes */}
      {r.raw.status !== 'conflicting' && r.raw.evidence.length > 0 && (
        <section className="mt-7 px-6 md:px-8" aria-label="Evidence">
          <p className="cap mb-1">Evidence</p>
          <ol>
            {r.raw.evidence.map((e, i) => {
              const inView = active?.index === i
              return (
                <li key={i} className="border-t border-line first:border-ink">
                  <button
                    data-trace-source={inView && e.sourceMatchVerified ? 'true' : undefined}
                    onClick={() => e.sourceMatchVerified && onShowEvidence(i)}
                    disabled={!e.sourceMatchVerified}
                    className={cn(
                      'grid w-full grid-cols-[20px_minmax(0,1fr)] gap-2 py-3 text-left outline-none focus-visible:outline-2 focus-visible:outline-ink',
                      e.sourceMatchVerified ? 'hover:bg-wash' : 'cursor-default',
                    )}
                  >
                    <span className="pt-1 font-mono text-[11px] font-medium">{i + 1}</span>
                    <span className="flex flex-col gap-1">
                      <span className={cn('font-serif text-[15px] leading-[1.5]', !e.sourceMatchVerified && 'text-faint line-through')}>
                        “{inView && e.sourceMatchVerified ? <span className="hl">{e.quote}</span> : e.quote}”
                      </span>
                      <span className={cn('font-mono text-[11px]', e.sourceMatchVerified ? 'text-muted' : 'text-review')}>
                        {e.sourceMatchVerified ? '✓' : '!'} {docName(e.documentId)}
                        {e.paragraphIndex !== null && ` · ¶${e.paragraphIndex + 1}`}
                        {e.pageNumber !== null && ` · page ${e.pageNumber}`}
                        {!e.sourceMatchVerified && ` · ${e.verifyNote ?? 'unverified'}`}
                        {e.sourceMatchVerified && <span className="ml-2 text-ink">{inView ? '◂ in view' : 'show ▸'}</span>}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>
        </section>
      )}

      {/* Verification log */}
      <section className="mt-7 px-6 md:px-8" aria-label="Verification log">
        <p className="cap mb-1.5">Verification log</p>
        <div className="border-b border-dashed border-line font-mono text-[12px] leading-[1.55] text-ink-2">
          {r.raw.evidence.map((e, i) => (
            <LogLine key={i} mark={e.sourceMatchVerified ? '✓' : '!'} tone={e.sourceMatchVerified ? 'ok' : 'review'}>
              quote <b className="font-medium text-ink">{i + 1}</b>{' '}
              {e.sourceMatchVerified ? (
                <>
                  found verbatim · {docName(e.documentId)}
                  {e.paragraphIndex !== null && ` ¶${e.paragraphIndex + 1}`} · chars {e.startOffset}–{e.endOffset}
                </>
              ) : (
                <>
                  {e.verifyNote ?? 'not verified'} · {docName(e.documentId)}
                </>
              )}
            </LogLine>
          ))}
          {r.raw.evidence.length === 0 && (
            <LogLine mark="—" tone="muted">
              no citations {r.raw.status === 'missing' ? '· the model reported the fact as missing' : ''}
            </LogLine>
          )}
          {r.raw.issues
            .filter((i) => !i.startsWith('quote not found') && !i.startsWith('unknown source'))
            .map((issue) => (
              <LogLine key={issue} mark="!" tone="review">
                {issue}
              </LogLine>
            ))}
          {(r.raw.status === 'supported' || r.raw.status === 'conflicting') && r.raw.issues.length === 0 && (
            <LogLine mark="✓" tone="ok">
              {r.raw.status === 'conflicting' ? `conflict rule · ${new Set(r.raw.evidence.map((e) => e.claimedValue)).size} distinct verified values` : `type check · ${TYPE_LABEL[field.type].toLowerCase()}`}
            </LogLine>
          )}
          {(r.raw.status === 'supported' || r.raw.status === 'conflicting') && (
            <LogLine mark="~" tone="muted">
              second opinion <span className="text-faint">(advisory, Meta)</span> ·{' '}
              {r.raw.audit ? (
                <>
                  <span className={r.raw.audit.verdict === 'disagrees' ? 'text-review' : 'text-ink'}>
                    {r.raw.audit.verdict === 'agrees' ? (r.raw.status === 'conflicting' ? 'agrees it is a real conflict' : 'agrees') : r.raw.audit.verdict}
                  </span>
                  {' · '}
                  <span className="font-sans text-[12.5px] text-muted">{r.raw.audit.note}</span>
                </>
              ) : isPrecomputed ? (
                'not run for the precomputed sample'
              ) : (
                'not recorded'
              )}
            </LogLine>
          )}
          <LogLine mark={r.current.state === 'unreviewed' ? '○' : '■'} tone={r.current.state === 'unreviewed' ? 'conflict' : 'ink'}>
            human review · {r.current.state === 'unreviewed' ? <span className="text-conflict">waiting for you</span> : r.current.state}
          </LogLine>
        </div>
        <p className="mt-3 text-[12.5px] leading-relaxed text-muted">
          Lines marked ✓ are checked by code, not by the model. A match proves the quote exists, not that it answers the question. That part is yours.
        </p>
      </section>

      {r.raw.reason && (
        <section className="mt-6 px-6 md:px-8">
          <p className="cap mb-1">Model’s reason</p>
          <p className="text-[13.5px] leading-relaxed text-ink-2">{r.raw.reason}</p>
        </section>
      )}
    </article>
  )
}

function LogLine({ mark, tone, children }: { mark: string; tone: 'ok' | 'review' | 'muted' | 'conflict' | 'ink'; children: React.ReactNode }) {
  const color = { ok: 'text-ok', review: 'text-review', muted: 'text-muted', conflict: 'text-conflict', ink: 'text-ink' }[tone]
  return (
    <div className="grid grid-cols-[18px_minmax(0,1fr)] gap-2.5 border-t border-dashed border-line py-[7px]">
      <span className={color}>{mark}</span>
      <span className="break-words">{children}</span>
    </div>
  )
}
