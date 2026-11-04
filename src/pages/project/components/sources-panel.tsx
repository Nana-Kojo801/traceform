import { useRef, useState, type DragEvent } from 'react'
import { useAction, useMutation } from 'convex/react'
import { toast } from 'sonner'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { MAX_DOCUMENTS_PER_PROJECT, MAX_FILE_BYTES, MAX_TOTAL_CHARS, MAX_TRANSCRIBE_PAGES } from '@shared/limits'
import { Button } from '@/components/ui/button'
import { parseFile, renderForVision, validateFile } from '@/lib/parse-file'
import { pageCount } from '@shared/segments'
import { errorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'
import { SourceViewer } from './source-viewer'
import { Camera, FileText, FileType, Upload, X } from 'lucide-react'
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

const TILE = {
  txt: { label: 'Text file', icon: FileText, cls: 'bg-fill text-ink' },
  docx: { label: 'Word file', icon: FileType, cls: 'bg-[#e8f0ff] text-[#1f4fb3]' },
  pdf: { label: 'PDF', icon: FileText, cls: 'bg-bad-soft text-bad-text' },
  image: { label: 'Photo', icon: Camera, cls: 'bg-[#ecebff] text-[#4b44c9]' },
} as const

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
      setPending((p) => [...p, { key, name: file.name, stage: 'Reading' }])
      try {
        const parsed = await parseFile(file)
        if (parsed.parseStatus === 'needs_ocr' && (parsed.kind === 'pdf' || parsed.kind === 'image')) {
          try {
            stage('Preparing pages')
            const blobs = await renderForVision(file, parsed.kind)
            stage('Uploading')
            const storageIds = []
            for (const blob of blobs) {
              const url = await generateUploadUrl({})
              const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': blob.type }, body: blob })
              if (!res.ok) throw new Error('Upload failed.')
              storageIds.push(((await res.json()) as { storageId: Id<'_storage'> }).storageId)
            }
            stage('Meta AI is reading it')
            await transcribe({ projectId, name: file.name, kind: parsed.kind, sizeBytes: file.size, storageIds })
          } catch (err) {
            // Keep an honest record of the file and why it has no text.
            const reason = errorMessage(err)
            await add({ projectId, ...parsed, parseError: `${parsed.parseError} ${reason}` })
            toast.warning(`${file.name}: ${reason}`)
            continue
          }
          toast.success(`${file.name} read by Meta AI`, { description: 'Compare the text with the original before relying on it.' })
          continue
        }
        await add({ projectId, ...parsed })
        if (parsed.parseStatus === 'parsed') toast.success(`${file.name} added`)
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
    <div className="grid grid-cols-1 gap-5 px-4 pb-8 lg:h-full lg:grid-cols-[380px_minmax(0,1fr)] lg:px-7 lg:pb-7">
      <section aria-label="Documents" className="scrollbar-thin flex min-h-0 flex-col gap-5 lg:overflow-y-auto">
        <div>
          <div className="flex justify-between px-4 pb-1.5 text-[13px] text-muted">
            <span>
              {documents.length} of {MAX_DOCUMENTS_PER_PROJECT} files
            </span>
            <span className={cn(totalChars > MAX_TOTAL_CHARS && 'text-bad-text')}>{totalChars.toLocaleString()} characters</span>
          </div>
          <div className="card overflow-hidden">
            {documents.length === 0 && pending.length === 0 && <p className="px-4 py-5 text-[15px] text-muted">No documents yet.</p>}
            {documents.map((d, i) => {
              const selected = preview?._id === d._id
              const t = TILE[d.kind]
              const Icon = t.icon
              return (
                <div key={d._id} className={cn('relative flex items-center gap-3.5 px-4 py-3', selected && 'bg-[rgb(17_17_19/0.04)]', i > 0 && 'before:absolute before:left-[66px] before:right-0 before:top-0 before:h-px before:bg-line-soft')}>
                  <span className={cn('grid size-9 shrink-0 place-items-center rounded-[12px]', d.parseStatus === 'parsed' ? t.cls : 'bg-fill text-muted')}>
                    <Icon className="size-[18px]" strokeWidth={2} />
                  </span>
                  <button
                    onClick={() => d.parseStatus === 'parsed' && setPreviewId(d._id)}
                    disabled={d.parseStatus !== 'parsed'}
                    className="flex min-w-0 flex-1 flex-col gap-0.5 text-left outline-none focus-visible:outline-2 focus-visible:outline-ink disabled:cursor-default"
                    aria-label={d.parseStatus === 'parsed' ? `Preview ${d.name}` : d.name}
                  >
                    <span className="truncate text-[15px] font-semibold">{d.name}</span>
                    <span className={cn('text-[13px]', d.parseStatus === 'parsed' ? 'text-muted' : 'text-bad-text')}>
                      {d.parseStatus === 'parsed'
                        ? d.transcribed
                          ? `${d.kind === 'image' ? 'Photo' : 'Scanned PDF'} · read by Meta AI`
                          : `${t.label} · ${plural(pageCount(d.segments) || d.segments.length, pageCount(d.segments) ? 'page' : 'paragraph')}`
                        : (d.parseError ?? 'Could not read this file')}
                    </span>
                  </button>
                  <button
                    aria-label={`Remove ${d.name}`}
                    className="grid size-8 shrink-0 place-items-center rounded-full text-faint outline-none hover:bg-bad-soft hover:text-bad-text focus-visible:outline-2 focus-visible:outline-ink"
                    onClick={async () => {
                      if (!confirm(`Remove ${d.name}?`)) return
                      try {
                        await remove({ documentId: d._id })
                        if (previewId === d._id) setPreviewId(null)
                      } catch (err) {
                        toast.error(errorMessage(err))
                      }
                    }}
                  >
                    <X className="size-4" strokeWidth={2.4} />
                  </button>
                </div>
              )
            })}
            {pending.map((p) => (
              <div key={p.key} className="relative flex items-center gap-3.5 border-t border-line-soft px-4 py-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-[12px] bg-fill">
                  <span className="size-4 animate-spin rounded-full border-2 border-ink border-t-transparent" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span className="truncate text-[15px] font-semibold">{p.name}</span>
                  <span className="working text-[13px] text-muted">{p.stage}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            'flex flex-col items-center gap-2 rounded-[16px] border-2 border-dashed px-5 py-8 text-center transition-colors',
            dragging ? 'border-ink bg-card' : 'border-[#d3d3ce]',
          )}
        >
          <span className="grid size-11 place-items-center rounded-[12px] bg-card shadow-[inset_0_0_0_1px_var(--line)]">
            <Upload className="size-5" strokeWidth={2.2} />
          </span>
          <span className="mt-1 text-[16px] font-semibold">Add files</span>
          <span className="text-[13.5px] text-muted">Text, Word, PDF or photos of pages</span>
          <Button variant="ink" className="mt-2" onClick={() => inputRef.current?.click()} disabled={slots <= 0}>
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
          <span className="mt-1 text-[12px] text-muted">
            Up to {MAX_FILE_BYTES / 1024} KB per text file. Scans: first {MAX_TRANSCRIBE_PAGES} pages. Fictional or non-sensitive data only.
          </span>
        </div>

        <div className="px-4">
          <p className="pb-1.5 text-[13px] text-muted">Sample files to try</p>
          <p className="flex flex-wrap gap-1.5">
            {SAMPLE_FILES.map((f) => (
              <a key={f.href} href={f.href} download className="inline-flex h-8 items-center rounded-full bg-card px-3 text-[13px] shadow-[inset_0_0_0_1px_var(--line)] hover:bg-[#fafaf8]">
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
          <div className="card flex h-full min-h-[520px] flex-col items-center justify-center gap-2 p-10 text-center">
            <p className="text-[17px] font-semibold">Preview</p>
            <p className="max-w-sm text-[15px] text-muted">The exact text Meta’s model and our checks will read appears here.</p>
          </div>
        )}
      </section>
    </div>
  )
}
