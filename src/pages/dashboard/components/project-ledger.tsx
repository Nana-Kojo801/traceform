import { Link } from 'react-router'
import { useMutation } from 'convex/react'
import type { FunctionReturnType } from 'convex/server'
import { toast } from 'sonner'
import { api } from '@convex/_generated/api'
import type { FieldStatus } from '@shared/types'
import { relativeTime } from '@/lib/format'
import { errorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'

type Projects = FunctionReturnType<typeof api.projects.list>

const CELL: Record<FieldStatus, string> = {
  supported: 'bg-ink',
  conflicting: 'bg-conflict-bar',
  missing: 'shadow-[inset_0_0_0_1px_#c4c5ca]',
  needs_review: 'bg-review',
}

export function AnswerCells({ answers }: { answers: FieldStatus[] }) {
  if (answers.length === 0) return <span className="font-mono text-[11.5px] text-faint">Not extracted yet</span>
  const count = (s: FieldStatus) => answers.filter((a) => a === s).length
  const parts = [
    count('supported') && `${count('supported')} ✓`,
    count('conflicting') && `${count('conflicting')} ≠`,
    count('needs_review') && `${count('needs_review')} !`,
    count('missing') && `${count('missing')} —`,
  ].filter(Boolean)
  return (
    <div>
      <div className="flex gap-0.5" aria-hidden>
        {answers.map((a, i) => (
          <span key={i} className={cn('h-3.5 w-2.5', CELL[a])} />
        ))}
      </div>
      <span className="mt-1.5 block font-mono text-[11.5px] text-muted">{parts.join(' · ')}</span>
    </div>
  )
}

function kinds(list: string[]) {
  return list.map((k) => (k === 'image' ? 'IMG' : k.toUpperCase())).join(' · ')
}

export function ProjectLedger({ projects }: { projects: Projects | undefined }) {
  const remove = useMutation(api.projects.remove)

  async function del(id: Projects[number]['_id'], name: string) {
    if (!confirm(`Delete "${name}" and all its documents and results?`)) return
    try {
      await remove({ projectId: id })
      toast.success('Project deleted')
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  if (projects === undefined) {
    return (
      <div className="border-t border-ink" aria-busy="true" aria-label="Loading projects">
        {[0, 1].map((i) => (
          <div key={i} className="h-[76px] animate-pulse border-b border-line bg-wash/60" />
        ))}
      </div>
    )
  }
  if (projects.length === 0) {
    return (
      <div className="border-y border-ink py-10">
        <p className="text-[15px] font-medium">No projects yet.</p>
        <p className="mt-1 text-[13.5px] text-muted">Open the sample, or create a project from your own documents.</p>
      </div>
    )
  }

  return (
    <>
    {/* Phones: stacked ledger rows */}
    <ul className="border-t border-ink md:hidden">
      {projects.map((p, i) => {
        const open = p.answers.length - p.reviewedCount
        return (
          <li key={p._id} className="border-b border-line">
            <Link to={`/projects/${p._id}`} className="grid grid-cols-[28px_minmax(0,1fr)_auto] gap-x-2 gap-y-2 py-4 outline-none focus-visible:outline-2 focus-visible:outline-ink">
              <span className="pt-1 font-mono text-xs text-faint">{String(i + 1).padStart(2, '0')}</span>
              <span className="flex min-w-0 flex-col gap-1">
                <span className="text-base font-semibold tracking-[-0.015em]">{p.name}</span>
                <span className="font-mono text-[11px] uppercase text-muted">
                  {p.isDemo ? 'Sample · precomputed' : `${p.documentCount} file${p.documentCount === 1 ? '' : 's'}`}
                  {p.answers.length > 0 && ` · ${p.reviewedCount}/${p.answers.length} reviewed`}
                  {open > 0 && <span className="text-conflict"> · {open} open</span>}
                </span>
              </span>
              <span className="pt-0.5 text-lg" aria-hidden>
                →
              </span>
              <span />
              <span className="col-span-2">
                <AnswerCells answers={p.answers} />
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
    <div className="hidden overflow-x-auto md:block">
      <table className="w-full min-w-[860px] border-collapse text-left">
        <thead>
          <tr className="border-b border-ink">
            {['№', 'Project', 'Sources', 'Answers', 'Reviewed', 'Last run', ''].map((h, i) => (
              <th key={i} scope="col" className="cap pb-2.5 pr-4 font-medium">
                {h || <span className="sr-only">Actions</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {projects.map((p, i) => {
            const open = p.answers.length - p.reviewedCount
            return (
              <tr key={p._id} className="group border-b border-line align-top hover:bg-wash">
                <td className="py-[18px] pr-4 font-mono text-xs text-faint">{String(i + 1).padStart(2, '0')}</td>
                <td className="py-[18px] pr-4">
                  <Link to={`/projects/${p._id}`} className="flex flex-col gap-1 outline-none focus-visible:outline-2 focus-visible:outline-ink">
                    <span className="text-base font-semibold tracking-[-0.015em] text-ink group-hover:underline group-hover:underline-offset-4">{p.name}</span>
                    {p.isDemo ? (
                      <span className="cap text-[10.5px]">Sample · precomputed demo, not live AI</span>
                    ) : (
                      <span className="line-clamp-1 max-w-[420px] text-[12.5px] text-muted">{p.description || `${p.fieldCount} fields`}</span>
                    )}
                  </Link>
                </td>
                <td className="py-[18px] pr-4 text-[13.5px] text-ink-2">
                  {p.documentCount} file{p.documentCount === 1 ? '' : 's'}
                  <br />
                  <span className="font-mono text-[11.5px] text-faint">
                    {kinds(p.documentKinds) || 'none'}
                    {p.transcribedCount > 0 && ' · transcribed'}
                  </span>
                </td>
                <td className="py-[18px] pr-4">
                  <AnswerCells answers={p.answers} />
                </td>
                <td className="py-[18px] pr-4">
                  {p.answers.length > 0 ? (
                    <>
                      <span className="text-base font-semibold tabular-nums">
                        {p.reviewedCount}/{p.answers.length}
                      </span>
                      <br />
                      <span className={cn('font-mono text-[11.5px]', open ? 'text-conflict' : 'text-ok')}>{open ? `${open} open` : '✓ done'}</span>
                    </>
                  ) : (
                    <span className="text-faint">—</span>
                  )}
                </td>
                <td className="py-[18px] pr-4 text-[13.5px] text-ink-2">
                  {p.lastRun ? (
                    <>
                      {p.lastRun.status === 'failed' ? 'Failed' : p.lastRun.status === 'running' ? 'Running' : p.lastRun.isPrecomputed ? 'Precomputed' : 'Live'} ·{' '}
                      {relativeTime(p.lastRun.startedAt)}
                      <br />
                      <span className="font-mono text-[11.5px] text-faint">
                        {p.lastRun.isPrecomputed
                          ? 'fixture, not AI'
                          : p.lastRun.durationMs !== null
                            ? `${(p.lastRun.durationMs / 1000).toFixed(1)} s · ${p.lastRun.modelCalls} call${p.lastRun.modelCalls === 1 ? '' : 's'}`
                            : ''}
                      </span>
                    </>
                  ) : (
                    <span className="text-faint">Never</span>
                  )}
                </td>
                <td className="py-[14px] text-right">
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() => del(p._id, p.name)}
                      className="rounded-[6px] px-2 py-1.5 font-mono text-[11px] uppercase text-faint opacity-0 outline-none hover:bg-white hover:text-review focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-ink group-hover:opacity-100"
                      aria-label={`Delete ${p.name}`}
                    >
                      Delete
                    </button>
                    <Link to={`/projects/${p._id}`} aria-label={`Open ${p.name}`} className="grid size-8 place-items-center rounded-[6px] text-lg hover:bg-white">
                      →
                    </Link>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
    </>
  )
}
