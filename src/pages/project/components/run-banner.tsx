import { useSearchParams } from 'react-router'
import { AlertCircle, FlaskConical, Loader2, Radio } from 'lucide-react'
import { NativeSelect } from '@/components/ui/input'
import { relativeTime } from '@/lib/format'
import type { Workspace } from './types'

export function RunBanner({ workspace, isDemo }: { workspace: Workspace; isDemo: boolean }) {
  const [, setParams] = useSearchParams()
  const { latest, selected, runs } = workspace
  const completed = runs.filter((r) => r.status === 'completed')

  return (
    <div className="mt-3 space-y-2" aria-live="polite">
      {latest?.status === 'running' && (
        <div className="flex items-center gap-3 rounded-2xl border border-accent/30 bg-accent-soft px-4 py-2.5 text-sm">
          <Loader2 className="size-4 shrink-0 animate-spin text-accent" aria-hidden />
          <span className="font-medium">Live extraction running</span>
          <span className="truncate text-muted-foreground">{latest.progress ?? 'Starting'}</span>
        </div>
      )}
      {latest?.status === 'failed' && (
        <div className="flex items-start gap-3 rounded-2xl border border-review/30 bg-review-soft px-4 py-2.5 text-sm">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-review" aria-hidden />
          <div>
            <span className="font-medium">The last extraction failed.</span>{' '}
            <span className="text-muted-foreground">{latest.error ?? 'Unknown error.'}</span>
            {selected && <span className="text-muted-foreground"> Showing the previous completed run.</span>}
          </div>
        </div>
      )}
      {selected && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-border bg-surface px-4 py-2 text-[13px]">
          {selected.isPrecomputed ? (
            <span className="inline-flex items-center gap-1.5 font-medium text-conflicting">
              <FlaskConical className="size-4" aria-hidden />
              Sample dataset / precomputed demo, not live AI
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 font-medium text-supported">
              <Radio className="size-4" aria-hidden />
              Live result from <span className="font-mono">{selected.model}</span>
            </span>
          )}
          <span className="text-muted-foreground">{relativeTime(selected.startedAt)}</span>
          {selected.stats && (
            <span className="text-muted-foreground">
              {selected.stats.firstPassUnverifiedQuotes} unverified citation{selected.stats.firstPassUnverifiedQuotes === 1 ? '' : 's'} on first pass
              {selected.stats.repairsAttempted > 0 && ` · ${selected.stats.repairsFixed} of ${selected.stats.repairsAttempted} fixed by repair pass`}
              {!selected.isPrecomputed &&
                ` · ${selected.stats.modelCalls} model call${selected.stats.modelCalls === 1 ? '' : 's'} · ${(selected.stats.durationMs / 1000).toFixed(1)}s`}
              {selected.stats.audit?.ran &&
                ` · second opinion: ${selected.stats.audit.agrees} agree${selected.stats.audit.disagrees ? `, ${selected.stats.audit.disagrees} disagree` : ''}${selected.stats.audit.unsure ? `, ${selected.stats.audit.unsure} unsure` : ''}`}
              {selected.stats.audit?.error && ' · second opinion unavailable'}
            </span>
          )}
          {completed.length > 1 && (
            <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
              Run
              <NativeSelect
                className="h-8 w-auto rounded-full py-0 text-xs"
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
              >
                {completed.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.isPrecomputed ? 'Precomputed demo' : `Live · ${new Date(r.startedAt).toLocaleString()}`}
                  </option>
                ))}
              </NativeSelect>
            </label>
          )}
        </div>
      )}
      {!selected && latest?.status !== 'running' && isDemo && (
        <p className="text-sm text-muted-foreground">No completed run yet.</p>
      )}
    </div>
  )
}
