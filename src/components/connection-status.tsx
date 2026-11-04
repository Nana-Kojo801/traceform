import { useState } from 'react'
import { useAction, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { errorMessage } from '@/lib/errors'
import { MAX_DOCUMENTS_PER_PROJECT, MAX_FILE_BYTES, MAX_TOTAL_CHARS } from '@shared/limits'

export function ConnectionStatus({ compact }: { compact?: boolean }) {
  const status = useQuery(api.runs.status)
  const test = useAction(api.extraction.testConnection)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [testing, setTesting] = useState(false)
  const configured = status?.keyConfigured

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          className="flex h-9 items-center gap-2 rounded-full bg-card px-3.5 text-[13px] text-ink-2 shadow-[inset_0_0_0_1px_var(--line)] outline-none hover:bg-[#fafaf8] focus-visible:outline-2 focus-visible:outline-ink"
          aria-label="Meta AI connection status"
        >
          <span className={cn('size-[7px] rounded-full', status === undefined ? 'bg-faint' : configured ? 'bg-ok' : 'bg-bad')} aria-hidden />
          {status === undefined ? 'Checking' : configured ? (compact ? 'Meta AI' : `Meta AI · ${status.model}`) : 'API key missing'}
        </button>
      </DialogTrigger>
      <DialogContent title="Meta AI connection" description="Extraction and photo reading run on the server. The key never reaches your browser.">
        <div className="overflow-hidden rounded-[16px] bg-ground">
          {[
            ['Status', configured ? 'Connected' : 'Key not configured'],
            ['Model', status?.model ?? '…'],
            ['Used today', status ? `${status.dailyRunsUsed} of ${status.dailyRunCap} calls` : '…'],
            ['Limits', `${MAX_DOCUMENTS_PER_PROJECT} files, ${MAX_FILE_BYTES / 1024} KB each, ${MAX_TOTAL_CHARS.toLocaleString()} characters per run`],
          ].map(([k, v], i) => (
            <div key={k} className={cn('flex justify-between gap-6 px-4 py-3 text-[14px]', i > 0 && 'border-t border-line-soft')}>
              <span className="text-muted">{k}</span>
              <span className="text-right font-medium">{v}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Button
            variant="tint"
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
          <span className="text-[13px] text-muted">Uses no tokens</span>
        </div>
        {result && (
          <p className={cn('mt-3 text-[14px] font-medium', result.ok ? 'text-ok-text' : 'text-bad-text')} role="status">
            {result.message}
          </p>
        )}
        <p className="mt-5 text-[12.5px] text-muted">Demo for the Meta AI Hackathon. Use fictional or non-sensitive data only.</p>
      </DialogContent>
    </Dialog>
  )
}
