import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { ChevronLeft } from 'lucide-react'
import { Wordmark } from './wordmark'
import { ConnectionStatus } from './connection-status'

interface Props {
  /** Breadcrumb after the wordmark (desktop). */
  crumbs?: ReactNode
  /** Title shown next to the back button on small screens. */
  mobileTitle?: ReactNode
  mobileSubtitle?: ReactNode
  backTo?: string
  tabs?: ReactNode
  actions?: ReactNode
}

export function TopBar({ crumbs, mobileTitle, mobileSubtitle, backTo, tabs, actions }: Props) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white">
      <div className="flex min-h-14 items-center gap-x-5 gap-y-0 px-4 md:px-5">
        {backTo && (
          <Link
            to={backTo}
            aria-label="Back"
            className="grid size-11 shrink-0 place-items-center rounded-[6px] bg-ink text-white outline-none hover:bg-[#26272b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink md:hidden"
          >
            <ChevronLeft className="size-5" strokeWidth={2.75} />
          </Link>
        )}
        <div className={backTo ? 'hidden md:flex' : 'flex'}>
          <Wordmark />
        </div>
        {crumbs && <div className="hidden min-w-0 items-center gap-3 text-sm md:flex">{crumbs}</div>}
        {mobileTitle && (
          <div className="flex min-w-0 flex-1 flex-col py-2 md:hidden">
            <span className="truncate text-[15px] font-semibold tracking-[-0.01em]">{mobileTitle}</span>
            {mobileSubtitle && <span className="cap truncate">{mobileSubtitle}</span>}
          </div>
        )}
        {tabs && <div className="ml-4 hidden self-stretch lg:flex">{tabs}</div>}
        <div className="ml-auto flex shrink-0 items-center gap-2.5">
          <div className="hidden md:block">
            <ConnectionStatus />
          </div>
          {actions && <span className="hidden h-5 w-px bg-line md:block" aria-hidden />}
          {actions}
        </div>
      </div>
      {tabs && <div className="flex overflow-x-auto px-4 lg:hidden">{tabs}</div>}
    </header>
  )
}

export function Crumb({ to, children }: { to?: string; children: ReactNode }) {
  return (
    <>
      <span className="text-[#c4c5ca]" aria-hidden>
        /
      </span>
      {to ? (
        <Link to={to} className="text-muted hover:text-ink">
          {children}
        </Link>
      ) : (
        <span className="truncate font-medium text-ink">{children}</span>
      )}
    </>
  )
}
