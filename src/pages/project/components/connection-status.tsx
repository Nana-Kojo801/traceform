import { useState } from 'react'
import { useAction } from 'convex/react'
import type { FunctionReturnType } from 'convex/server'
import { Loader2, PlugZap } from 'lucide-react'
import { api } from '@convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { errorMessage } from '@/lib/errors'
import { MAX_DOCUMENTS_PER_PROJECT, MAX_FILE_BYTES, MAX_TOTAL_CHARS } from '@shared/limits'

type Status = FunctionReturnType<typeof api.runs.status>

export function ConnectionStatus({ status }: { status: Status | undefined }) {
  const test = useAction(api.extraction.testConnection)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [testing, setTesting] = useState(false)
  const configured = status?.keyConfigured

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          className="inline-flex h-9 items-center gap-2 rounded-full border border-border px-3 text-xs text-muted-foreground hover:bg-surface-2 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring outline-none"
          aria-label="Meta API connection status"
        >
          <span
            className={cn(
              'size-2 rounded-full',
              status === undefined ? 'bg-subtle-foreground' : configured ? 'bg-supported' : 'bg-review',
            )}
            aria-hidden
          />
          {status === undefined ? 'Checking…' : configured ? <span className="font-mono">{status.model}</span> : 'API key missing'}
        </button>
      </DialogTrigger>
      <DialogContent title="Meta Model API" description="Live extraction runs on the server; the key never reaches the browser.">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Key</dt>
          <dd>{configured ? 'Configured on the server' : 'Not configured: set MODEL_API_KEY in Convex env'}</dd>
          <dt className="text-muted-foreground">Model</dt>
          <dd className="font-mono text-[13px]">{status?.model ?? '…'}</dd>
          <dt className="text-muted-foreground">Today</dt>
          <dd>
            {status ? `${status.dailyRunsUsed} of ${status.dailyRunCap} live runs used (UTC day)` : '…'}
          </dd>
          <dt className="text-muted-foreground">Caps</dt>
          <dd className="text-[13px] text-muted-foreground">
            {MAX_DOCUMENTS_PER_PROJECT} docs per project, {MAX_FILE_BYTES / 1024} KB per file, {MAX_TOTAL_CHARS.toLocaleString()} characters per
            extraction, {status ? status.cooldownMs / 1000 : 30}s cooldown per project.
          </dd>
        </dl>
        <div className="mt-4 flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
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
            {testing ? <Loader2 className="animate-spin" /> : <PlugZap />}
            Test connection
          </Button>
          <span className="text-xs text-subtle-foreground">Lists models only; uses no tokens.</span>
        </div>
        {result && (
          <p className={cn('mt-3 text-sm', result.ok ? 'text-supported' : 'text-review')} role="status">
            {result.message}
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
