import { useRef, useState, type DragEvent } from 'react'
import { useMutation } from 'convex/react'
import { AlertTriangle, CircleCheck, Download, Eye, FileText, Loader2, ScanLine, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { MAX_DOCUMENTS_PER_PROJECT, MAX_FILE_BYTES, MAX_TOTAL_CHARS } from '@shared/limits'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { parseFile, validateFile } from '@/lib/parse-file'
import { formatBytes } from '@/lib/format'
import { errorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'
import { SourceViewer } from './source-viewer'
import type { DocumentRow } from './types'

const SAMPLE_FILES = [
  { href: '/samples/application-narrative.txt', name: 'application-narrative.txt' },
  { href: '/samples/follow-up-email.docx', name: 'follow-up-email.docx' },
  { href: '/samples/board-meeting-minutes.txt', name: 'board-meeting-minutes.txt' },
]

interface Pending {
  key: string
  name: string
}

export function SourcesPanel({ projectId, documents }: { projectId: Id<'projects'>; documents: DocumentRow[] }) {
  const add = useMutation(api.documents.add)
  const remove = useMutation(api.documents.remove)
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [pending, setPending] = useState<Pending[]>([])
  const [previewId, setPreviewId] = useState<string | null>(null)

  const totalChars = documents.filter((d) => d.parseStatus === 'parsed').reduce((n, d) => n + d.text.length, 0)
  const slots = MAX_DOCUMENTS_PER_PROJECT - documents.length

  async function handleFiles(list: FileList | File[]) {
    const files = Array.from(list)
    if (files.length === 0) return
    if (files.length > slots) {
      toast.error(`You can add ${Math.max(0, slots)} more document${slots === 1 ? '' : 's'} (limit ${MAX_DOCUMENTS_PER_PROJECT} per project).`)
      files.splice(Math.max(0, slots))
    }
    for (const file of files) {
      const invalid = validateFile(file)
      if (invalid) {
        toast.error(invalid)
        continue
      }
      const key = `${file.name}-${file.size}-${Math.random()}`
      setPending((p) => [...p, { key, name: file.name }])
      try {
        const parsed = await parseFile(file)
        await add({ projectId, ...parsed })
        if (parsed.parseStatus === 'parsed') toast.success(`${file.name} parsed`)
        else toast.warning(`${file.name}: ${parsed.parseError}`)
      } catch (err) {
        toast.error(`${file.name}: ${errorMessage(err)}`)
      } finally {
        setPending((p) => p.filter((x) => x.key !== key))
      }
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  const preview = documents.find((d) => d._id === previewId && d.parseStatus === 'parsed')

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
      <div className="space-y-3">
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            'flex flex-col items-center rounded-2xl border border-dashed px-4 py-8 text-center transition-colors',
            dragging ? 'border-accent bg-accent-soft' : 'border-border-strong bg-surface',
          )}
        >
          <Upload className="size-6 text-accent" aria-hidden />
          <p className="mt-2 text-sm font-medium">Drop TXT, DOCX, or PDF files</p>
          <p className="mt-1 text-xs text-subtle-foreground">
            Up to {MAX_DOCUMENTS_PER_PROJECT} files, {MAX_FILE_BYTES / 1024} KB each. Text is extracted in your browser.
          </p>
          <Button className="mt-4" variant="secondary" size="sm" onClick={() => inputRef.current?.click()} disabled={slots <= 0}>
            Choose files
          </Button>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".txt,.docx,.pdf,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="sr-only"
            aria-label="Choose files to upload"
            onChange={(e) => {
              if (e.target.files) handleFiles(e.target.files)
              e.target.value = ''
            }}
          />
          <p className="mt-3 text-[11.5px] text-subtle-foreground">
            Scanned PDFs without a text layer are not supported (no OCR).
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5 text-xs">
            <span className="font-medium">
              Documents {documents.length}/{MAX_DOCUMENTS_PER_PROJECT}
            </span>
            <span className={cn('text-subtle-foreground', totalChars > MAX_TOTAL_CHARS && 'text-review')}>
              {totalChars.toLocaleString()} / {MAX_TOTAL_CHARS.toLocaleString()} characters
            </span>
          </div>
          {documents.length === 0 && pending.length === 0 && (
            <p className="px-4 py-6 text-center text-[13px] text-muted-foreground">No documents yet.</p>
          )}
          <ul className="divide-y divide-border">
            {documents.map((d) => (
              <li key={d._id} className={cn('flex items-start gap-3 px-4 py-3', previewId === d._id && 'bg-surface-2')}>
                {d.parseStatus === 'needs_ocr' ? (
                  <ScanLine className="mt-0.5 size-4 shrink-0 text-conflicting" aria-hidden />
                ) : d.parseStatus === 'failed' ? (
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-review" aria-hidden />
                ) : (
                  <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-[13px] font-medium">{d.name}</span>
                    <Badge tone="outline" className="uppercase">
                      {d.kind}
                    </Badge>
                    {d.parseStatus === 'parsed' && (
                      <Badge tone="supported">
                        <CircleCheck aria-hidden /> Parsed
                      </Badge>
                    )}
                    {d.parseStatus === 'needs_ocr' && <Badge tone="conflicting">Needs OCR, not supported</Badge>}
                    {d.parseStatus === 'failed' && <Badge tone="review">Failed</Badge>}
                  </div>
                  <p className="mt-0.5 text-xs text-subtle-foreground">
                    {formatBytes(d.sizeBytes)}
                    {d.parseStatus === 'parsed' &&
                      ` · ${d.text.length.toLocaleString()} chars · ${d.segments.length} ${d.kind === 'pdf' ? 'pages' : 'paragraphs'}`}
                  </p>
                  {d.parseError && <p className="mt-1 text-xs text-review">{d.parseError}</p>}
                </div>
                <div className="flex shrink-0 gap-0.5">
                  {d.parseStatus === 'parsed' && (
                    <Button variant="ghost" size="icon-sm" aria-label={`Preview ${d.name}`} onClick={() => setPreviewId(d._id)}>
                      <Eye />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove ${d.name}`}
                    onClick={async () => {
                      if (!confirm(`Remove ${d.name}? Past results that cite it will show “Removed document”.`)) return
                      try {
                        await remove({ documentId: d._id })
                        if (previewId === d._id) setPreviewId(null)
                      } catch (err) {
                        toast.error(errorMessage(err))
                      }
                    }}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </li>
            ))}
            {pending.map((p) => (
              <li key={p.key} className="flex items-center gap-3 px-4 py-3 text-[13px] text-muted-foreground">
                <Loader2 className="size-4 animate-spin text-accent" aria-hidden />
                Parsing {p.name}…
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-border bg-surface px-4 py-3">
          <p className="text-xs font-medium">Sample files for upload testing</p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {SAMPLE_FILES.map((f) => (
              <li key={f.href}>
                <a
                  href={f.href}
                  download
                  className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border px-2.5 text-xs text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                >
                  <Download className="size-3.5" aria-hidden />
                  {f.name}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="min-h-[420px] lg:h-[calc(100dvh-15.5rem)] lg:min-h-[520px]">
        {preview ? (
          <SourceViewer
            documents={documents}
            viewDocId={preview._id}
            onViewDoc={setPreviewId}
            result={undefined}
            active={null}
            onFocusEvidence={() => {}}
            plain
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-border bg-surface p-8 text-center">
            <Eye className="size-6 text-subtle-foreground" aria-hidden />
            <p className="mt-2 text-sm font-medium">Extracted text preview</p>
            <p className="mt-1 max-w-sm text-[13px] text-muted-foreground">
              Select the eye icon on a document to see exactly the text the model and the verifier will read.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
