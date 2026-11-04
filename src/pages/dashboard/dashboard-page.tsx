import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { TopBar, Crumb } from '@/components/top-bar'
import { DashboardHero } from './components/dashboard-hero'
import { ProjectLedger } from './components/project-ledger'
import { MethodStrip } from './components/method-strip'

export function DashboardPage() {
  const projects = useQuery(api.projects.list)

  return (
    <>
      <TopBar crumbs={<Crumb>Projects</Crumb>} />
      <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-14 px-5 pb-16 pt-10 md:gap-16 md:px-10 md:pt-14">
        <DashboardHero />
        <section aria-labelledby="projects-heading" className="flex flex-col gap-4">
          <div className="flex items-baseline gap-3">
            <h2 id="projects-heading" className="text-xl font-semibold tracking-[-0.02em]">
              Projects
            </h2>
            {projects && <span className="font-mono text-xs text-muted">{projects.length}</span>}
          </div>
          <ProjectLedger projects={projects} />
        </section>
        <MethodStrip />
        <footer className="flex flex-wrap justify-between gap-3 border-t border-line pt-4 font-mono text-[11px] uppercase tracking-[0.03em] text-faint">
          <span>Single-user demonstration · fictional or non-sensitive data only · not certified for regulated use</span>
          <span>Meta Global AI Developer Hackathon 2026</span>
        </footer>
      </main>
    </>
  )
}
