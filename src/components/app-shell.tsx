import { Link, Outlet } from 'react-router'
import { ShieldAlert } from 'lucide-react'
import { Logo } from './logo'

export function AppShell() {
  return (
    <div className="flex min-h-full flex-col">
      <div className="border-b border-border bg-surface/60">
        <p className="mx-auto flex max-w-[1600px] items-start gap-2 px-4 py-1.5 text-[11.5px] leading-snug text-muted-foreground sm:items-center">
          <ShieldAlert className="mt-px size-3.5 shrink-0 text-conflicting sm:mt-0" aria-hidden />
          <span>
            Use fictional or non-sensitive data only. TraceForm is a hackathon demonstration, not certified for any regulated use.
          </span>
        </p>
      </div>
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-3 px-4">
          <Link to="/" className="flex items-center gap-2.5 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Logo className="size-7" />
            <span className="text-[15px] font-semibold tracking-tight">TraceForm</span>
          </Link>
          <span className="hidden text-xs text-subtle-foreground sm:inline">Every answer. Accounted for.</span>
          <div className="ml-auto flex items-center gap-2 text-xs text-subtle-foreground">
            <span className="hidden md:inline">Extraction by</span>
            <span className="rounded-full border border-border px-2 py-0.5 font-mono text-[11px] text-muted-foreground">Meta Muse Spark</span>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-2 px-4 py-3 text-[11.5px] text-subtle-foreground">
          <span>Single-user demonstration · no accounts · built for the Meta Global AI Developer Hackathon 2026</span>
          <span>Source match ≠ answer validation. A human approves every answer.</span>
        </div>
      </footer>
    </div>
  )
}
