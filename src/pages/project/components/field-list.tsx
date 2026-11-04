import { useEffect, useRef, type KeyboardEvent, type RefObject } from 'react'
import { Search, X } from 'lucide-react'
import type { FieldStatus, FormField } from '@shared/types'
import { STATUS_META } from '@/components/status-badge'
import { Kbd } from '@/components/ui/button'
import { formatValue } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { FieldResultRow, SchemaRow } from './types'

export type StatusFilter = 'open' | 'all' | FieldStatus

export const FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'open', label: 'Open' },
  { id: 'all', label: 'All' },
  { id: 'supported', label: 'Supported' },
  { id: 'conflicting', label: 'Conflict' },
  { id: 'missing', label: 'Blank' },
  { id: 'needs_review', label: 'Needs review' },
]

export function matchesFilter(r: FieldResultRow | undefined, filter: StatusFilter) {
  if (filter === 'all') return true
  if (!r) return filter === 'open'
  if (filter === 'open') return r.current.state === 'unreviewed'
  return r.raw.status === filter
}

export function previewValue(field: FormField, r: FieldResultRow | undefined): { text: string; muted: boolean } {
  if (!r) return { text: 'Not in this run', muted: true }
  if (r.current.state === 'cleared') return { text: 'Cleared by reviewer', muted: true }
  if (r.current.value) return { text: formatValue(r.current.value, field.type), muted: false }
  if (r.raw.status === 'conflicting') {
    const vals = [...new Set(r.raw.evidence.map((e) => e.claimedValue).filter(Boolean) as string[])]
    return { text: vals.map((v) => formatValue(v, field.type)).join(' vs '), muted: false }
  }
  if (r.raw.status === 'missing') return { text: 'Not stated in any source', muted: true }
  return { text: 'No verified value', muted: true }
}

const SELECTED_MARK: Record<FieldStatus, string> = {
  supported: 'text-[#86efac]',
  conflicting: 'text-[#fdba74]',
  missing: 'text-[#c4c5ca]',
  needs_review: 'text-[#fca5a5]',
}

interface Props {
  schema: SchemaRow
  resultsByField: Map<string, FieldResultRow>
  visibleIds: string[]
  selectedId: string | null
  onSelect: (id: string) => void
  filter: StatusFilter
  onFilter: (f: StatusFilter) => void
  search: string
  onSearch: (s: string) => void
  searchOpen: boolean
  onSearchOpen: (open: boolean) => void
  searchRef: RefObject<HTMLInputElement | null>
}

