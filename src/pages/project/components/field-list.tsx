import { useEffect, useRef, type KeyboardEvent, type RefObject } from 'react'
import type { FieldStatus, FormField } from '@shared/types'
import { StatusIcon } from '@/components/status-badge'
import { SearchField } from '@/components/ui/input'
import { Segmented } from '@/components/ui/segmented'
import { formatValue } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { FieldResultRow, SchemaRow } from './types'

export type StatusFilter = 'open' | 'all'

export function matchesFilter(r: FieldResultRow | undefined, filter: StatusFilter) {
  if (filter === 'all') return true
  return !r || r.current.state === 'unreviewed'
}

export function previewValue(field: FormField, r: FieldResultRow | undefined): { text: string; muted: boolean } {
  if (!r) return { text: 'Not in this run', muted: true }
  if (r.current.state === 'cleared') return { text: 'Cleared', muted: true }
  if (r.current.value) return { text: formatValue(r.current.value, field.type), muted: false }
  if (r.raw.status === 'conflicting') {
    const vals = [...new Set(r.raw.evidence.map((e) => e.claimedValue).filter(Boolean) as string[])]
    return { text: vals.map((v) => formatValue(v, field.type)).join(' or '), muted: false }
  }
  if (r.raw.status === 'missing') return { text: 'Not in any source', muted: true }
  return { text: 'No verified value', muted: true }
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
  searchRef: RefObject<HTMLInputElement | null>
}

export function FieldList({ schema, resultsByField, visibleIds, selectedId, onSelect, filter, onFilter, search, onSearch, searchRef }: Props) {
  const listRef = useRef<HTMLDivElement>(null)
  const fields = schema?.fields ?? []
  const sections = schema?.sections ?? []
  const visible = new Set(visibleIds)
  const results = fields.map((f) => resultsByField.get(f.id))
  const done = results.filter((r) => r && r.current.state !== 'unreviewed').length
  const open = fields.length - done
  const pct = fields.length ? (done / fields.length) * 100 : 0

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
    <div className="flex h-full min-h-0 flex-col gap-3.5">
      <div className="flex flex-col gap-2">
        <div className="flex justify-between text-[13px] text-muted">
          <span>
            {open > 0 ? (
              <>
                <b className="font-semibold text-ink">{open}</b> to review
              </>
            ) : (
              <b className="font-semibold text-ok-text">All reviewed</b>
            )}
          </span>
          <span>
            {done} of {fields.length} done
          </span>
        </div>
        <div className="h-1 rounded-full bg-fill" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label="Review progress">
          <div className="h-1 rounded-full bg-ink transition-[width] duration-500" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="flex gap-2">
        <SearchField ref={searchRef} value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Search" aria-label="Search fields" wrapClassName="flex-1 min-w-0" />
        <Segmented
          size="sm"
          label="Show"
          value={filter}
          onChange={onFilter}
          className="h-10 items-center"
          options={[
            { value: 'open', label: 'To review' },
            { value: 'all', label: 'All' },
          ]}
        />
      </div>

      <div ref={listRef} className="scrollbar-thin -mx-1 min-h-0 flex-1 overflow-y-auto px-1 pb-2" onKeyDown={onKeyDown} role="listbox" aria-label="Fields">
        {visibleIds.length === 0 && (
          <div className="card px-4 py-8 text-center">
            <p className="font-semibold">{filter === 'open' && !search ? 'All done' : 'No matches'}</p>
            <button onClick={() => onFilter('all')} className="mt-1 text-[14px] text-muted underline underline-offset-4 hover:text-ink">
              Show all fields
            </button>
          </div>
        )}
        <div className="flex flex-col gap-4">
          {sections.map((s) => {
            const inSection = fields.filter((f) => f.sectionId === s.id && visible.has(f.id))
            if (inSection.length === 0) return null
            return (
              <div key={s.id}>
                <p className="px-4 pb-1.5 text-[13px] text-muted">{s.title}</p>
                <div className="card overflow-hidden">
                  {inSection.map((f, i) => {
                    const r = resultsByField.get(f.id)
                    const preview = previewValue(f, r)
                    const selected = f.id === selectedId
                    const unreviewed = !r || r.current.state === 'unreviewed'
                    return (
                      <button
                        key={f.id}
                        data-field-id={f.id}
                        role="option"
                        aria-selected={selected}
                        tabIndex={selected || (!selectedId && f.id === visibleIds[0]) ? 0 : -1}
                        onClick={() => onSelect(f.id)}
                        className={cn(
                          'relative flex w-full items-center gap-3 py-[11px] pl-4 pr-3.5 text-left outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink',
                          selected ? 'bg-ink text-white' : 'hover:bg-[#fafaf8]',
                          i > 0 && !selected && 'before:absolute before:left-4 before:right-0 before:top-0 before:h-px before:bg-line-soft',
                        )}
                      >
                        <span className="min-w-0 flex-1">
                          <span className={cn('flex items-center gap-1.5 truncate text-[15px]', selected && 'font-semibold')}>
                            {unreviewed && filter === 'all' && <span className={cn('size-[7px] shrink-0 rounded-full', selected ? 'bg-hl' : 'bg-ink')} aria-label="To review" />}
                            {f.label}
                          </span>
                          <span className={cn('block truncate text-[13px]', selected ? 'text-white/75' : preview.muted ? 'text-faint' : 'text-muted')}>{preview.text}</span>
                        </span>
                        {r && <StatusIcon status={r.raw.status as FieldStatus} inverted={selected} />}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
