import { useState } from 'react'
import { useQuery } from 'convex/react'
import { Plus } from 'lucide-react'
import { api } from '@convex/_generated/api'
import { HomeBar } from '@/components/top-bar'
import { Button } from '@/components/ui/button'
import { SearchField } from '@/components/ui/input'
import { Hero } from './components/hero'
import { WorkspaceStats } from './components/workspace-stats'
import { ProjectGrid } from './components/project-grid'
import { HowItWorks } from './components/how-it-works'
import { NewProjectDialog } from './components/new-project-dialog'

export function DashboardPage() {
  const projects = useQuery(api.projects.list)
  const [query, setQuery] = useState('')

  return (
    <>
      <HomeBar
        actions={
          <NewProjectDialog
            trigger={
              <Button variant="ink" className="max-sm:size-10 max-sm:rounded-full max-sm:px-0" aria-label="New project">
                <Plus strokeWidth={2.8} />
                <span className="max-sm:hidden">New project</span>
              </Button>
            }
          />
        }
      />
      <main className="mx-auto flex w-full max-w-[1180px] flex-col gap-10 px-4 pb-14 pt-8 md:gap-11 md:px-8 md:pt-12">
        <Hero />
        <WorkspaceStats projects={projects} />
        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[20px] font-semibold tracking-[-0.015em]">Your projects</h2>
            {projects && projects.length > 2 && (
              <SearchField value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search projects" aria-label="Search projects" wrapClassName="w-full sm:w-60 bg-card shadow-[inset_0_0_0_1px_var(--line)]" />
            )}
          </div>
          <ProjectGrid projects={projects} query={query} />
        </section>
        <HowItWorks />
        <p className="text-center text-[12.5px] text-muted">Demo built for the Meta AI Hackathon. Use fictional or non-sensitive data only.</p>
      </main>
    </>
  )
}
