import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from 'convex/react'
import { FileText, ScanEye } from 'lucide-react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { cn } from '@/lib/utils'
import type { ActiveEvidence, DocumentRow, FieldResultRow } from './types'

interface Mark {
  start: number
  end: number
  evidenceIndex: number
}

interface Props {
  documents: DocumentRow[]
  viewDocId: string | null
  onViewDoc: (id: string) => void
  result: FieldResultRow | undefined
  active: ActiveEvidence | null
  onFocusEvidence: (index: number) => void
  /** Hide citation marks (used for plain previews). */
  plain?: boolean
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Render one segment's text with citation marks, as plain React text (never HTML). */
function renderSegment(text: string, segStart: number, segEnd: number, marks: Mark[], active: ActiveEvidence | null, tone: 'default' | 'conflict', onFocus: (i: number) => void) {
  const inSeg = marks
    .filter((m) => m.end > segStart && m.start < segEnd)
    .map((m) => ({ ...m, start: Math.max(m.start, segStart), end: Math.min(m.end, segEnd) }))
    .sort((a, b) => a.start - b.start)
  const parts: React.ReactNode[] = []
  let cursor = segStart
  for (const m of inSeg) {
    if (m.start < cursor) continue // overlapping citations: first one wins
    if (m.start > cursor) parts.push(text.slice(cursor, m.start))
    const isActive = active?.index === m.evidenceIndex
    parts.push(
      <mark
        key={`${m.evidenceIndex}-${m.start}-${isActive ? active?.nonce : 'x'}`}
        className="trace-mark cursor-pointer"
        data-active={isActive ? 'true' : undefined}
        data-tone={tone === 'conflict' ? 'conflict' : undefined}
        onClick={() => onFocus(m.evidenceIndex)}
      >
        {text.slice(m.start, m.end)}
      </mark>,
    )
    cursor = m.end
  }
  if (cursor < segEnd) parts.push(text.slice(cursor, segEnd))
  return parts
}

export function SourceViewer({ documents, viewDocId, onViewDoc, result, active, onFocusEvidence, plain }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const parsed = documents.filter((d) => d.parseStatus === 'parsed')
  const doc = parsed.find((d) => d._id === viewDocId) ?? parsed[0]
  const [showOriginal, setShowOriginal] = useState(false)
  const images = useQuery(
    api.documents.pageImages,
    doc?.transcribed && showOriginal ? { documentId: doc._id as Id<'documents'> } : 'skip',
  )

  const marks: Mark[] = useMemo(() => {
    if (plain || !result || !doc) return []
    return result.raw.evidence
      .map((e, i) => ({ e, i }))
      .filter(({ e }) => e.sourceMatchVerified && e.documentId === doc._id && e.startOffset !== null && e.endOffset !== null)
      .map(({ e, i }) => ({ start: e.startOffset!, end: e.endOffset!, evidenceIndex: i }))
  }, [plain, result, doc])

  const citedDocs = useMemo(() => {
    const s = new Set<string>()
    result?.raw.evidence.forEach((e) => e.sourceMatchVerified && s.add(e.documentId))
    return s
  }, [result])

  // Scroll the active citation into view whenever it changes.
  useEffect(() => {
    if (!active || !scrollRef.current) return
    const id = requestAnimationFrame(() => {
      const container = scrollRef.current
      const el = container?.querySelector<HTMLElement>('mark[data-active="true"]')
      if (!container || !el) return
      // Scroll only the source pane (scrollIntoView would also scroll the window).
      const delta = el.getBoundingClientRect().top - container.getBoundingClientRect().top
      const top = container.scrollTop + delta - container.clientHeight / 2 + el.offsetHeight / 2
      container.scrollTo({ top: Math.max(0, top), behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
    })
    return () => cancelAnimationFrame(id)
  }, [active, doc?._id])

  if (parsed.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-border bg-surface p-8 text-center text-sm text-muted-foreground">
        <FileText className="size-6 text-subtle-foreground" aria-hidden />
        <p className="mt-2">No parsed source documents.</p>
      </div>
    )
  }

  const tone = result?.raw.status === 'conflicting' ? 'conflict' : 'default'
  const activeEvidence = active && result ? result.raw.evidence[active.index] : null

  return (
    <div className="flex h-full min-h-[420px] flex-col rounded-2xl border border-border bg-surface lg:min-h-0">
      <div className="scrollbar-thin flex gap-1 overflow-x-auto border-b border-border p-2" role="tablist" aria-label="Source documents">
        {parsed.map((d) => {
          const selected = d._id === doc?._id
          return (
            <button
              key={d._id}
              role="tab"
              aria-selected={selected}
              onClick={() => onViewDoc(d._id)}
              className={cn(
                'inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                selected ? 'bg-surface-3 text-foreground' : 'text-muted-foreground hover:bg-surface-2',
              )}
            >
              <FileText className="size-3.5" aria-hidden />
              <span className="max-w-[180px] truncate">{d.name}</span>
              {!plain && citedDocs.has(d._id) && <span className="size-1.5 rounded-full bg-accent" aria-label="cited" />}
            </button>
          )
        })}
      </div>
      {doc?.transcribed && (
        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-accent-soft/40 px-4 py-1.5 text-[11.5px] text-muted-foreground">
          <ScanEye className="size-3.5 text-accent" aria-hidden />
          <span>
            <span className="font-medium text-foreground">Model transcription</span> by Muse Spark vision. Quotes are verified against
            this transcription, not the original image.
          </span>
          <button
            onClick={() => setShowOriginal((v) => !v)}
            className="ml-auto rounded-full px-2 py-0.5 font-medium text-accent outline-none hover:bg-accent-soft focus-visible:ring-2 focus-visible:ring-ring"
            aria-pressed={showOriginal}
          >
            {showOriginal ? 'Hide original' : 'Compare with original'}
          </button>
        </div>
      )}
      {activeEvidence && activeEvidence.documentId === doc?._id && !plain && (
        <p className="border-b border-border px-4 py-1.5 text-[11.5px] text-subtle-foreground">
          Highlighted: verified quote for this field
          {activeEvidence.paragraphIndex !== null && ` · paragraph ${activeEvidence.paragraphIndex + 1}`}
          {activeEvidence.pageNumber !== null && ` · page ${activeEvidence.pageNumber}`}
        </p>
      )}
      <div ref={scrollRef} className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6" tabIndex={0} aria-label={`Text of ${doc?.name}`}>
        {doc?.transcribed && showOriginal && (
          <div className="mx-auto mb-4 max-w-[68ch] space-y-2">
            {images === undefined && <div className="h-40 animate-pulse rounded-xl bg-surface-2" />}
            {images?.map((src, i) => (
              <img key={src} src={src} alt={`Original page ${i + 1} of ${doc.name}`} className="w-full rounded-xl border border-border" loading="lazy" />
            ))}
          </div>
        )}
        {doc && (
          <div className="mx-auto max-w-[68ch] space-y-3 text-[13.5px] leading-[1.7] text-muted-foreground">
            {doc.segments.map((s) => (
              <p key={s.index} className="whitespace-pre-wrap break-words">
                {s.pageNumber && doc.segments[s.index - 1]?.pageNumber !== s.pageNumber && (
                  <span className="mr-2 select-none font-mono text-[10px] text-subtle-foreground">p.{s.pageNumber}</span>
                )}
                {renderSegment(doc.text, s.start, s.end, marks, active, tone, onFocusEvidence)}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
