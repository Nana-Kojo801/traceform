import { useState } from 'react'
import { useAction, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { errorMessage } from '@/lib/errors'
import { MAX_DOCUMENTS_PER_PROJECT, MAX_FILE_BYTES, MAX_TOTAL_CHARS } from '@shared/limits'

export function ConnectionStatus({ showUsage }: { showUsage?: boolean }) {
  const status = useQuery(api.runs.status)
  const test = useAction(api.extraction.testConnection)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [testing, setTesting] = useState(false)
  const configured = status?.keyConfigured

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          className="flex h-8 items-center gap-2 rounded-[6px] px-1.5 font-mono text-xs text-ink-2 outline-none hover:bg-wash focus-visible:outline-2 focus-visible:outline-ink"
          aria-label="Meta Model API status"
        >
          <span className={cn('size-[7px] rounded-full', status === undefined ? 'bg-faint' : configured ? 'bg-live' : 'bg-review')} aria-hidden />
          {status === undefined ? 'checking' : configured ? status.model : 'API key missing'}
          {showUsage && status && <span className="text-muted">· {status.dailyRunsUsed}/{status.dailyRunCap} calls today</span>}
        </button>
      </DialogTrigger>
      <DialogContent title="Meta Model API" description="Live extraction and transcription run on the server. The key never reaches the browser.">
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 text-[13.5px]">
          {[
            ['Key', configured ? 'Configured on the server' : 'Not configured. Set MODEL_API_KEY in Convex.'],
            ['Model', <span className="font-mono text-[13px]">{status?.model ?? '…'}</span>],
            ['Today', status ? `${status.dailyRunsUsed} of ${status.dailyRunCap} live calls (UTC day)` : '…'],
            [
              'Limits',
              `${MAX_DOCUMENTS_PER_PROJECT} files per project, ${MAX_FILE_BYTES / 1024} KB per text file, ${MAX_TOTAL_CHARS.toLocaleString()} characters per extraction, ${status ? status.cooldownMs / 1000 : 30} s cooldown.`,
            ],
          ].map(([k, v], i) => (
            <div key={i} className="contents">
              <dt className="cap border-t border-line py-2.5">{k}</dt>
              <dd className="border-t border-line py-2.5 text-ink-2">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-5 flex items-center gap-3">
          <Button
            disabled={!configured || testing}
            onClick={async () => {
              setTesting(true)
              try {
                setResult(await test({}))
              } catch (err) {
                setResult({ ok: false, message: errorMessage(err) })
              } finally {
                setTesting(false)
              }
            }}
          >
            {testing ? <span className="working">Testing</span> : 'Test connection'}
          </Button>
          <span className="cap">Lists models · uses no tokens</span>
        </div>
        {result && (
          <p className={cn('mt-3 font-mono text-[12.5px]', result.ok ? 'text-ok' : 'text-review')} role="status">
            {result.ok ? '✓' : '!'} {result.message}
          </p>
        )}
        <p className="mt-5 border-t border-line pt-3 text-[12px] leading-relaxed text-muted">
          Single-user demonstration. Use fictional or non-sensitive data only. Not certified for any regulated use.
        </p>
      </DialogContent>
    </Dialog>
  )
}
