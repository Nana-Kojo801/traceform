import { useCallback, useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { useMutation, useQuery } from 'convex/react'
import { ChevronLeft, Play } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { Segmented } from '@/components/ui/segmented'
import { errorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'
import { NotFoundPage } from '@/pages/not-found/not-found-page'
import { RunStatus } from './components/run-status'
import { ExportMenu } from './components/export-menu'
import { ReviewWorkspace } from './components/review-workspace'
import { SourcesPanel } from './components/sources-panel'
import { FormBuilder } from './components/form-builder'
import { isTypingTarget } from './components/keyboard'

const TABS = ['review', 'sources', 'form'] as const
type Tab = (typeof TABS)[number]

export function ProjectPage() {
  const { projectId: rawId } = useParams()
  const projectId = rawId as Id<'projects'>
  const [params, setParams] = useSearchParams()
  const runParam = params.get('run') as Id<'runs'> | null

  const project = useQuery(api.projects.get, { projectId })
  const documents = useQuery(api.documents.list, { projectId })
  const schema = useQuery(api.forms.get, { projectId })
  const workspace = useQuery(api.runs.workspace, { projectId, runId: runParam ?? undefined })
  const status = useQuery(api.runs.status)
  const startLive = useMutation(api.runs.startLive)
  const [starting, setStarting] = useState(false)

  const tabParam = params.get('tab') as Tab | null
  const defaultTab: Tab = workspace?.selected ? 'review' : 'sources'
  const tab: Tab = tabParam && TABS.includes(tabParam) ? tabParam : defaultTab

  const setTab = useCallback(
    (next: string) =>
      setParams(
        (p) => {
          p.set('tab', next)
          return p
        },
        { replace: true },
      ),
    [setParams],
  )

  const parsedCount = documents?.filter((d) => d.parseStatus === 'parsed').length ?? 0
  const fieldCount = schema?.fields.length ?? 0
  const running = workspace?.latest?.status === 'running'
  const blocker = !status
    ? 'Checking configuration'
    : !status.keyConfigured
      ? 'The Meta API key is not configured. The sample still works.'
      : parsedCount === 0
        ? 'Add a document first.'
        : fieldCount === 0
          ? 'Add a form field first.'
          : null

  const run = useCallback(async () => {
    if (blocker || running || starting || !project) return
    setStarting(true)
    try {
      await startLive({ projectId: project._id })
      setTab('review')
      toast('Reading your documents', { description: 'Answers appear once every quote has been checked.' })
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setStarting(false)
    }
  }, [blocker, running, starting, project, startLive, setTab])

  // R starts a run (only when not typing).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key.toLowerCase() !== 'r' || e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return
      e.preventDefault()
      run()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [run])

  if (project === null) return <NotFoundPage />
  const loading = project === undefined || documents === undefined || schema === undefined || workspace === undefined

  const open = workspace ? workspace.results.filter((r) => r.current.state === 'unreviewed').length : 0
  const tabs = (
    <Segmented
      role="tablist"
      label="Project sections"
      value={tab}
      onChange={setTab}
      className="w-full lg:w-auto"
      options={[
        { value: 'review', label: <>Review{open > 0 && <span className="cite">{open}</span>}</> },
        { value: 'sources', label: 'Sources' },
        { value: 'form', label: 'Form' },
      ]}
    />
  )
  const runLabel = running || starting ? 'Running' : project?.isDemo ? 'Run live' : 'Run'

  return (
    <div className="flex flex-col lg:h-dvh">
      <header className="sticky top-0 z-30 border-b border-line bg-ground/90 backdrop-blur">
        <div className="grid h-16 grid-cols-[1fr_auto] items-center gap-4 px-4 lg:grid-cols-[1fr_auto_1fr] lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link to="/" aria-label="Back to projects" className="grid size-11 shrink-0 place-items-center rounded-full bg-card shadow-[0_1px_3px_rgb(0_0_0/0.08)] outline-none focus-visible:outline-2 focus-visible:outline-ink lg:hidden">
              <ChevronLeft className="size-5" strokeWidth={2.8} />
            </Link>
            <Link to="/" className="hidden items-center gap-0.5 rounded-[12px] text-[16px] font-medium outline-none hover:opacity-70 focus-visible:outline-2 focus-visible:outline-ink lg:flex">
              <ChevronLeft className="size-5" strokeWidth={2.6} />
              Projects
            </Link>
            <span className="truncate text-[16px] font-semibold lg:hidden">{project?.name ?? ''}</span>
          </div>
          <div className="hidden lg:block">{tabs}</div>
          <div className="flex items-center justify-end gap-2">
            {workspace && documents && project && <ExportMenu project={project} schema={schema ?? null} documents={documents} workspace={workspace} />}
            <Button
              variant="ink"
              onClick={run}
              disabled={!!blocker || running || starting}
              title={blocker ?? 'Run extraction with Meta AI (R)'}
              aria-label={project?.isDemo ? 'Run live on sample documents' : 'Run extraction'}
              className="max-md:size-11 max-md:rounded-full max-md:px-0"
            >
              <Play fill="currentColor" className="size-3.5" />
              <span className="max-md:hidden">{running || starting ? <span className="working">{runLabel}</span> : runLabel}</span>
            </Button>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="flex-1 p-6" aria-busy="true">
          <div className="h-9 w-80 animate-pulse rounded-[12px] bg-fill" />
          <div className="mt-6 h-[60vh] animate-pulse rounded-[16px] bg-card opacity-60" />
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3 px-4 pb-4 pt-5 lg:flex-row lg:items-center lg:gap-3.5 lg:px-7 lg:pt-6">
            <h1 className="hidden truncate text-[28px] font-bold tracking-[-0.02em] lg:block">{project.name}</h1>
            <RunStatus workspace={workspace} isDemo={project.isDemo} />
            {blocker && status && !workspace.selected && tab === 'review' && <span className="text-[13px] text-muted">{blocker}</span>}
            <div className="lg:hidden">{tabs}</div>
          </div>
          <div className={cn('lg:min-h-0 lg:flex-1', tab === 'review' ? 'lg:overflow-hidden' : 'lg:overflow-auto')}>
            {tab === 'review' && <ReviewWorkspace documents={documents} schema={schema} workspace={workspace} onGoTo={setTab} />}
            {tab === 'sources' && <SourcesPanel projectId={projectId} documents={documents} />}
            {tab === 'form' && <FormBuilder projectId={projectId} schema={schema} />}
          </div>
        </>
      )}
    </div>
  )
}
