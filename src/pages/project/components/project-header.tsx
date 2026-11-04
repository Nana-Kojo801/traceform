import { useState } from 'react'
import { Link } from 'react-router'
import { useMutation, useQuery } from 'convex/react'
import { ChevronLeft, Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@convex/_generated/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { errorMessage } from '@/lib/errors'
import { ConnectionStatus } from './connection-status'
import { ExportMenu } from './export-menu'
import type { DocumentRow, ProjectDoc, SchemaRow, Workspace } from './types'

interface Props {
  project: ProjectDoc
  parsedDocCount: number
  fieldCount: number
  workspace: Workspace
  schema: SchemaRow
  documents: DocumentRow[]
  onStarted: () => void
}

export function ProjectHeader({ project, parsedDocCount, fieldCount, workspace, schema, documents, onStarted }: Props) {
  const status = useQuery(api.runs.status)
  const startLive = useMutation(api.runs.startLive)
  const [starting, setStarting] = useState(false)
  const running = workspace.latest?.status === 'running'

  const blocker = !status
    ? 'Checking configuration'
    : !status.keyConfigured
      ? 'The Meta API key is not configured on the server. The precomputed demo still works.'
      : parsedDocCount === 0
        ? 'Upload at least one document first.'
        : fieldCount === 0
          ? 'Add at least one form field first.'
          : null

  async function run() {
    setStarting(true)
    try {
      await startLive({ projectId: project._id })
      onStarted()
      toast.message('Extraction started', { description: 'Meta’s model is reading the sources. Results appear when verified.' })
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setStarting(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <Link to="/" className="inline-flex items-center gap-1 text-xs text-subtle-foreground hover:text-foreground">
          <ChevronLeft className="size-3.5" aria-hidden /> Projects
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h1 className="truncate text-lg font-semibold tracking-tight sm:text-xl">{project.name}</h1>
          {project.isDemo && <Badge tone="outline">Sample dataset</Badge>}
        </div>
        {project.description && <p className="mt-0.5 line-clamp-2 text-[13px] text-muted-foreground">{project.description}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <ConnectionStatus status={status} />
        <ExportMenu project={project} schema={schema} documents={documents} workspace={workspace} />
        <Button onClick={run} disabled={!!blocker || running || starting} title={blocker ?? undefined}>
          {running || starting ? <Loader2 className="animate-spin" /> : <Sparkles />}
          {running ? 'Extracting…' : project.isDemo ? 'Run live on sample documents' : 'Extract with Meta AI'}
        </Button>
      </div>
      {blocker && status && (
        <p className="text-xs text-subtle-foreground md:hidden" role="note">
          {blocker}
        </p>
      )}
    </div>
  )
}
