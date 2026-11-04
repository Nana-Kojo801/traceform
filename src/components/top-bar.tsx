import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { cn } from '@/lib/utils'
import { Wordmark } from './wordmark'
import { ConnectionStatus } from './connection-status'

/** Top bar for the home and simple pages. */
export function HomeBar({ actions }: { actions?: ReactNode }) {
  const demoId = useQuery(api.demo.find)
  const { pathname } = useLocation()
  const pill = (active: boolean) =>
    cn(
      'flex h-9 items-center rounded-full px-4 text-[14px] outline-none focus-visible:outline-2 focus-visible:outline-ink',
      active ? 'bg-card font-semibold shadow-[inset_0_0_0_1px_var(--line)]' : 'text-muted hover:text-ink',
    )
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-ground/90 backdrop-blur">
      <div className="flex h-16 items-center gap-6 px-4 md:px-8">
        <Wordmark />
        <nav aria-label="Main" className="hidden gap-1 md:flex">
          <Link to="/" className={pill(pathname === '/')}>
            Home
          </Link>
          {demoId && (
            <Link to={`/projects/${demoId}?tab=review`} className={pill(false)}>
              Sample project
            </Link>
          )}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <div className="hidden md:block">
            <ConnectionStatus />
          </div>
          {actions}
        </div>
      </div>
    </header>
  )
}
