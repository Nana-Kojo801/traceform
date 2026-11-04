import { useSearchParams } from 'react-router'
import { relativeTime } from '@/lib/format'
import type { Workspace } from './types'

/** One pill that says what you’re looking at. No pipeline jargon. */
export function RunStatus({ workspace, isDemo }: { workspace: Workspace; isDemo: boolean }) {
  const [, setParams] = useSearchParams()
  const { latest, selected, runs } = workspace
  const completed = runs.filter((r) => r.status === 'completed')
  const pill = 'inline-flex h-8 max-w-full items-center gap-2 self-start rounded-full px-3.5 text-[13.5px]'

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2" aria-live="polite">
      {latest?.status === 'running' ? (
        <span className={`${pill} bg-ink font-medium text-white`}>
          <span className="size-2 animate-pulse rounded-full bg-hl" aria-hidden />
          <span className="working">Reading your documents</span>
        </span>
      ) : latest?.status === 'failed' ? (
        <span className={`${pill} bg-bad-soft font-medium text-bad-text`} title={latest.error}>
          Last run failed{selected ? ', showing the previous result' : ''}
        </span>
      ) : selected ? (
        selected.isPrecomputed ? (
          <span className={`${pill} bg-card text-ink-2 shadow-[inset_0_0_0_1px_var(--line)]`}>
            <span className="size-2 rounded-full bg-hl shadow-[0_0_0_1px_var(--ink)]" aria-hidden />
            Sample data, not live AI
          </span>
        ) : (
          <span className={`${pill} bg-card text-ink-2 shadow-[inset_0_0_0_1px_var(--line)]`}>
            <span className="size-2 rounded-full bg-ok" aria-hidden />
            Live result · {relativeTime(selected.startedAt)}
          </span>
        )
      ) : (
        <span className={`${pill} bg-card text-muted shadow-[inset_0_0_0_1px_var(--line)]`}>{isDemo ? 'No result yet' : 'Not extracted yet'}</span>
      )}
      {latest?.status === 'failed' && latest.error && <span className="truncate text-[13px] text-muted">{latest.error}</span>}
      {completed.length > 1 && selected && (
        <label className="relative">
          <span className="sr-only">Choose a run</span>
          <select
            value={selected._id}
            onChange={(e) =>
              setParams(
                (p) => {
                  p.set('run', e.target.value)
                  p.delete('field')
                  return p
                },
                { replace: true },
              )
            }
            className="h-8 cursor-pointer appearance-none rounded-full bg-fill pl-3.5 pr-8 text-[13.5px] font-medium text-ink outline-none focus-visible:outline-2 focus-visible:outline-ink"
          >
            {completed.map((r, i) => (
              <option key={r._id} value={r._id}>
                {r.isPrecomputed ? 'Sample data' : i === 0 ? 'Latest run' : `Run · ${new Date(r.startedAt).toLocaleString()}`}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-ink-2" aria-hidden>
            ▼
          </span>
        </label>
      )}
    </div>
  )
}
