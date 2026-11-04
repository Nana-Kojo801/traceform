import { useEffect, useState } from 'react'
import { animate } from 'motion/react'
import type { FunctionReturnType } from 'convex/server'
import { IOS_EASE, prefersReducedMotion } from '@/lib/motion'
import type { api } from '@convex/_generated/api'

type Projects = FunctionReturnType<typeof api.projects.list>

export function WorkspaceStats({ projects }: { projects: Projects | undefined }) {
  const p = projects ?? []
  const answers = p.reduce((n, x) => n + x.answers.length, 0)
  const waiting = p.reduce((n, x) => n + (x.answers.length - x.reviewedCount), 0)
  const conflicts = p.reduce((n, x) => n + x.answers.filter((a) => a === 'conflicting').length, 0)
  const quotes = p.reduce((n, x) => n + x.totalQuotes, 0)
  const verified = p.reduce((n, x) => n + x.verifiedQuotes, 0)
  const pct = quotes ? Math.round((verified / quotes) * 100) : null

  const stats = [
    { label: 'Projects', value: p.length },
    { label: 'Answers extracted', value: answers },
    { label: 'Waiting for you', value: waiting, note: conflicts ? `${conflicts} conflict${conflicts === 1 ? '' : 's'}` : undefined },
    { label: 'Quotes verified', value: pct, suffix: '%' },
  ]

  return (
    <section aria-label="Workspace summary" className="grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3.5" aria-busy={projects === undefined}>
      {stats.map((s) => (
        <div key={s.label} className="card flex flex-col gap-1 px-4 py-3.5 md:gap-1.5 md:px-5 md:py-[18px]">
          <span className="text-[12.5px] text-muted md:text-[13px]">{s.label}</span>
          <span className="flex items-baseline gap-2 text-[26px] font-bold tracking-[-0.02em] tabular-nums md:text-[30px]">
            {projects === undefined ? <span className="h-8 w-10 animate-pulse rounded-[12px] bg-fill" /> : s.value === null ? '—' : <CountUp to={s.value} suffix={s.suffix} />}
            {s.note && <span className="text-[13px] font-semibold tracking-normal text-warn-text">{s.note}</span>}
          </span>
        </div>
      ))}
    </section>
  )
}

/** Numbers count up on a smooth curve the first time they appear. */
function CountUp({ to, suffix = '' }: { to: number; suffix?: string }) {
  const [n, setN] = useState(prefersReducedMotion() ? to : 0)
  useEffect(() => {
    if (prefersReducedMotion()) {
      setN(to)
      return
    }
    const controls = animate(0, to, { duration: 0.9, ease: IOS_EASE, onUpdate: (v) => setN(Math.round(v)) })
    return () => controls.stop()
  }, [to])
  return (
    <span>
      {n}
      {suffix}
    </span>
  )
}
