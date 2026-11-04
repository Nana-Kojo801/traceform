import { useParams, useSearchParams } from 'react-router'
import { useQuery } from 'convex/react'
import { FileStack, ListChecks, ScanSearch } from 'lucide-react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { NotFoundPage } from '@/pages/not-found/not-found-page'
import { ProjectHeader } from './components/project-header'
import { RunBanner } from './components/run-banner'
import { ReviewWorkspace } from './components/review-workspace'
import { SourcesPanel } from './components/sources-panel'
import { FormBuilder } from './components/form-builder'

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

  const tabParam = params.get('tab') as Tab | null
  const defaultTab: Tab = workspace?.selected ? 'review' : 'sources'
  const tab: Tab = tabParam && TABS.includes(tabParam) ? tabParam : defaultTab

  function setTab(next: string) {
    setParams(
      (p) => {
        p.set('tab', next)
        return p
      },
      { replace: true },
    )
  }

  if (project === null) return <NotFoundPage />
  if (project === undefined || documents === undefined || schema === undefined || workspace === undefined) {
    return (
      <div className="mx-auto max-w-[1600px] px-4 py-6" aria-busy="true">
        <div className="h-8 w-64 animate-pulse rounded-full bg-surface-2" />
        <div className="mt-6 h-[60vh] animate-pulse rounded-2xl border border-border bg-surface" />
      </div>
    )
  }

  const parsedDocs = documents.filter((d) => d.parseStatus === 'parsed')
  const fieldCount = schema?.fields.length ?? 0

  return (
    <div className="mx-auto max-w-[1600px] px-4 pb-6 pt-4">
      <ProjectHeader
        project={project}
        parsedDocCount={parsedDocs.length}
        fieldCount={fieldCount}
        workspace={workspace}
        schema={schema}
        documents={documents}
        onStarted={() => setTab('review')}
      />
      <RunBanner workspace={workspace} isDemo={project.isDemo} />

      <Tabs value={tab} onValueChange={setTab} className="mt-3">
        <TabsList aria-label="Project sections">
          <TabsTrigger value="review">
            <ScanSearch aria-hidden />
            Review
          </TabsTrigger>
          <TabsTrigger value="sources">
            <FileStack aria-hidden />
            Sources <span className="text-subtle-foreground">{documents.length}</span>
          </TabsTrigger>
          <TabsTrigger value="form">
            <ListChecks aria-hidden />
            Form <span className="text-subtle-foreground">{fieldCount}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="review" className="mt-3 outline-none">
          <ReviewWorkspace
            projectId={projectId}
            documents={documents}
            schema={schema}
            workspace={workspace}
            onGoTo={setTab}
          />
        </TabsContent>
        <TabsContent value="sources" className="mt-3 outline-none">
          <SourcesPanel projectId={projectId} documents={documents} />
        </TabsContent>
        <TabsContent value="form" className="mt-3 outline-none">
          <FormBuilder projectId={projectId} schema={schema} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
