import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useQuery } from 'convex/react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { motion } from 'motion/react'
import { snap, soft } from '@/lib/motion'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { Segmented } from '@/components/ui/segmented'
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
  active: ActiveEvidence | null
  onFocusEvidence?: (index: number) => void
  /** Plain preview: no citations. */
  plain?: boolean
  defaultMode?: SourceMode
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function shortName(name: string) {
  return name.replace(/\.(txt|docx|pdf|png|jpe?g|webp)$/i, '').replace(/[-_]+/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
}

/** Plain React text with highlighter marks (never HTML). */
function renderSegment(text: string, segStart: number, segEnd: number, marks: Mark[], active: ActiveEvidence | null, onFocus?: (i: number) => void) {
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
      <mark key={`${m.evidenceIndex}-${m.start}-${isActive ? active?.nonce : 'x'}`} className="trace-mark" data-active={isActive ? 'true' : undefined} onClick={() => onFocus?.(m.evidenceIndex)}>
        {text.slice(m.start, m.end)}
      </mark>,
    )
    if (m.endsHere)
      parts.push(
        <span key={`c-${m.evidenceIndex}-${m.start}`} className="cite ml-1 font-sans">
          {m.evidenceIndex + 1}
        </span>,
      )
    cursor = m.end
  }
  if (cursor < segEnd) parts.push(text.slice(cursor, segEnd))
  return parts
}

export function SourceViewer({ documents, viewDocId, onViewDoc, result, active, onFocusEvidence, plain, defaultMode = 'text' }: Props) {
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
  const pos = active ? verifiedIdx.indexOf(active.index) : -1

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
      <div className="card flex h-full min-h-[320px] items-center justify-center p-8">
        <p className="text-muted">No documents to show yet.</p>
      </div>
    )
  }

  const step = (dir: 1 | -1) => {
    if (!verifiedIdx.length || !onFocusEvidence) return
    onFocusEvidence(verifiedIdx[(pos + dir + verifiedIdx.length) % verifiedIdx.length])
  }

  return (
    <div className="flex h-full min-h-[480px] flex-col gap-3 lg:min-h-0">
      <div className="flex items-center gap-2">
        <div role="tablist" aria-label="Documents" className="scrollbar-thin flex min-w-0 flex-1 gap-1.5 overflow-x-auto">
          {parsed.map((d) => {
            const selected = d._id === doc?._id
            const nums = evidence.map((e, i) => (e.sourceMatchVerified && e.documentId === d._id ? i + 1 : 0)).filter(Boolean)
            return (
              <button
                key={d._id}
                role="tab"
                aria-selected={selected}
                onClick={() => onViewDoc(d._id)}
                title={d.name}
                className={cn(
                  'relative flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[13.5px] outline-none transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-ink active:scale-[0.97]',
                  selected ? 'font-semibold text-ink' : 'text-muted hover:text-ink',
                )}
              >
                {selected && <motion.span layoutId={`doc-pill-${plain ? 'p' : 'r'}`} transition={snap} className="absolute inset-0 rounded-full bg-card shadow-[0_1px_3px_rgb(0_0_0/0.08)]" aria-hidden />}
                <span className="relative flex items-center gap-1.5">
                  {nums.map((n) => (
                    <span key={n} className="cite" style={{ verticalAlign: 0 }}>
                      {n}
                    </span>
                  ))}
                  {shortName(d.name)}
                </span>
              </button>
            )
          })}
        </div>
        {!plain && verifiedIdx.length > 1 && (
          <div className="flex shrink-0 items-center gap-1.5">
            <button onClick={() => step(-1)} aria-label="Previous quote ([)" className="grid size-8 transition-transform active:scale-90 place-items-center rounded-full bg-card shadow-[0_1px_3px_rgb(0_0_0/0.08)] outline-none hover:bg-[#fafaf8] focus-visible:outline-2 focus-visible:outline-ink">
              <ChevronLeft className="size-4" strokeWidth={2.6} />
            </button>
            <button onClick={() => step(1)} aria-label="Next quote (])" className="grid size-8 transition-transform active:scale-90 place-items-center rounded-full bg-card shadow-[0_1px_3px_rgb(0_0_0/0.08)] outline-none hover:bg-[#fafaf8] focus-visible:outline-2 focus-visible:outline-ink">
              <ChevronRight className="size-4" strokeWidth={2.6} />
            </button>
          </div>
        )}
      </div>

      {doc?.transcribed && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <Segmented
            size="sm"
            label="View"
            value={effectiveMode}
            onChange={setMode}
            options={[
              { value: 'text', label: 'Text' },
              { value: 'side', label: 'Compare' },
              { value: 'original', label: 'Original' },
            ]}
          />
          <span className="text-[13px] text-muted">Read from {doc.kind === 'image' ? 'a photo' : 'a scan'} by Meta AI. Compare it before you rely on it.</span>
        </div>
      )}

      <div ref={scrollRef} className="scrollbar-thin min-h-0 flex-1 overflow-y-auto rounded-[16px]" tabIndex={0} aria-label={`Text of ${doc?.name}`}>
        <div className={cn(effectiveMode === 'side' && 'grid gap-3 xl:grid-cols-2')}>
          {doc?.transcribed && effectiveMode !== 'text' && (
            <div className="flex flex-col gap-3">
              {images === undefined && <div className="card h-80 animate-pulse" />}
              {images?.map((src, i) => (
                <img key={src} src={src} alt={`Original page ${i + 1} of ${doc.name}`} className="w-full rounded-[16px]" loading="lazy" />
              ))}
            </div>
          )}
          {(effectiveMode !== 'original' || !doc?.transcribed) && doc && (
            <motion.article
              key={doc._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={soft}
              className="card px-6 py-7 font-serif text-[16px] leading-[1.7] text-ink md:px-10 md:py-9"
            >
              <div className="space-y-4">
                {doc.segments.map((s) => {
                  const cited = marks.some((m) => m.end > s.start && m.start < s.end)
                  return (
                    <p key={s.index} className={cn('whitespace-pre-wrap break-words transition-colors duration-500', !plain && marks.length > 0 && !cited && 'text-[#8a8a8e]')}>
                      {renderSegment(doc.text, s.start, s.end, marks, active, onFocusEvidence)}
                    </p>
                  )
                })}
              </div>
            </motion.article>
          )}
        </div>
      </div>
    </div>
  )
}