export function FieldList(props: Props) {
  const { schema, resultsByField, visibleIds, selectedId, onSelect, filter, onFilter, search, onSearch, searchOpen, onSearchOpen, searchRef } = props
  const listRef = useRef<HTMLDivElement>(null)
  const fields = schema?.fields ?? []
  const sections = schema?.sections ?? []
  const index = new Map(fields.map((f, i) => [f.id, i + 1]))
  const visible = new Set(visibleIds)

  const results = fields.map((f) => resultsByField.get(f.id))
  const reviewed = results.filter((r) => r && r.current.state !== 'unreviewed').length

  // Keep the selected row in view.
  useEffect(() => {
    if (!selectedId) return
    listRef.current?.querySelector<HTMLElement>(`[data-field-id="${selectedId}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [selectedId])

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return
    e.preventDefault()
    if (visibleIds.length === 0) return
    const cur = selectedId ? visibleIds.indexOf(selectedId) : -1
    const next =
      e.key === 'Home' ? 0 : e.key === 'End' ? visibleIds.length - 1 : e.key === 'ArrowDown' ? Math.min(visibleIds.length - 1, cur + 1) : Math.max(0, cur - 1)
    onSelect(visibleIds[next])
    requestAnimationFrame(() => listRef.current?.querySelector<HTMLButtonElement>(`[data-field-id="${visibleIds[next]}"]`)?.focus())
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-col gap-3 border-b border-line px-4 pb-3.5 pt-[18px]">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold tracking-[-0.01em]">Fields</h2>
          <span className="flex items-center gap-2 font-mono text-xs text-ink-2">
            {reviewed} / {fields.length} reviewed
            {!searchOpen && (
              <button aria-label="Search fields" onClick={() => onSearchOpen(true)} className="grid size-7 place-items-center rounded-[6px] text-ink-2 hover:bg-wash">
                <Search className="size-[15px]" />
              </button>
            )}
          </span>
        </div>
        {/* One cell per field: ink = reviewed, outline = open, highlighter = selected. */}
        <div className="grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${Math.max(1, fields.length)}, minmax(0, 1fr))` }}>
          {fields.map((f, i) => {
            const r = results[i]
            const done = r && r.current.state !== 'unreviewed'
            return (
              <button
                key={f.id}
                tabIndex={-1}
                aria-label={`${f.label}${done ? ', reviewed' : ', open'}`}
                onClick={() => onSelect(f.id)}
                className={cn(
                  'h-1.5 cursor-pointer',
                  f.id === selectedId ? 'bg-hl shadow-[inset_0_0_0_1px_var(--ink)]' : done ? 'bg-ink' : 'shadow-[inset_0_0_0_1px_#c4c5ca]',
                )}
              />
            )
          })}
        </div>
        {searchOpen ? (
          <label className="flex h-[30px] items-center gap-2 border-b border-ink">
            <Search className="size-3.5 text-muted" aria-hidden />
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  onSearch('')
                  onSearchOpen(false)
                }
              }}
              placeholder="Search fields or values"
              aria-label="Search fields"
              className="min-w-0 flex-1 border-0 bg-transparent text-[13px] outline-none"
            />
            <button
              aria-label="Close search"
              onClick={() => {
                onSearch('')
                onSearchOpen(false)
              }}
              className="grid size-6 place-items-center rounded-[6px] hover:bg-wash"
            >
              <X className="size-3.5" />
            </button>
          </label>
        ) : (
          <div role="group" aria-label="Filter fields" className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px]">
            {FILTERS.map((f) => {
              const count = fields.filter((fld) => matchesFilter(resultsByField.get(fld.id), f.id)).length
              if (count === 0 && f.id !== 'open' && f.id !== 'all') return null
              const on = filter === f.id
              return (
                <button
                  key={f.id}
                  onClick={() => onFilter(f.id)}
                  aria-pressed={on}
                  className={cn(
                    'rounded-[6px] outline-none focus-visible:outline-2 focus-visible:outline-ink',
                    on ? 'font-semibold text-ink underline decoration-2 underline-offset-[6px]' : 'text-muted hover:text-ink',
                  )}
                >
                  {f.label} {count}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div
        ref={listRef}
        className="scrollbar-thin min-h-0 flex-1 overflow-y-auto"
        onKeyDown={onKeyDown}
        role="listbox"
        aria-label="Fields"
        aria-activedescendant={selectedId ? `field-${selectedId}` : undefined}
      >
        {visibleIds.length === 0 && (
          <div className="px-4 py-10">
            <p className="text-[13.5px] font-medium">{filter === 'open' && !search ? 'All fields reviewed.' : 'No fields match.'}</p>
            {filter !== 'all' && (
              <button onClick={() => onFilter('all')} className="mt-1 text-[13px] text-muted underline underline-offset-4 hover:text-ink">
                Show all fields
              </button>
            )}
          </div>
        )}
        {sections.map((s) => {
          const inSection = fields.filter((f) => f.sectionId === s.id && visible.has(f.id))
          if (inSection.length === 0) return null
          return (
            <div key={s.id}>
              <p className="cap px-4 pb-1.5 pt-4">{s.title}</p>
              {inSection.map((f) => {
                const r = resultsByField.get(f.id)
                const preview = previewValue(f, r)
                const selected = f.id === selectedId
                const meta = r ? STATUS_META[r.raw.status] : null
                const mono = f.type === 'number' || f.type === 'date' || /@/.test(preview.text)
                return (
                  <button
                    key={f.id}
                    id={`field-${f.id}`}
                    data-field-id={f.id}
                    role="option"
                    aria-selected={selected}
                    tabIndex={selected || (!selectedId && f.id === visibleIds[0]) ? 0 : -1}
                    onClick={() => onSelect(f.id)}
                    className={cn(
                      'grid w-full grid-cols-[26px_minmax(0,1fr)_auto] items-baseline gap-x-2.5 gap-y-1 border-b px-4 py-[11px] text-left outline-none focus-visible:outline-2 focus-visible:-outline-offset-2',
                      selected ? 'border-ink bg-ink text-white focus-visible:outline-hl' : 'border-line-soft hover:bg-wash focus-visible:outline-ink',
                    )}
                  >
                    <span className={cn('font-mono text-[11px]', selected ? 'text-faint' : 'text-faint')}>{String(index.get(f.id)).padStart(2, '0')}</span>
                    <span className={cn('truncate text-[13.5px]', selected ? 'font-semibold' : 'font-medium')}>
                      {f.label}
                      {f.required && (
                        <span className="text-faint" aria-label="required">
                          {' '}
                          *
                        </span>
                      )}
                    </span>
                    <span className="flex items-center gap-2">
                      {r && r.current.state !== 'unreviewed' && (
                        <span className={cn('font-mono text-[10.5px] uppercase', selected ? 'text-white' : 'text-ink')} title={`Reviewed: ${r.current.state}`}>
                          ■
                        </span>
                      )}
                      {meta && (
                        <span className={cn('font-mono text-[11px] font-medium uppercase', selected ? SELECTED_MARK[r!.raw.status] : meta.color)}>
                          {meta.glyph} {r!.raw.repair?.outcome === 'fixed' ? '↻' : meta.short}
                        </span>
                      )}
                    </span>
                    <span />
                    <span
                      className={cn(
                        'col-span-2 truncate text-[12.5px]',
                        mono && 'font-mono text-[12px]',
                        preview.muted ? (selected ? 'text-faint' : 'text-faint') : selected ? 'text-[#c4c5ca]' : 'text-muted',
                      )}
                    >
                      {preview.text}
                    </span>
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>
      <div className="hidden flex-wrap gap-x-3.5 gap-y-1 border-t border-line px-4 py-2.5 font-mono text-[11px] text-muted lg:flex">
        <span>
          <Kbd>↑</Kbd> <Kbd>↓</Kbd> move
        </span>
        <span>
          <Kbd>A</Kbd> approve
        </span>
        <span>
          <Kbd>E</Kbd> edit
        </span>
        <span>
          <Kbd>/</Kbd> search
        </span>
      </div>
    </div>
  )
}
