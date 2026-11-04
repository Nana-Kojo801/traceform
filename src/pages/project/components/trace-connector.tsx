import { useEffect, useRef, useState, type RefObject } from 'react'

interface Geometry {
  d: string
  x1: number
  y1: number
  x2: number
  y2: number
}

function visibleWithin(el: HTMLElement, scroller: HTMLElement | null) {
  const r = el.getBoundingClientRect()
  if (!scroller) return true
  const s = scroller.getBoundingClientRect()
  const mid = r.top + r.height / 2
  return mid >= s.top && mid <= s.bottom
}

function scrollParent(el: HTMLElement | null): HTMLElement | null {
  let p = el?.parentElement ?? null
  while (p) {
    const o = getComputedStyle(p).overflowY
    if (o === 'auto' || o === 'scroll') return p
    p = p.parentElement
  }
  return null
}

/**
 * Desktop-only line from the focused evidence card (answer pane) to the
 * highlighted passage (source pane). Purely decorative; hidden from AT.
 */
export function TraceConnector({ containerRef, trigger }: { containerRef: RefObject<HTMLDivElement | null>; trigger: unknown }) {
  const [geo, setGeo] = useState<Geometry | null>(null)
  const [drawKey, setDrawKey] = useState(0)
  const frame = useRef(0)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const wide = window.matchMedia('(min-width: 1280px)')

    const measure = () => {
      if (!wide.matches) return setGeo(null)
      const card = container.querySelector<HTMLElement>('[data-trace-source="true"]')
      const mark = container.querySelector<HTMLElement>('mark[data-active="true"]')
      if (!card || !mark || !visibleWithin(card, scrollParent(card)) || !visibleWithin(mark, scrollParent(mark))) {
        return setGeo(null)
      }
      const c = container.getBoundingClientRect()
      const a = card.getBoundingClientRect()
      const b = mark.getClientRects()[0] ?? mark.getBoundingClientRect()
      if (b.left <= a.right) return setGeo(null)
      const x1 = a.right - c.left
      const y1 = a.top + a.height / 2 - c.top
      const x2 = b.left - c.left - 4
      const y2 = b.top + b.height / 2 - c.top
      const dx = Math.max(40, (x2 - x1) / 2)
      setGeo({ d: `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`, x1, y1, x2, y2 })
    }

    // Track for a short while so the line follows the smooth scroll animation.
    const start = performance.now()
    const loop = () => {
      measure()
      if (performance.now() - start < 900) frame.current = requestAnimationFrame(loop)
    }
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(loop)
    setDrawKey((k) => k + 1)

    const onChange = () => measure()
    container.addEventListener('scroll', onChange, true)
    window.addEventListener('resize', onChange)
    return () => {
      cancelAnimationFrame(frame.current)
      container.removeEventListener('scroll', onChange, true)
      window.removeEventListener('resize', onChange)
    }
  }, [containerRef, trigger])

  if (!geo) return null
  return (
    <svg className="pointer-events-none absolute inset-0 z-10 hidden h-full w-full overflow-visible xl:block" aria-hidden>
      <path
        key={drawKey}
        d={geo.d}
        fill="none"
        stroke="var(--accent)"
        strokeOpacity="0.55"
        strokeWidth="1.5"
        pathLength={1}
        className="trace-connector-path"
      />
      <circle cx={geo.x1} cy={geo.y1} r="3.5" fill="var(--accent)" />
      <circle cx={geo.x2} cy={geo.y2} r="3.5" fill="var(--accent)" />
    </svg>
  )
}
