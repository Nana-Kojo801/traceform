import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { DemoCard } from './components/demo-card'
import { CreateProjectForm } from './components/create-project-form'
import { ProjectList } from './components/project-list'

export function DashboardPage() {
  const projects = useQuery(api.projects.list)

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-8 sm:py-12">
      <section className="max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">Fill forms from messy documents. Show your work.</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          Upload documents, define a form, and Meta&apos;s model fills it in. Every answer links to a verbatim quote that is
          checked against the source. Contradictions are surfaced, never silently resolved, and anything undocumented stays
          blank. You review and export.
        </p>
      </section>

      <div className="mt-8 grid gap-4 lg:grid-cols-[1.25fr_1fr]">
        <DemoCard />
        <CreateProjectForm />
      </div>

      <section className="mt-10" aria-labelledby="projects-heading">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 id="projects-heading" className="text-sm font-semibold">
            Projects
          </h2>
          {projects && <span className="text-xs text-subtle-foreground">{projects.length} total</span>}
        </div>
        <ProjectList projects={projects} />
      </section>
    </div>
  )
}
