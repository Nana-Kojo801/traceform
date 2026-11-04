import { useRef, useState, type DragEvent } from 'react'
import { useAction, useMutation } from 'convex/react'
import { AlertTriangle, CircleCheck, Download, Eye, FileText, Image as ImageIcon, Loader2, ScanEye, ScanLine, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { MAX_DOCUMENTS_PER_PROJECT, MAX_FILE_BYTES, MAX_TOTAL_CHARS, MAX_TRANSCRIBE_PAGES } from '@shared/limits'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { parseFile, renderForVision, validateFile } from '@/lib/parse-file'
import { formatBytes } from '@/lib/format'
import { pageCount } from '@shared/segments'
import { errorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'
import { SourceViewer } from './source-viewer'
import type { DocumentRow } from './types'

const SAMPLE_FILES = [
  { href: '/samples/application-narrative.txt', name: 'application-narrative.txt' },
  { href: '/samples/follow-up-email.docx', name: 'follow-up-email.docx' },
  { href: '/samples/board-meeting-minutes.txt', name: 'board-meeting-minutes.txt' },
  { href: '/samples/site-visit-note-photo.jpg', name: 'site-visit-note-photo.jpg' },
  { href: '/samples/site-visit-note-scan.pdf', name: 'site-visit-note-scan.pdf' },
]

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}

interface Pending {
  key: string
  name: string
  stage: string
}

export function SourcesPanel({ projectId, documents }: { projectId: Id<'projects'>; documents: DocumentRow[] }) {
  const add = useMutation(api.documents.add)
  const generateUploadUrl = useMutation(api.transcribe.generateUploadUrl)
  const transcribe = useAction(api.transcribe.transcribe)
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
      const stage = (text: string) => setPending((p) => p.map((x) => (x.key === key ? { ...x, stage: text } : x)))
      setPending((p) => [...p, { key, name: file.name, stage: 'Parsing' }])
      try {
        const parsed = await parseFile(file)
        if (parsed.parseStatus === 'needs_ocr' && (parsed.kind === 'pdf' || parsed.kind === 'image')) {
          try {
            stage('Rendering pages')
            const blobs = await renderForVision(file, parsed.kind)
            stage('Uploading page images')
            const storageIds = []
            for (const blob of blobs) {
              const url = await generateUploadUrl({})
              const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': blob.type }, body: blob })
              if (!res.ok) throw new Error('Upload failed.')
              storageIds.push(((await res.json()) as { storageId: Id<'_storage'> }).storageId)
            }
            stage(`Transcribing ${blobs.length} page${blobs.length === 1 ? '' : 's'} with Muse Spark vision`)
            await transcribe({ projectId, name: file.name, kind: parsed.kind, sizeBytes: file.size, storageIds })
          } catch (err) {
            // Keep an honest record of the file and why it has no text.
            const reason = errorMessage(err)
            await add({ projectId, ...parsed, parseError: `${parsed.parseError} ${reason}` })
            toast.warning(`${file.name}: ${reason}`)
            continue
          }
          toast.success(`${file.name} transcribed by Muse Spark vision`, { description: 'Review the transcription before relying on it.' })
          continue
        }
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
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
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
          <p className="mt-2 text-sm font-medium">Drop TXT, DOCX, PDF, or photos of pages</p>
          <p className="mt-1 text-xs text-subtle-foreground">
            Up to {MAX_DOCUMENTS_PER_PROJECT} files, {MAX_FILE_BYTES / 1024} KB each for text files. Text is extracted in your browser.
          </p>
          <Button className="mt-4" variant="secondary" size="sm" onClick={() => inputRef.current?.click()} disabled={slots <= 0}>
            Choose files
          </Button>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".txt,.docx,.pdf,.png,.jpg,.jpeg,.webp,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg,image/webp"
            className="sr-only"
            aria-label="Choose files to upload"
            onChange={(e) => {
              if (e.target.files) handleFiles(e.target.files)
              e.target.value = ''
            }}
          />
          <p className="mt-3 max-w-sm text-[11.5px] leading-relaxed text-subtle-foreground">
            Photos and scanned PDFs (first {MAX_TRANSCRIBE_PAGES} pages) are transcribed by Muse Spark vision and labeled
            “model transcription”. Citations are verified against that transcription, not the image.
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
                {d.transcribed ? (
                  <ScanEye className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
                ) : d.kind === 'image' ? (
                  <ImageIcon className="mt-0.5 size-4 shrink-0 text-review" aria-hidden />
                ) : d.parseStatus === 'needs_ocr' ? (
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
                    {d.parseStatus === 'parsed' && !d.transcribed && (
                      <Badge tone="supported">
                        <CircleCheck aria-hidden /> Parsed
                      </Badge>
                    )}
                    {d.transcribed && (
                      <Badge tone="accent" title="Text produced by Muse Spark vision. Quotes are verified against this transcription.">
                        <ScanEye aria-hidden /> Model transcription
                      </Badge>
                    )}
                    {d.parseStatus === 'needs_ocr' && <Badge tone="conflicting">Needs transcription</Badge>}
                    {d.parseStatus === 'failed' && <Badge tone="review">Failed</Badge>}
                  </div>
                  <p className="mt-0.5 text-xs text-subtle-foreground">
                    {formatBytes(d.sizeBytes)}
                    {d.parseStatus === 'parsed' &&
                      ` · ${d.text.length.toLocaleString()} chars · ${plural(pageCount(d.segments) || d.segments.length, pageCount(d.segments) ? 'page' : 'paragraph')}`}
                  </p>
                  {d.transcriptionNote && <p className="mt-1 text-xs text-muted-foreground">Transcription note: {d.transcriptionNote}</p>}
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
                {p.stage} · {p.name}…
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
