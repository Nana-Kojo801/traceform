import { useRef, useState, type DragEvent } from 'react'
import { useAction, useMutation } from 'convex/react'
import { toast } from 'sonner'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { MAX_DOCUMENTS_PER_PROJECT, MAX_FILE_BYTES, MAX_TOTAL_CHARS, MAX_TRANSCRIBE_PAGES } from '@shared/limits'
import { Button } from '@/components/ui/button'
import { parseFile, renderForVision, validateFile } from '@/lib/parse-file'
import { formatBytes } from '@/lib/format'
import { pageCount } from '@shared/segments'
import { errorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'
import { SourceViewer } from './source-viewer'
import { X } from 'lucide-react'
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

  const parsedDocs = documents.filter((d) => d.parseStatus === 'parsed')
  const preview = parsedDocs.find((d) => d._id === previewId) ?? parsedDocs[0]

  return (
    <div className="grid grid-cols-1 lg:h-full lg:grid-cols-[440px_minmax(0,1fr)]">
      <section aria-label="Documents" className="flex min-h-0 flex-col border-line lg:overflow-y-auto lg:border-r">
        <div className="flex items-baseline justify-between gap-3 border-b border-line px-5 pb-[18px] pt-[22px]">
          <h2 className="text-[15px] font-semibold">Sources</h2>
          <span className={cn('font-mono text-xs', totalChars > MAX_TOTAL_CHARS ? 'text-review' : 'text-ink-2')}>
            {documents.length} / {MAX_DOCUMENTS_PER_PROJECT} files · {totalChars.toLocaleString()} / {MAX_TOTAL_CHARS.toLocaleString()} chars
          </span>
        </div>

        {documents.length === 0 && pending.length === 0 && <p className="border-b border-line px-5 py-5 text-[13.5px] text-muted">No documents yet.</p>}
        <ul>
          {documents.map((d) => {
            const ext = d.kind === 'image' ? (d.name.split('.').pop() ?? 'img').toUpperCase() : d.kind.toUpperCase()
            const selected = preview?._id === d._id
            const pages = pageCount(d.segments)
            return (
              <li key={d._id} className={cn('grid grid-cols-[44px_minmax(0,1fr)_auto] items-start gap-3.5 border-b border-line px-5 py-4', selected && 'bg-wash')}>
                <span className={cn('pt-0.5 font-mono text-[11px] font-medium tracking-[0.04em]', d.parseStatus === 'parsed' ? 'text-ink' : 'text-faint')}>{ext.slice(0, 4)}</span>
                <button
                  onClick={() => d.parseStatus === 'parsed' && setPreviewId(d._id)}
                  disabled={d.parseStatus !== 'parsed'}
                  className="flex min-w-0 flex-col gap-1 text-left outline-none focus-visible:outline-2 focus-visible:outline-ink disabled:cursor-default"
                  aria-label={d.parseStatus === 'parsed' ? `Preview ${d.name}` : d.name}
                >
                  <span className="truncate text-sm font-medium">{d.name}</span>
                  <span className="font-mono text-[11.5px] text-muted">
                    {formatBytes(d.sizeBytes)}
                    {d.parseStatus === 'parsed' && ` · ${d.text.length.toLocaleString()} chars · ${plural(pages || d.segments.length, pages ? 'page' : 'paragraph')}`}
                  </span>
                  {d.transcribed && (
                    <span className="font-mono text-[11.5px] text-ink">
                      <span className="hl">◉ MODEL TRANSCRIPTION</span>
                      {d.transcriptionNote && <span className="text-muted"> · “{d.transcriptionNote}”</span>}
                    </span>
                  )}
                  {d.parseStatus === 'parsed' && !d.transcribed && <span className="font-mono text-[11.5px] text-ok">✓ PARSED IN BROWSER</span>}
                  {d.parseStatus === 'needs_ocr' && <span className="font-mono text-[11.5px] text-conflict">— NEEDS TRANSCRIPTION</span>}
                  {d.parseStatus === 'failed' && <span className="font-mono text-[11.5px] text-review">! FAILED</span>}
                  {d.parseError && <span className="text-[12.5px] leading-snug text-review">{d.parseError}</span>}
                </button>
                <button
                  aria-label={`Remove ${d.name}`}
                  className="grid size-8 place-items-center rounded-[6px] text-faint outline-none hover:bg-white hover:text-review focus-visible:outline-2 focus-visible:outline-ink"
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
                  <X className="size-4" />
                </button>
              </li>
            )
          })}
          {pending.map((p) => (
            <li key={p.key} className="grid grid-cols-[44px_minmax(0,1fr)] gap-3.5 border-b border-line px-5 py-4">
              <span className="pt-0.5 font-mono text-[11px] text-faint">{(p.name.split('.').pop() ?? '').toUpperCase().slice(0, 4)}</span>
              <div className="flex min-w-0 flex-col gap-2">
                <span className="truncate text-sm font-medium">{p.name}</span>
                <span className="working font-mono text-[11.5px] uppercase text-ink-2">{p.stage}</span>
                <span className="h-[3px] w-full overflow-hidden bg-line">
                  <span className="block h-full w-1/3 animate-pulse bg-ink" />
                </span>
              </div>
            </li>
          ))}
        </ul>

        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            'm-5 flex flex-col items-center gap-2.5 rounded-[6px] border border-dashed px-5 py-7 text-center transition-colors',
            dragging ? 'border-ink bg-hl' : 'border-[#a9abb2]',
          )}
        >
          <span className="text-[15px] font-semibold">Drop files here</span>
          <span className="max-w-[320px] text-[13px] leading-relaxed text-muted">
            TXT, DOCX and PDF are read in your browser. Photos and scanned PDFs (first {MAX_TRANSCRIBE_PAGES} pages) are transcribed by Muse Spark vision.
          </span>
          <Button className="mt-1" onClick={() => inputRef.current?.click()} disabled={slots <= 0}>
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
          <span className="font-mono text-[10.5px] uppercase text-faint">
            Max {MAX_FILE_BYTES / 1024} KB per text file · fictional or non-sensitive data only
          </span>
        </div>

        <div className="mx-5 mb-5 mt-auto border-t border-line pt-3">
          <p className="cap mb-1.5">Sample files</p>
          <p className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11.5px]">
            {SAMPLE_FILES.map((f) => (
              <a key={f.href} href={f.href} download className="text-ink-2 underline decoration-line-strong underline-offset-4 hover:text-ink hover:decoration-ink">
                {f.name}
              </a>
            ))}
          </p>
        </div>
      </section>

      <section aria-label="Preview" className="min-h-[520px] min-w-0 lg:min-h-0">
        {preview ? (
          <SourceViewer key={preview._id} documents={documents} viewDocId={preview._id} onViewDoc={setPreviewId} active={null} plain defaultMode={preview.transcribed ? 'side' : 'text'} />
        ) : (
          <div className="flex h-full min-h-[520px] flex-col items-start justify-center gap-2 bg-desk px-10">
            <p className="cap">Preview</p>
            <p className="max-w-sm font-serif text-[17px] leading-relaxed text-ink-2">
              Exactly the text the model and the verifier will read appears here, page by page.
            </p>
          </div>
        )}
      </section>
    </div>
  )
}
