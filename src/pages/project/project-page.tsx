import { useCallback, useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router'
import { useMutation, useQuery } from 'convex/react'
import { Play } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { TopBar, Crumb } from '@/components/top-bar'
import { Button, Kbd } from '@/components/ui/button'
import { errorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'
import { NotFoundPage } from '@/pages/not-found/not-found-page'
import { RunLine } from './components/run-line'
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
      ? 'The Meta API key is not configured on the server. The precomputed sample still works.'
      : parsedCount === 0
        ? 'Add at least one source document first.'
        : fieldCount === 0
          ? 'Add at least one form field first.'
          : null

  const run = useCallback(async () => {
    if (blocker || running || starting || !project) return
    setStarting(true)
    try {
      await startLive({ projectId: project._id })
      setTab('review')
      toast('Extraction started', { description: 'Meta’s model is reading the sources. Answers appear once code has verified them.' })
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

  const reviewed = workspace?.results.filter((r) => r.current.state !== 'unreviewed').length ?? 0
  const open = (workspace?.results.length ?? 0) - reviewed

  const tabs = (
    <nav role="tablist" aria-label="Project sections" className="flex gap-6">
      {(
        [
          ['review', 'Review', open, open > 0],
          ['sources', 'Sources', documents?.length ?? 0, false],
          ['form', 'Form', fieldCount, false],
        ] as const
      ).map(([id, label, count, alert]) => (
        <button
          key={id}
          role="tab"
          aria-selected={tab === id}
          onClick={() => setTab(id)}
          className={cn(
            'flex h-12 items-center gap-1.5 border-b-2 text-sm font-medium lg:h-14 outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink',
            tab === id ? 'border-ink text-ink' : 'border-transparent text-muted hover:text-ink',
          )}
        >
          {label}
          <span className={cn('font-mono text-[11px]', alert ? 'text-conflict' : 'text-faint')}>{count}</span>
        </button>
      ))}
    </nav>
  )

  return (
    <div className="flex flex-col lg:h-dvh">
      <TopBar
        backTo="/"
        crumbs={
          <>
            <Crumb to="/">Projects</Crumb>
            <Crumb>{project?.name ?? '…'}</Crumb>
            {project?.isDemo && <span className="cap rounded-[6px] border border-line-strong px-1.5 py-0.5 text-[10px]">Sample</span>}
          </>
        }
        mobileTitle={project?.name ?? '…'}
        mobileSubtitle={workspace?.selected ? `${reviewed} / ${workspace.results.length} reviewed` : 'Not extracted yet'}
        tabs={tabs}
        actions={
          <>
            {workspace && documents && project && <ExportMenu project={project} schema={schema ?? null} documents={documents} workspace={workspace} />}
            <Button
              variant="ink"
              onClick={run}
              disabled={!!blocker || running || starting}
              title={blocker ?? (project?.isDemo ? 'Run Meta’s model live on the sample documents' : undefined)}
              className="max-md:size-11 max-md:px-0"
              aria-label={project?.isDemo ? 'Run live on sample documents' : 'Run extraction'}
            >
              <Play className="md:hidden" fill="currentColor" />
              <span className="hidden md:inline">{running || starting ? <span className="working">Running</span> : project?.isDemo ? 'Run live' : 'Run extraction'}</span>
              <Kbd dark className="hidden md:inline-block">
                R
              </Kbd>
            </Button>
          </>
        }
      />
      {loading ? (
        <div className="flex-1 p-5" aria-busy="true">
          <div className="h-8 w-full animate-pulse bg-wash" />
          <div className="mt-4 h-[60vh] animate-pulse bg-wash/60" />
        </div>
      ) : (
        <>
          <RunLine workspace={workspace} />
          {blocker && status && !workspace.selected && (
            <p className="border-b border-line px-5 py-2 font-mono text-[11.5px] text-muted">{blocker}</p>
          )}
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
