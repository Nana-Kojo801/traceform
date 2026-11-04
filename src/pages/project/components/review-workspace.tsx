import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { FileStack, ListChecks, ScanSearch, Sparkles } from 'lucide-react'
import type { Id } from '@convex/_generated/dataModel'
import type { FormField } from '@shared/types'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { FieldList, type StatusFilter } from './field-list'
import { FieldDetail } from './field-detail'
import { SourceViewer } from './source-viewer'
import type { ActiveEvidence, DocumentRow, SchemaRow, Workspace } from './types'

type MobilePane = 'fields' | 'answer' | 'source'

interface Props {
  projectId: Id<'projects'>
  documents: DocumentRow[]
  schema: SchemaRow
  workspace: Workspace
  onGoTo: (tab: string) => void
}

export function ReviewWorkspace({ documents, schema, workspace, onGoTo }: Props) {
  const [params, setParams] = useSearchParams()
  const fields: FormField[] = useMemo(() => schema?.fields ?? [], [schema])
  const resultsByField = useMemo(() => new Map(workspace.results.map((r) => [r.fieldId, r])), [workspace.results])

  const [filter, setFilter] = useState<StatusFilter>('all')
  const [search, setSearch] = useState('')
  const [pane, setPane] = useState<MobilePane>('fields')
  const [active, setActive] = useState<ActiveEvidence | null>(null)
  const [viewDocId, setViewDocId] = useState<string | null>(null)

  const topRef = useRef<HTMLDivElement>(null)
  // On small screens, switching panes jumps back to the top of the workspace.
  const showPane = useCallback((next: MobilePane) => {
    setPane(next)
    if (window.innerWidth < 1024 && topRef.current) {
      const y = topRef.current.getBoundingClientRect().top + window.scrollY - 64
      if (window.scrollY > y) window.scrollTo({ top: y })
    }
  }, [])

  const fieldParam = params.get('field')
  const selectedId = fieldParam && fields.some((f) => f.id === fieldParam) ? fieldParam : (fields[0]?.id ?? null)
  const selectedField = fields.find((f) => f.id === selectedId) ?? null
  const selectedResult = selectedId ? resultsByField.get(selectedId) : undefined

  const focusEvidence = useCallback(
    (fieldId: string, index: number) => {
      const r = resultsByField.get(fieldId)
      const e = r?.raw.evidence[index]
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
      const firstVerified = r?.raw.evidence.findIndex((e) => e.sourceMatchVerified) ?? -1
      if (r && firstVerified >= 0) focusEvidence(id, firstVerified)
      else setActive(null)
      if (opts?.fromList) showPane('answer')
    },
    [setParams, resultsByField, focusEvidence, showPane],
  )

  // When the selected run or field changes from the URL, focus its first verified citation.
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

  if (!workspace.selected) {
    const running = workspace.latest?.status === 'running'
    return (
      <div className="flex flex-col items-center rounded-2xl border border-dashed border-border px-4 py-16 text-center">
        <ScanSearch className="size-7 text-subtle-foreground" aria-hidden />
        <p className="mt-3 text-sm font-medium">{running ? 'Extraction in progress' : 'Nothing to review yet'}</p>
        <p className="mt-1 max-w-md text-[13px] text-muted-foreground">
          {running
            ? 'Meta’s model is reading the sources. Each answer is verified against the source text before it appears here.'
            : 'Add source documents and a form, then run “Extract with Meta AI”.'}
        </p>
        {!running && (
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => onGoTo('sources')}>
              <FileStack /> Add sources
            </Button>
            <Button variant="secondary" size="sm" onClick={() => onGoTo('form')}>
              <ListChecks /> Build form
            </Button>
          </div>
        )}
      </div>
    )
  }

  const paneButton = (id: MobilePane, label: string) => (
    <button
      onClick={() => showPane(id)}
      className={cn(
        'h-8 flex-1 rounded-full text-[13px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring',
        pane === id ? 'bg-surface-3 text-foreground' : 'text-muted-foreground',
      )}
      aria-pressed={pane === id}
    >
      {label}
    </button>
  )

  return (
    <div ref={topRef}>
      <div className="mb-3 flex gap-0.5 rounded-full border border-border bg-surface p-0.5 lg:hidden" role="group" aria-label="Review panes">
        {paneButton('fields', 'Fields')}
        {paneButton('answer', 'Answer')}
        {paneButton('source', 'Source')}
      </div>

      <div className="grid gap-3 lg:h-[calc(100dvh-15.5rem)] lg:min-h-[560px] lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[330px_minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <section
          aria-label="Form fields"
          className={cn('min-h-0 lg:block', pane === 'fields' ? 'block' : 'hidden')}
        >
          <FieldList
            schema={schema}
            resultsByField={resultsByField}
            selectedId={selectedId}
            onSelect={(id) => selectField(id, { fromList: true })}
            filter={filter}
            onFilter={setFilter}
            search={search}
            onSearch={setSearch}
          />
        </section>

        <div className="min-h-0 lg:flex lg:flex-col lg:gap-3 xl:contents">
          <section
            aria-label="Selected answer"
            className={cn('min-h-0 lg:block lg:max-h-[55%] lg:shrink-0 xl:max-h-none', pane === 'answer' ? 'block' : 'hidden')}
          >
            {selectedField ? (
              <FieldDetail
                key={`${workspace.selected._id}:${selectedField.id}`}
                field={selectedField}
                result={selectedResult}
                documents={documents}
                active={active}
                onShowEvidence={(i) => {
                  focusEvidence(selectedField.id, i)
                  showPane('source')
                }}
                isPrecomputed={workspace.selected.isPrecomputed}
                sectionTitle={schema?.sections.find((s) => s.id === selectedField.sectionId)?.title ?? ''}
              />
            ) : (
              <div className="rounded-2xl border border-border bg-surface p-6 text-sm text-muted-foreground">Select a field.</div>
            )}
          </section>

          <section
            aria-label="Source documents"
            className={cn('min-h-0 lg:block lg:flex-1', pane === 'source' ? 'block' : 'hidden')}
          >
            <SourceViewer
              documents={documents}
              viewDocId={viewDocId}
              onViewDoc={setViewDocId}
              result={selectedResult}
              active={active && active.fieldId === selectedId ? active : null}
              onFocusEvidence={(i) => selectedId && focusEvidence(selectedId, i)}
            />
          </section>
        </div>
      </div>
      {workspace.selected.isPrecomputed && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-subtle-foreground">
          <Sparkles className="size-3.5" aria-hidden />
          These answers are a precomputed fixture. Use “Run live on sample documents” to have Meta’s model extract them for real.
        </p>
      )}
    </div>
  )
}
