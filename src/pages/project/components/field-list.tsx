import { useRef, type KeyboardEvent } from 'react'
import { Search, Wrench } from 'lucide-react'
import type { FieldStatus, FormField } from '@shared/types'
import { Input } from '@/components/ui/input'
import { ReviewBadge, StatusBadge } from '@/components/status-badge'
import { formatValue } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { FieldResultRow, SchemaRow } from './types'

export type StatusFilter = 'all' | 'attention' | FieldStatus | 'unreviewed'

const FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'attention', label: 'Needs attention' },
  { id: 'unreviewed', label: 'Unreviewed' },
  { id: 'supported', label: 'Supported' },
  { id: 'conflicting', label: 'Conflict' },
  { id: 'missing', label: 'Missing' },
  { id: 'needs_review', label: 'Needs review' },
]

function matchesFilter(r: FieldResultRow | undefined, filter: StatusFilter) {
  if (filter === 'all') return true
  if (!r) return filter === 'attention'
  if (filter === 'unreviewed') return r.current.state === 'unreviewed'
  if (filter === 'attention')
    return (r.raw.status === 'needs_review' || r.raw.status === 'conflicting') && r.current.state === 'unreviewed'
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
  if (r.raw.status === 'missing') return { text: 'Blank: not documented', muted: true }
  return { text: 'No verified value', muted: true }
}

interface Props {
  schema: SchemaRow
  resultsByField: Map<string, FieldResultRow>
  selectedId: string | null
  onSelect: (id: string) => void
  filter: StatusFilter
  onFilter: (f: StatusFilter) => void
  search: string
  onSearch: (s: string) => void
}

export function FieldList({ schema, resultsByField, selectedId, onSelect, filter, onFilter, search, onSearch }: Props) {
  const listRef = useRef<HTMLDivElement>(null)
  const fields = schema?.fields ?? []
  const sections = schema?.sections ?? []
  const q = search.trim().toLowerCase()

  const visible = fields.filter((f) => {
    const r = resultsByField.get(f.id)
    if (!matchesFilter(r, filter)) return false
    if (!q) return true
    return f.label.toLowerCase().includes(q) || (r?.current.value ?? '').toLowerCase().includes(q)
  })
  const reviewed = fields.filter((f) => {
    const s = resultsByField.get(f.id)?.current.state
    return s && s !== 'unreviewed'
  }).length
  const pct = fields.length ? Math.round((reviewed / fields.length) * 100) : 0

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return
    e.preventDefault()
    const ids = visible.map((f) => f.id)
    if (ids.length === 0) return
    const cur = selectedId ? ids.indexOf(selectedId) : -1
    const next =
      e.key === 'Home' ? 0 : e.key === 'End' ? ids.length - 1 : e.key === 'ArrowDown' ? Math.min(ids.length - 1, cur + 1) : Math.max(0, cur - 1)
    onSelect(ids[next])
    requestAnimationFrame(() => {
      listRef.current?.querySelector<HTMLButtonElement>(`[data-field-id="${ids[next]}"]`)?.focus()
    })
  }

  return (
    <div className="flex h-full min-h-0 flex-col rounded-2xl border border-border bg-surface">
      <div className="space-y-2.5 border-b border-border p-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium">Review progress</span>
          <span className="text-muted-foreground">
            {reviewed} of {fields.length} reviewed
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-3" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Review progress">
          <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${pct}%` }} />
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-subtle-foreground" aria-hidden />
          <Input value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Search fields or values" className="h-8 rounded-full pl-8 text-[13px]" aria-label="Search fields" />
        </div>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Filter by status">
          {FILTERS.map((f) => {
            const count = fields.filter((fld) => matchesFilter(resultsByField.get(fld.id), f.id)).length
            return (
              <button
                key={f.id}
                onClick={() => onFilter(f.id)}
                aria-pressed={filter === f.id}
                className={cn(
                  'h-6 rounded-full px-2 text-[11.5px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                  filter === f.id ? 'bg-accent-soft text-accent' : 'text-muted-foreground hover:bg-surface-2 hover:text-foreground',
                )}
              >
                {f.label} <span className="opacity-60">{count}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div ref={listRef} className="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-1.5" onKeyDown={onKeyDown} role="listbox" aria-label="Fields" aria-activedescendant={selectedId ? `field-${selectedId}` : undefined}>
        {visible.length === 0 && <p className="px-3 py-8 text-center text-[13px] text-muted-foreground">No fields match.</p>}
        {sections.map((s) => {
          const inSection = visible.filter((f) => f.sectionId === s.id)
          if (inSection.length === 0) return null
          return (
            <div key={s.id} className="mb-1.5">
              <p className="px-2.5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground">{s.title}</p>
              {inSection.map((f) => {
                const r = resultsByField.get(f.id)
                const preview = previewValue(f, r)
                const selected = f.id === selectedId
                return (
                  <button
                    key={f.id}
                    id={`field-${f.id}`}
                    data-field-id={f.id}
                    role="option"
                    aria-selected={selected}
                    tabIndex={selected || (!selectedId && f === visible[0]) ? 0 : -1}
                    onClick={() => onSelect(f.id)}
                    className={cn(
                      'group relative flex w-full flex-col gap-1 rounded-xl px-2.5 py-2 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                      selected ? 'bg-surface-3' : 'hover:bg-surface-2',
                    )}
                  >
                    {selected && <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-accent" aria-hidden />}
                    <span className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
                        {f.label}
                        {f.required && <span className="ml-0.5 text-subtle-foreground" aria-label="required">*</span>}
                      </span>
                      {r?.raw.repair?.outcome === 'fixed' && (
                        <Wrench className="size-3.5 text-accent" aria-label="Fixed on second pass" />
                      )}
                      {r && <StatusBadge status={r.raw.status} />}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className={cn('min-w-0 flex-1 truncate text-xs', preview.muted ? 'italic text-subtle-foreground' : 'text-muted-foreground')}>
                        {preview.text}
                      </span>
                      {r && <ReviewBadge state={r.current.state} />}
                    </span>
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
