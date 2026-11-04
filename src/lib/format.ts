import type { FieldType } from '@shared/types'

export function formatValue(value: string | null, type: FieldType): string {
  if (value === null || value === '') return ''
  if (type === 'number') {
    const n = Number(value)
    return Number.isFinite(n) ? n.toLocaleString('en-US') : value
  }
  if (type === 'date') {
    const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (m) {
      const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]))
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })
    }
  }
  return value
}

export function relativeTime(at: number, now = Date.now()): string {
  const s = Math.round((now - at) / 1000)
  if (s < 45) return 'just now'
  const m = Math.round(s / 60)
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} h ago`
  return new Date(at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function formatBytes(n: number) {
  return n < 1024 ? `${n} B` : `${(n / 1024).toFixed(n < 10240 ? 1 : 0)} KB`
}
