import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useMutation } from 'convex/react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@convex/_generated/api'
import type { FormField } from '@shared/types'
import { Button } from '@/components/ui/button'
import { errorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'
import { FieldList, matchesFilter, type StatusFilter } from './field-list'
import { FieldDetail } from './field-detail'
import { SourceViewer } from './source-viewer'
import { TraceConnector } from './trace-connector'
import { useResolve } from './conflict-compare'
import { isTypingTarget } from './keyboard'
import type { ActiveEvidence, DocumentRow, SchemaRow, Workspace } from './types'

type MobilePane = 'fields' | 'answer' | 'source'

interface Props {
  documents: DocumentRow[]
  schema: SchemaRow
  workspace: Workspace
  onGoTo: (tab: string) => void
}

export function ReviewWorkspace({ documents, schema, workspace, onGoTo }: Props) {
  const [params, setParams] = useSearchParams()
  const fields: FormField[] = useMemo(() => schema?.fields ?? [], [schema])
  const resultsByField = useMemo(() => new Map(workspace.results.map((r) => [r.fieldId, r])), [workspace.results])
  const approve = useMutation(api.review.approve)

  const hasOpen = workspace.results.some((r) => r.current.state === 'unreviewed')
  const [filter, setFilter] = useState<StatusFilter>(hasOpen ? 'open' : 'all')
  const [search, setSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const [pane, setPane] = useState<MobilePane>('fields')
  const [active, setActive] = useState<ActiveEvidence | null>(null)
  const [viewDocId, setViewDocId] = useState<string | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  const q = search.trim().toLowerCase()
  const visibleIds = useMemo(
    () =>
      fields
        .filter((f) => {
          const r = resultsByField.get(f.id)
          if (!matchesFilter(r, filter)) return false
          return !q || f.label.toLowerCase().includes(q) || (r?.current.value ?? '').toLowerCase().includes(q)
        })
        .map((f) => f.id),
    [fields, resultsByField, filter, q],
  )

  const fieldParam = params.get('field')
  const selectedId = fieldParam && fields.some((f) => f.id === fieldParam) ? fieldParam : (visibleIds[0] ?? fields[0]?.id ?? null)
  const selectedField = fields.find((f) => f.id === selectedId) ?? null
  const selectedResult = selectedId ? resultsByField.get(selectedId) : undefined
  const resolve = useResolve(selectedResult, selectedField ?? fields[0])

  const showPane = useCallback((next: MobilePane) => {
    setPane(next)
    if (window.innerWidth < 1024) window.scrollTo({ top: 0 })
  }, [])

  const focusEvidence = useCallback(
    (fieldId: string, index: number) => {
      const e = resultsByField.get(fieldId)?.raw.evidence[index]
      if (!e) return
      setViewDocId(e.documentId)
      setActive((prev) => ({ fieldId, index, nonce: (prev?.nonce ?? 0) + 1 }))
    },
    [resultsByField],
  )

  const selectField = useCallback(
    (id: string, opts?: { fromList?: boolean }) => {
      setParams(
        (p) => {
          p.set('field', id)
          return p
        },
        { replace: true },
      )
      const r = resultsByField.get(id)
      const first = r?.raw.evidence.findIndex((e) => e.sourceMatchVerified) ?? -1
      if (r && first >= 0) focusEvidence(id, first)
      else setActive(null)
      if (opts?.fromList) showPane('answer')
    },
    [setParams, resultsByField, focusEvidence, showPane],
  )

  // Focus the first verified citation when the selection or run changes.
  useEffect(() => {
    if (!selectedId) return
    const r = resultsByField.get(selectedId)
    const idx = r?.raw.evidence.findIndex((e) => e.sourceMatchVerified) ?? -1
    if (r && idx >= 0) {
      setViewDocId(r.raw.evidence[idx].documentId)
      setActive((prev) => (prev?.fieldId === selectedId ? prev : { fieldId: selectedId, index: idx, nonce: (prev?.nonce ?? 0) + 1 }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, workspace.selected?._id])

  const move = useCallback(
    (dir: 1 | -1) => {
      const ids = visibleIds.length ? visibleIds : fields.map((f) => f.id)
      if (!ids.length) return
      const cur = selectedId ? ids.indexOf(selectedId) : -1
      const next = ids[Math.min(ids.length - 1, Math.max(0, cur + dir))]
      if (next) selectField(next)
    },
    [visibleIds, fields, selectedId, selectField],
  )

  const approveSelected = useCallback(async () => {
    if (!selectedResult) return
    if (selectedResult.current.value === null || selectedResult.current.value === '') {
      toast.error(selectedResult.raw.status === 'conflicting' ? 'Pick a side first (1 or 2).' : 'There is no value to approve.')
      return
    }
    try {
      await approve({ resultId: selectedResult._id })
      toast.success(`Approved: ${selectedField?.label}`)
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }, [approve, selectedResult, selectedField])

  // Keyboard shortcuts for review. Never fire while typing.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return
      const r = selectedResult
      switch (e.key) {
        case 'ArrowDown':
        case 'j':
          if ((e.target as HTMLElement)?.closest?.('[role="listbox"]')) return
          e.preventDefault()
          move(1)
          break
        case 'ArrowUp':
        case 'k':
          if ((e.target as HTMLElement)?.closest?.('[role="listbox"]')) return
          e.preventDefault()
          move(-1)
          break
        case 'a':
        case 'A':
          e.preventDefault()
          approveSelected()
          break
        case 'e':
        case 'E':
          if (!selectedId) return
          e.preventDefault()
          showPane('answer')
          requestAnimationFrame(() => document.getElementById(`value-${selectedId}`)?.focus())
          break
        case '1':
        case '2':
          if (r?.raw.status === 'conflicting') {
            e.preventDefault()
            resolve(Number(e.key) - 1)
          }
          break
        case '[':
        case ']': {
          if (!r || !selectedId) return
          const ids = r.raw.evidence.map((ev, i) => (ev.sourceMatchVerified ? i : -1)).filter((i) => i >= 0)
          if (!ids.length) return
          e.preventDefault()
          const pos = active ? ids.indexOf(active.index) : -1
          focusEvidence(selectedId, ids[(pos + (e.key === ']' ? 1 : -1) + ids.length) % ids.length])
          break
        }
        case '/':
          e.preventDefault()
          setSearchOpen(true)
          requestAnimationFrame(() => searchRef.current?.focus())
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [move, approveSelected, resolve, focusEvidence, selectedResult, selectedId, active, showPane])

  if (!workspace.selected) {
    const running = workspace.latest?.status === 'running'
    return (
      <div className="mx-auto max-w-xl px-6 py-20">
        <p className="cap">{running ? 'In progress' : 'Review'}</p>
        <h2 className="mt-2 border-b border-ink pb-3 text-[28px] font-semibold tracking-[-0.035em]">{running ? <span className="working">Reading the sources</span> : 'Nothing to review yet'}</h2>
        <p className="mt-4 font-serif text-[17px] leading-relaxed text-ink-2">
          {running
            ? 'Meta’s model is extracting answers. Each one is checked against the source text by code before it appears here.'
            : 'Add source documents and a form, then run extraction. Every answer will come back with its footnote.'}
        </p>
        {!running && (
          <div className="mt-6 flex flex-wrap gap-2.5">
            <Button variant="ink" onClick={() => onGoTo('sources')}>
              Add sources
            </Button>
            <Button onClick={() => onGoTo('form')}>Build the form</Button>
          </div>
        )}
      </div>
    )
  }

  const fieldIndex = selectedField ? fields.indexOf(selectedField) + 1 : 0

  return (
    <div className="flex h-full flex-col">
      <div role="tablist" aria-label="Review panes" className="flex gap-6 border-b border-line px-4 lg:hidden">
        {(
          [
            ['fields', 'Fields'],
            ['answer', 'Answer'],
            ['source', 'Source'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={pane === id}
            onClick={() => showPane(id)}
            className={cn('h-11 border-b-2 text-sm font-medium', pane === id ? 'border-ink text-ink' : 'border-transparent text-muted')}
          >
            {label}
          </button>
        ))}
      </div>

      <div
        ref={gridRef}
        className="relative grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)_minmax(0,1.05fr)]"
      >
        <section aria-label="Form fields" className={cn('min-h-0 min-w-0 border-line lg:block lg:border-r', pane === 'fields' ? 'block' : 'hidden')}>
          <FieldList
            schema={schema}
            resultsByField={resultsByField}
            visibleIds={visibleIds}
            selectedId={selectedId}
            onSelect={(id) => selectField(id, { fromList: true })}
            filter={filter}
            onFilter={setFilter}
            search={search}
            onSearch={setSearch}
            searchOpen={searchOpen}
            onSearchOpen={setSearchOpen}
            searchRef={searchRef}
          />
        </section>

        <TraceConnector containerRef={gridRef} trigger={`${selectedId}:${active?.nonce ?? 0}:${workspace.selected._id}`} />

        <div className="min-h-0 min-w-0 lg:flex lg:flex-col xl:contents">
          <section
            aria-label="Selected answer"
            className={cn('scrollbar-thin min-h-0 min-w-0 lg:block lg:flex-1 lg:overflow-y-auto lg:border-b lg:border-line xl:border-b-0 xl:border-r', pane === 'answer' ? 'block' : 'hidden')}
          >
            {selectedField ? (
              <FieldDetail
                key={`${workspace.selected._id}:${selectedField.id}`}
                field={selectedField}
                index={fieldIndex}
                sectionTitle={schema?.sections.find((s) => s.id === selectedField.sectionId)?.title ?? ''}
                result={selectedResult}
                documents={documents}
                active={active}
                onShowEvidence={(i) => {
                  focusEvidence(selectedField.id, i)
                  showPane('source')
                }}
                isPrecomputed={workspace.selected.isPrecomputed}
              />
            ) : (
              <p className="p-8 text-muted">Select a field.</p>
            )}
          </section>

          <section aria-label="Source documents" className={cn('min-h-0 min-w-0 lg:block lg:h-[46%] lg:shrink-0 xl:h-auto', pane === 'source' ? 'block' : 'hidden')}>
            <SourceViewer
              documents={documents}
              viewDocId={viewDocId}
              onViewDoc={setViewDocId}
              result={selectedResult}
              fieldLabel={selectedField?.label}
              active={active && active.fieldId === selectedId ? active : null}
              onFocusEvidence={(i) => selectedId && focusEvidence(selectedId, i)}
            />
          </section>
        </div>
      </div>

      {/* Mobile: one-handed review bar */}
      {pane !== 'fields' && selectedResult && (
        <div className="sticky bottom-0 z-20 flex gap-2 border-t border-line bg-white px-4 pb-6 pt-3 lg:hidden">
          <Button variant="soft" size="icon-lg" aria-label="Previous field" onClick={() => move(-1)}>
            <ChevronLeft strokeWidth={2.75} />
          </Button>
          <Button variant="ink" size="lg" className="flex-1" onClick={approveSelected} disabled={selectedResult.current.state === 'approved'}>
            {selectedResult.current.state === 'approved' ? '✓ Approved' : 'Approve'}
          </Button>
          <Button variant="soft" size="icon-lg" aria-label="Next field" onClick={() => move(1)}>
            <ChevronRight strokeWidth={2.75} />
          </Button>
        </div>
      )}
    </div>
  )
}
