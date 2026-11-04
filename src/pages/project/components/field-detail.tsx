import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useMutation } from 'convex/react'
import { toast } from 'sonner'
import { api } from '@convex/_generated/api'
import type { FormField } from '@shared/types'
import { checkType } from '@shared/verify'
import { Button } from '@/components/ui/button'
import { RepairIcon, StatusIcon, StatusPill } from '@/components/status-badge'
import { formatValue } from '@/lib/format'
import { errorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'
import { ConflictCompare } from './conflict-compare'
import { shortName } from './source-viewer'
import type { ActiveEvidence, DocumentRow, FieldResultRow } from './types'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

interface Props {
  field: FormField
  result: FieldResultRow | undefined
  documents: DocumentRow[]
  active: ActiveEvidence | null
  onShowEvidence: (index: number) => void
  isPrecomputed: boolean
}

const REVIEW_LABEL = { approved: 'Approved', edited: 'Edited by you', cleared: 'Cleared', resolved: 'Chosen by you' } as const

export function FieldDetail({ field, result, documents, active, onShowEvidence }: Props) {
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

  if (!result) {
    return (
      <div className="flex flex-col gap-3">
        <h2 className="text-[30px] font-bold tracking-[-0.025em]">{field.label}</h2>
        <p className="text-muted">This field was added after this run. Run again to fill it.</p>
      </div>
    )
  }

  const r = result
  const docName = (id: string) => {
    const n = documents.find((d) => d._id === id)?.name
    return n ? shortName(n) : 'Removed document'
  }
  const verified = r.raw.evidence.filter((e) => e.sourceMatchVerified)

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
  const shown = draft.trim() ? formatValue(typeCheck?.ok ? typeCheck.value : draft, field.type) : ''
  const isLong = field.type === 'long_text'

  const statusLabel =
    r.raw.status === 'supported'
      ? verified.length > 1
        ? `Verified in ${new Set(verified.map((e) => e.documentId)).size > 1 ? `${new Set(verified.map((e) => e.documentId)).size} sources` : 'the source'}`
        : 'Verified in the source'
      : undefined

  return (
    <article className="flex flex-col gap-6 animate-fade-in">
      <header className="flex flex-col gap-2.5">
        <h2 className="text-[30px] font-bold leading-[1.1] tracking-[-0.025em] md:text-[34px]">{field.label}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill status={r.raw.status} label={r.raw.status === 'conflicting' ? 'Sources disagree, choose one' : statusLabel} />
          {r.current.state !== 'unreviewed' && (
            <span className="inline-flex h-7 items-center rounded-full bg-ink px-3 text-[13px] font-semibold text-white">{REVIEW_LABEL[r.current.state]}</span>
          )}
        </div>
        {field.description && <p className="text-[14px] text-muted">{field.description}</p>}
      </header>

      {r.raw.status === 'conflicting' && <ConflictCompare field={field} result={r} docName={docName} active={active} onShowEvidence={onShowEvidence} />}

      {/* Answer */}
      <section aria-label="Answer">
        <label htmlFor={`value-${field.id}`} className="block px-4 pb-1.5 text-[13px] text-muted">
          {r.raw.status === 'conflicting' ? 'Or type a value' : 'Answer'}
        </label>
        <div className="card px-4 py-3 focus-within:shadow-[inset_0_0_0_2px_var(--ink)]">
          {field.type === 'single_select' ? (
            <select
              id={`value-${field.id}`}
              value={draft}
              onChange={(e) => onChange(e.target.value)}
              onBlur={flush}
              className="h-10 w-full bg-transparent text-[22px] font-bold tracking-[-0.02em] outline-none"
            >
              <option value="">Blank</option>
              {field.choices.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              {draft && !field.choices.includes(draft) && <option value={draft}>{draft}</option>}
            </select>
          ) : isLong ? (
            <textarea
              id={`value-${field.id}`}
              value={draft}
              onChange={(e) => onChange(e.target.value)}
              onBlur={flush}
              rows={3}
              placeholder="Blank"
              className="w-full resize-y bg-transparent text-[16px] leading-relaxed outline-none"
            />
          ) : (
            <input
              id={`value-${field.id}`}
              value={draft}
              onChange={(e) => onChange(e.target.value)}
              onBlur={flush}
              inputMode={field.type === 'number' ? 'decimal' : undefined}
              placeholder={r.raw.status === 'missing' ? 'Blank, type it if you know it' : 'Blank'}
              className="h-10 w-full bg-transparent text-[22px] font-bold tracking-[-0.02em] tabular-nums outline-none placeholder:font-medium"
            />
          )}
          <div className="flex min-h-5 flex-wrap items-center justify-between gap-2 text-[12.5px]" aria-live="polite">
            <span className={cn(typeCheck && !typeCheck.ok ? 'text-bad-text' : save === 'saved' ? 'text-ok-text' : 'text-muted')}>
              {typeCheck && !typeCheck.ok
                ? typeCheck.note
                : save === 'saving'
                  ? <span className="working">Saving</span>
                  : save === 'saved'
                    ? 'Saved'
                    : save === 'error'
                      ? 'Not saved'
                      : (field.type === 'number' || field.type === 'date') && shown && shown !== draft
                        ? shown
                        : 'Saves as you type'}
            </span>
            {changed && (
              <button onClick={() => act(() => restore({ resultId: r._id }), 'Restored')} className="font-medium text-ink underline-offset-4 hover:underline">
                Restore original
              </button>
            )}
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-2 max-lg:hidden">
        <Button
          variant="ink"
          size="xl"
          title="Approve (A)"
          onClick={() => act(() => approve({ resultId: r._id }), 'Approved')}
          disabled={!draft.trim() || r.current.state === 'approved'}
        >
          {r.current.state === 'approved' ? 'Approved' : shown ? `Approve ${shown.length > 28 ? '' : shown}`.trim() : 'Approve'}
        </Button>
        {r.current.state !== 'cleared' && (
          <Button variant="ghost" size="sm" className="self-center text-muted" onClick={() => act(() => clear({ resultId: r._id }), 'Cleared')}>
            Clear this answer
          </Button>
        )}
      </div>

      {r.raw.status === 'missing' && (
        <div className="card flex items-center gap-3 px-4 py-3.5">
          <StatusIcon status="missing" />
          <p className="text-[15px] text-ink-2">No document mentions this, so it stays blank.</p>
        </div>
      )}

      {/* Source quotes */}
      {r.raw.status !== 'conflicting' && r.raw.evidence.length > 0 && (
        <section aria-label="Source">
          <p className="px-4 pb-1.5 text-[13px] text-muted">{r.raw.evidence.length > 1 ? 'Sources' : 'Source'}</p>
          <div className="card overflow-hidden">
            {r.raw.evidence.map((e, i) => {
              const inView = active?.index === i
              return (
                <button
                  key={i}
                  data-trace-source={inView && e.sourceMatchVerified ? 'true' : undefined}
                  onClick={() => e.sourceMatchVerified && onShowEvidence(i)}
                  disabled={!e.sourceMatchVerified}
                  className={cn(
                    'relative flex w-full flex-col gap-1.5 px-4 py-3.5 text-left outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink',
                    e.sourceMatchVerified && 'hover:bg-[#fafaf8]',
                    i > 0 && 'before:absolute before:left-4 before:right-0 before:top-0 before:h-px before:bg-line-soft',
                  )}
                >
                  <span className="flex items-center gap-2 text-[13px] text-muted">
                    <span className="cite">{i + 1}</span>
                    {docName(e.documentId)}
                    {!e.sourceMatchVerified && <span className="font-medium text-bad-text">· not found in the source</span>}
                  </span>
                  <span className={cn('font-serif text-[16px] leading-[1.55]', e.sourceMatchVerified ? 'text-ink' : 'text-faint line-through')}>
                    {inView && e.sourceMatchVerified ? <span className="hl">{e.quote}</span> : e.quote}
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      )}

      <Checks r={r} />
    </article>
  )
}

function Checks({ r }: { r: FieldResultRow }) {
  const rows: { icon: ReactNode; text: ReactNode; sub?: string }[] = []
  const total = r.raw.evidence.length
  const ok = r.raw.evidence.filter((e) => e.sourceMatchVerified).length
  if (total > 0) {
    rows.push({
      icon: <StatusIcon status={ok === total ? 'supported' : 'needs_review'} />,
      text: ok === total ? (total > 1 ? `All ${total} quotes found in the sources` : 'Quote found in the source') : `${total - ok} quote${total - ok > 1 ? 's' : ''} not found in the source`,
    })
  }
  if (r.raw.repair) {
    rows.push({
      icon: <RepairIcon />,
      text: r.raw.repair.outcome === 'fixed' ? 'Fixed on a second try' : r.raw.repair.outcome === 'now_missing' ? 'Withdrawn on a second try' : 'Still unverified after a second try',
      sub: r.raw.repair.failedQuotes.length ? `The first quote wasn’t in the source: “${r.raw.repair.failedQuotes[0]}”` : undefined,
    })
  }
  for (const issue of r.raw.issues.filter((i) => !i.startsWith('quote not found') && !i.startsWith('unknown source') && i !== 'no verified evidence')) {
    rows.push({ icon: <StatusIcon status="needs_review" />, text: issue.charAt(0).toUpperCase() + issue.slice(1) })
  }
  if (r.raw.audit) {
    const a = r.raw.audit
    rows.push({
      icon: <StatusIcon status={a.verdict === 'agrees' ? 'supported' : a.verdict === 'disagrees' ? 'conflicting' : 'missing'} />,
      text:
        a.verdict === 'agrees'
          ? r.raw.status === 'conflicting'
            ? 'Second opinion agrees it’s a real conflict'
            : 'Second opinion agrees'
          : a.verdict === 'disagrees'
            ? 'Second opinion disagrees'
            : 'Second opinion is unsure',
      sub: a.note,
    })
  }
  if (rows.length === 0) return null

  return (
    <section aria-label="Checks">
      <p className="px-4 pb-1.5 text-[13px] text-muted">Checks</p>
      <div className="card overflow-hidden">
        {rows.map((row, i) => (
          <div key={i} className={cn('relative flex items-start gap-3 px-4 py-3', i > 0 && 'before:absolute before:left-[48px] before:right-0 before:top-0 before:h-px before:bg-line-soft')}>
            <span className="mt-px">{row.icon}</span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[15px]">{row.text}</span>
              {row.sub && <span className="line-clamp-2 text-[13px] text-muted">{row.sub}</span>}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
