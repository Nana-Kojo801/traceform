import { useSearchParams } from 'react-router'
import type { Workspace } from './types'

function clock(at: number) {
  return new Date(at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

/** One mono line that accounts for the whole run: extract → verify → repair → second opinion → review. */
export function RunLine({ workspace }: { workspace: Workspace }) {
  const [, setParams] = useSearchParams()
  const { latest, selected, runs, results } = workspace
  const completed = runs.filter((r) => r.status === 'completed')

  const quotes = results.flatMap((r) => r.raw.evidence)
  const verified = quotes.filter((e) => e.sourceMatchVerified).length
  const reviewed = results.filter((r) => r.current.state !== 'unreviewed').length
  const s = selected?.stats
  const audited = s?.audit?.ran ? s.audit.agrees + s.audit.disagrees + s.audit.unsure : null

  return (
    <div aria-live="polite" className="border-b border-line bg-wash font-mono text-[11.5px] uppercase tracking-[0.03em] text-ink-2">
      {latest?.status === 'running' && (
        <div className="flex items-center gap-3 border-b border-line bg-ink px-5 py-2 text-white">
          <span className="size-1.5 animate-pulse rounded-full bg-hl" aria-hidden />
          <span className="font-medium">Live run</span>
          <span className="working truncate normal-case tracking-normal text-[#c4c5ca]">{latest.progress ?? 'Starting'}</span>
        </div>
      )}
      {latest?.status === 'failed' && (
        <div className="flex flex-wrap items-baseline gap-x-3 border-b border-line bg-white px-5 py-2 text-review">
          <span className="font-medium">! Last run failed</span>
          <span className="normal-case tracking-normal">{latest.error ?? 'Unknown error.'}</span>
          {selected && <span className="normal-case tracking-normal text-muted">Showing the previous completed run.</span>}
        </div>
      )}
      {selected ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-5 py-2.5">
          {selected.isPrecomputed ? (
            <span className="bg-hl px-1.5 py-0.5 font-medium text-ink">Sample · precomputed demo, not live AI</span>
          ) : (
            <>
              <span className="font-medium text-ink">Live run {clock(selected.startedAt)}</span>
              {s && (
                <span className="text-faint">
                  {(s.durationMs / 1000).toFixed(1)} s · {s.modelCalls} call{s.modelCalls === 1 ? '' : 's'}
                </span>
              )}
            </>
          )}
          <span className="hidden text-[#c4c5ca] md:inline" aria-hidden>
            │
          </span>
          <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Step label="Extract" value={String(results.length)} />
            <Arrow />
            <Step label="Verify" value={`${verified}/${quotes.length}`} tone={verified === quotes.length ? 'ok' : 'review'} />
            <Arrow />
            <Step label="Repair" value={s ? (s.repairsAttempted ? `${s.repairsFixed}/${s.repairsAttempted}` : '0') : '—'} />
            <Arrow />
            <Step label="Second opinion" value={audited !== null ? `${s!.audit!.agrees}/${audited}` : '—'} />
            <Arrow />
            <Step label="Review" value={`${reviewed}/${results.length}`} tone={reviewed === results.length ? 'ok' : 'conflict'} />
          </ol>
          {completed.length > 1 && (
            <label className="ml-auto flex items-center gap-2">
              <span className="sr-only">Run history</span>
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
                className="h-7 cursor-pointer rounded-[6px] border border-line-strong bg-white px-2 font-mono text-[11px] uppercase tracking-[0.03em] text-ink-2 outline-none focus-visible:border-ink"
              >
                {completed.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.isPrecomputed ? 'Precomputed sample' : `Live · ${new Date(r.startedAt).toLocaleString()}`}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      ) : (
        latest?.status !== 'running' && (
          <div className="px-5 py-2.5 text-muted">No run yet · add sources and a form, then run extraction</div>
        )
      )}
    </div>
  )
}

function Step({ label, value, tone }: { label: string; value: string; tone?: 'ok' | 'review' | 'conflict' }) {
  const color = tone === 'ok' ? 'text-ok' : tone === 'review' ? 'text-review' : tone === 'conflict' ? 'text-conflict' : 'text-ink'
  return (
    <li>
      {label} <b className={`font-medium ${color}`}>{value}</b>
    </li>
  )
}

function Arrow() {
  return (
    <li aria-hidden className="text-faint">
      →
    </li>
  )
}
