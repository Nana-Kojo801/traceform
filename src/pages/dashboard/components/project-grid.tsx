import { Link } from 'react-router'
import { useMutation } from 'convex/react'
import type { FunctionReturnType } from 'convex/server'
import { Camera, ChevronRight, FileText, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@convex/_generated/api'
import type { FieldStatus } from '@shared/types'
import { relativeTime } from '@/lib/format'
import { errorMessage } from '@/lib/errors'
import { NewProjectDialog } from './new-project-dialog'

type Projects = FunctionReturnType<typeof api.projects.list>
type Project = Projects[number]

const BAR: Record<FieldStatus, string> = {
  supported: 'bg-ok',
  conflicting: 'bg-warn',
  missing: 'bg-[#d9d9d4]',
  needs_review: 'bg-bad',
}

function summary(answers: FieldStatus[]) {
  const c = (s: FieldStatus) => answers.filter((a) => a === s).length
  return [
    c('supported') && `${c('supported')} verified`,
    c('conflicting') && `${c('conflicting')} conflict${c('conflicting') > 1 ? 's' : ''}`,
    c('needs_review') && `${c('needs_review')} need a look`,
    c('missing') && `${c('missing')} blank`,
  ]
    .filter(Boolean)
    .join(' · ')
}

function ProjectCard({ p }: { p: Project }) {
  const remove = useMutation(api.projects.remove)
  const photo = p.transcribedCount > 0 || p.documentKinds.includes('image')
  const order: FieldStatus[] = ['supported', 'conflicting', 'needs_review', 'missing']
  const segments = order.map((s) => ({ s, n: p.answers.filter((a) => a === s).length })).filter((x) => x.n > 0)
  const run = p.lastRun
  const runText = !run ? 'Not extracted yet' : run.status === 'running' ? 'Running now' : run.status === 'failed' ? 'Last run failed' : run.isPrecomputed ? 'Sample data' : `Live run ${relativeTime(run.startedAt)}`

  return (
    <div className="card group relative flex flex-col gap-4 p-4 shadow-[0_1px_2px_rgb(17_17_19/0.04)] transition-shadow hover:shadow-[0_8px_24px_rgb(17_17_19/0.08)] md:p-5">
      <div className="flex items-start justify-between gap-3">
        <span className={photo ? 'grid size-11 place-items-center rounded-[12px] bg-[#ecebff] text-[#4b44c9]' : 'grid size-11 place-items-center rounded-[12px] bg-warn-soft text-warn-text'}>
          {photo ? <Camera className="size-[22px]" strokeWidth={2} /> : <FileText className="size-[22px]" strokeWidth={2} />}
        </span>
        <div className="flex items-center gap-1.5">
          {p.isDemo && <span className="inline-flex h-6 items-center rounded-full bg-ground px-2.5 text-[12px] font-semibold text-ink-2">Sample</span>}
          <button
            onClick={async () => {
              if (!confirm(`Delete "${p.name}" and all its documents and results?`)) return
              try {
                await remove({ projectId: p._id })
                toast.success('Project deleted')
              } catch (err) {
                toast.error(errorMessage(err))
              }
            }}
            aria-label={`Delete ${p.name}`}
            className="relative z-10 grid size-8 place-items-center rounded-full text-faint opacity-0 outline-none hover:bg-bad-soft hover:text-bad-text focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-ink group-hover:opacity-100 max-md:opacity-100"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <Link to={`/projects/${p._id}`} className="text-[17px] font-semibold tracking-[-0.01em] outline-none after:absolute after:inset-0 after:rounded-[16px] focus-visible:after:outline-2 focus-visible:after:outline-ink">
          {p.name}
        </Link>
        <span className="text-[13.5px] text-muted">
          {p.documentCount} source{p.documentCount === 1 ? '' : 's'} · {p.fieldCount} field{p.fieldCount === 1 ? '' : 's'} · {runText}
        </span>
      </div>
      <div className="mt-auto flex flex-col gap-2">
        {segments.length > 0 ? (
          <>
            <div className="flex h-2 gap-[3px]" aria-hidden>
              {segments.map((x) => (
                <span key={x.s} className={`rounded-full ${BAR[x.s]}`} style={{ flex: x.n }} />
              ))}
            </div>
            <div className="flex justify-between gap-3 text-[13px]">
              <span className="truncate text-muted">{summary(p.answers)}</span>
              <span className="shrink-0 font-semibold tabular-nums">
                {p.reviewedCount}/{p.answers.length} reviewed
              </span>
            </div>
          </>
        ) : (
          <span className="flex items-center justify-between text-[13px] text-muted">
            Add sources and a form to start <ChevronRight className="size-4" />
          </span>
        )}
      </div>
    </div>
  )
}

export function ProjectGrid({ projects, query }: { projects: Projects | undefined; query: string }) {
  if (projects === undefined) {
    return (
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card h-[200px] animate-pulse opacity-60" />
        ))}
      </div>
    )
  }
  const q = query.trim().toLowerCase()
  const shown = q ? projects.filter((p) => p.name.toLowerCase().includes(q)) : projects
  return (
    <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
      {shown.map((p) => (
        <ProjectCard key={p._id} p={p} />
      ))}
      <NewProjectDialog
        trigger={
          <button className="flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-[16px] border-2 border-dashed border-[#d3d3ce] p-5 outline-none transition-colors hover:border-ink hover:bg-card focus-visible:outline-2 focus-visible:outline-ink">
            <span className="grid size-11 place-items-center rounded-[12px] bg-card shadow-[inset_0_0_0_1px_var(--line)]">
              <Plus className="size-[22px]" strokeWidth={2.4} />
            </span>
            <span className="text-[16px] font-semibold">New project</span>
            <span className="text-[13px] text-muted">Text, Word, PDF or photos</span>
          </button>
        }
      />
      {q && shown.length === 0 && <p className="text-[14px] text-muted sm:col-span-2 lg:col-span-3">No projects match “{query}”.</p>}
    </div>
  )
}
