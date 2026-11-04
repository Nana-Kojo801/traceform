import { Link } from 'react-router'
import { useMutation } from 'convex/react'
import { ChevronRight, FolderOpen, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@convex/_generated/api'
import type { FunctionReturnType } from 'convex/server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { relativeTime } from '@/lib/format'
import { errorMessage } from '@/lib/errors'

type Projects = FunctionReturnType<typeof api.projects.list>

export function ProjectList({ projects }: { projects: Projects | undefined }) {
  const remove = useMutation(api.projects.remove)

  if (projects === undefined) {
    return (
      <div className="space-y-2" aria-busy="true" aria-label="Loading projects">
        {[0, 1].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-2xl border border-border bg-surface" />
        ))}
      </div>
    )
  }
  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-dashed border-border px-4 py-10 text-center">
        <FolderOpen className="size-6 text-subtle-foreground" aria-hidden />
        <p className="mt-2 text-sm font-medium">No projects yet</p>
        <p className="mt-1 text-[13px] text-muted-foreground">Open the sample project or create your own.</p>
      </div>
    )
  }

  return (
    <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
      {projects.map((p) => (
        <li key={p._id} className="group flex items-center gap-3 px-4 py-3 hover:bg-surface-2">
          <Link to={`/projects/${p._id}`} className="flex min-w-0 flex-1 items-center gap-3 outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate text-sm font-medium">{p.name}</span>
                {p.isDemo && <Badge tone="outline">Sample</Badge>}
              </div>
              <p className="mt-0.5 text-xs text-subtle-foreground">
                {p.documentCount} document{p.documentCount === 1 ? '' : 's'} · {p.fieldCount} field{p.fieldCount === 1 ? '' : 's'}
                {p.lastRun
                  ? ` · last run ${relativeTime(p.lastRun.startedAt)}${p.lastRun.isPrecomputed ? ' (precomputed)' : ''}${p.lastRun.status === 'failed' ? ' (failed)' : ''}`
                  : ' · not extracted yet'}
              </p>
            </div>
            <ChevronRight className="size-4 text-subtle-foreground" aria-hidden />
          </Link>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Delete ${p.name}`}
            className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
            onClick={async () => {
              if (!confirm(`Delete "${p.name}" and all its documents and results?`)) return
              try {
                await remove({ projectId: p._id })
                toast.success('Project deleted')
              } catch (err) {
                toast.error(errorMessage(err))
              }
            }}
          >
            <Trash2 />
          </Button>
        </li>
      ))}
    </ul>
  )
}
