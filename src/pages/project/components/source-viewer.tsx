import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { Kbd } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ActiveEvidence, DocumentRow, FieldResultRow } from './types'

interface Mark {
  start: number
  end: number
  evidenceIndex: number
}

export type SourceMode = 'text' | 'side' | 'original'

interface Props {
  documents: DocumentRow[]
  viewDocId: string | null
  onViewDoc: (id: string) => void
  result?: FieldResultRow
  fieldLabel?: string
  active: ActiveEvidence | null
  onFocusEvidence?: (index: number) => void
  /** Plain preview: no citations, no citation navigation. */
  plain?: boolean
  defaultMode?: SourceMode
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Render one segment's text with citation marks, as plain React text (never HTML). */
function renderSegment(text: string, segStart: number, segEnd: number, marks: Mark[], active: ActiveEvidence | null, conflict: boolean, onFocus?: (i: number) => void) {
  const inSeg = marks
    .filter((m) => m.end > segStart && m.start < segEnd)
    .map((m) => ({ ...m, start: Math.max(m.start, segStart), end: Math.min(m.end, segEnd), endsHere: m.end <= segEnd }))
    .sort((a, b) => a.start - b.start)
  const parts: ReactNode[] = []
  let cursor = segStart
  for (const m of inSeg) {
    if (m.start < cursor) continue
    if (m.start > cursor) parts.push(text.slice(cursor, m.start))
    const isActive = active?.index === m.evidenceIndex
    parts.push(
      <mark
        key={`${m.evidenceIndex}-${m.start}-${isActive ? active?.nonce : 'x'}`}
        className="trace-mark"
        data-active={isActive ? 'true' : undefined}
        data-tone={conflict ? 'conflict' : undefined}
        onClick={() => onFocus?.(m.evidenceIndex)}
      >
        {text.slice(m.start, m.end)}
      </mark>,
    )
    if (m.endsHere) parts.push(<sup key={`fn-${m.evidenceIndex}-${m.start}`} className="fn text-ink">{m.evidenceIndex + 1}</sup>)
    cursor = m.end
  }
  if (cursor < segEnd) parts.push(text.slice(cursor, segEnd))
  return parts
}

export function SourceViewer({ documents, viewDocId, onViewDoc, result, fieldLabel, active, onFocusEvidence, plain, defaultMode = 'text' }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const parsed = documents.filter((d) => d.parseStatus === 'parsed')
  const doc = parsed.find((d) => d._id === viewDocId) ?? parsed[0]
  const [mode, setMode] = useState<SourceMode>(defaultMode)
  const effectiveMode: SourceMode = doc?.transcribed ? mode : 'text'
  const images = useQuery(api.documents.pageImages, doc?.transcribed && effectiveMode !== 'text' ? { documentId: doc._id as Id<'documents'> } : 'skip')

  const evidence = useMemo(() => (plain ? [] : (result?.raw.evidence ?? [])), [plain, result])
  const marks: Mark[] = useMemo(
    () =>
      evidence
        .map((e, i) => ({ e, i }))
        .filter(({ e }) => e.sourceMatchVerified && e.documentId === doc?._id && e.startOffset !== null && e.endOffset !== null)
        .map(({ e, i }) => ({ start: e.startOffset!, end: e.endOffset!, evidenceIndex: i })),
    [evidence, doc],
  )
  const verifiedIdx = evidence.map((e, i) => (e.sourceMatchVerified ? i : -1)).filter((i) => i >= 0)

  useEffect(() => {
    if (!active || !scrollRef.current) return
    const id = requestAnimationFrame(() => {
      const container = scrollRef.current
      const el = container?.querySelector<HTMLElement>('mark[data-active="true"]')
      if (!container || !el) return
      const delta = el.getBoundingClientRect().top - container.getBoundingClientRect().top
      const top = container.scrollTop + delta - container.clientHeight / 2 + el.offsetHeight / 2
      container.scrollTo({ top: Math.max(0, top), behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
    })
    return () => cancelAnimationFrame(id)
  }, [active, doc?._id])

  if (parsed.length === 0) {
    return (
      <div className="flex h-full min-h-[320px] items-center justify-center bg-desk p-8">
        <p className="cap">No parsed source documents</p>
      </div>
    )
  }

  const conflict = result?.raw.status === 'conflicting'
  const activeEv = active && result ? result.raw.evidence[active.index] : null
  const activeSeg = activeEv && activeEv.documentId === doc?._id ? doc.segments.find((s) => s.index === activeEv.paragraphIndex) : null
  const docNotes = marks.map((m) => ({ ...m, e: evidence[m.evidenceIndex] }))
  const pos = active ? verifiedIdx.indexOf(active.index) : -1

  const step = (dir: 1 | -1) => {
    if (!verifiedIdx.length || !onFocusEvidence) return
    const next = verifiedIdx[(pos + dir + verifiedIdx.length) % verifiedIdx.length]
    onFocusEvidence(next)
  }

  return (
    <div className="flex h-full min-h-[480px] flex-col bg-desk lg:min-h-0">
      <div role="tablist" aria-label="Source documents" className="scrollbar-thin flex shrink-0 gap-5 overflow-x-auto border-b border-line bg-white px-5 md:px-6">
        {parsed.map((d) => {
          const selected = d._id === doc?._id
          const nums = evidence.map((e, i) => (e.sourceMatchVerified && e.documentId === d._id ? i + 1 : 0)).filter(Boolean)
          return (
            <button
              key={d._id}
              role="tab"
              aria-selected={selected}
              onClick={() => onViewDoc(d._id)}
              className={cn(
                'flex h-11 shrink-0 items-center whitespace-nowrap border-b-2 text-[13px] font-medium outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink',
                selected ? 'border-ink text-ink' : 'border-transparent text-muted hover:text-ink',
              )}
            >
              {d.name}
              {nums.length > 0 && <span className="fn text-ink">{nums.join(' ')}</span>}
            </button>
          )
        })}
      </div>

      {doc?.transcribed && (
        <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1.5 bg-hl px-5 py-2 md:px-6">
          <p className="font-mono text-[11px] uppercase leading-snug tracking-[0.02em] text-ink">
            Model transcription · quotes are verified against this text, not the image
          </p>
          <div role="group" aria-label="View" className="ml-auto flex gap-3.5 text-[12.5px]">
            {(
              [
                ['text', 'Transcription'],
                ['side', 'Side by side'],
                ['original', 'Original'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                aria-pressed={effectiveMode === id}
                onClick={() => setMode(id)}
                className={cn('rounded-[6px] outline-none focus-visible:outline-2 focus-visible:outline-ink', effectiveMode === id ? 'font-semibold underline decoration-2 underline-offset-4' : 'text-ink-2 hover:text-ink')}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div ref={scrollRef} className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-4 pb-10 pt-6 md:px-7 md:pt-7" tabIndex={0} aria-label={`Text of ${doc?.name}`}>
        <div className={cn('mx-auto', effectiveMode === 'side' ? 'grid max-w-[1100px] gap-6 xl:grid-cols-2' : 'max-w-[580px]')}>
          {doc?.transcribed && effectiveMode !== 'text' && (
            <figure className="flex flex-col gap-2.5">
              <figcaption className="cap">Original</figcaption>
              {images === undefined && <div className="paper h-80 animate-pulse" />}
              {images?.map((src, i) => (
                <img key={src} src={src} alt={`Original page ${i + 1} of ${doc.name}`} className="paper w-full" loading="lazy" />
              ))}
            </figure>
          )}
          {(effectiveMode !== 'original' || !doc?.transcribed) && doc && (
            <div className="flex flex-col gap-2.5">
              {doc.transcribed && effectiveMode === 'side' && <span className="cap">Transcription</span>}
              <article className="paper px-7 pb-12 pt-9 font-serif text-[15.5px] leading-[1.7] text-[#26272b] md:px-12 md:pt-11">
                <div className="space-y-3.5">
                  {doc.segments.map((s) => {
                    const cited = marks.some((m) => m.end > s.start && m.start < s.end)
                    const newPage = s.pageNumber && doc.segments[s.index - 1]?.pageNumber !== s.pageNumber
                    return (
                      <p key={s.index} className={cn('whitespace-pre-wrap break-words', !plain && marks.length > 0 && !cited && 'text-muted')}>
                        {newPage && <span className="mr-2 select-none font-mono text-[10px] text-faint">p.{s.pageNumber}</span>}
                        {renderSegment(doc.text, s.start, s.end, marks, active, conflict, onFocusEvidence)}
                      </p>
                    )
                  })}
                </div>
                {docNotes.length > 0 && (
                  <ol className="mt-9 w-full max-w-[360px] border-t border-ink pt-2.5 font-mono text-[10.5px] leading-[1.6] text-ink-2">
                    {docNotes.map((n) => (
                      <li key={n.evidenceIndex}>
                        <b>{n.evidenceIndex + 1}</b>&nbsp;&nbsp;{fieldLabel}
                        {conflict && ` · side ${String.fromCharCode(65 + n.evidenceIndex)}`} · verified at chars {n.start}–{n.end}
                      </li>
                    ))}
                  </ol>
                )}
              </article>
            </div>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-line bg-white px-5 py-2 font-mono text-[11px] uppercase text-muted md:px-6">
        <span className="truncate">
          {activeSeg ? `¶${activeSeg.index + 1} of ${doc.segments.length}` : `${doc?.segments.length ?? 0} ¶`} · {doc?.text.length.toLocaleString()} chars
        </span>
        {!plain && verifiedIdx.length > 0 && (
          <span className="flex shrink-0 items-center gap-2">
            Citation {pos + 1 || '–'} of {verifiedIdx.length}
            <button onClick={() => step(-1)} aria-label="Previous citation" className="rounded-[6px] outline-none focus-visible:outline-2 focus-visible:outline-ink">
              <Kbd>[</Kbd>
            </button>
            <button onClick={() => step(1)} aria-label="Next citation" className="rounded-[6px] outline-none focus-visible:outline-2 focus-visible:outline-ink">
              <Kbd>]</Kbd>
            </button>
          </span>
        )}
      </div>
    </div>
  )
}
