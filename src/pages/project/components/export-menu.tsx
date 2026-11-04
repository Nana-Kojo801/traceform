import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { exportFileName, toCsv, toJson, type ExportInput } from '@shared/export'
import type { FormSchema } from '@shared/types'
import type { DocumentRow, ProjectDoc, SchemaRow, Workspace } from './types'

function download(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

interface Props {
  project: ProjectDoc
  schema: SchemaRow
  documents: DocumentRow[]
  workspace: Workspace
}

export function ExportMenu({ project, schema, documents, workspace }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const disabled = !workspace.selected || !schema || workspace.results.length === 0

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', esc)
    }
  }, [open])

  function build(): ExportInput {
    const formSchema: FormSchema = { sections: schema?.sections ?? [], fields: schema?.fields ?? [] }
    return {
      project: { name: project.name, isDemo: project.isDemo },
      schema: formSchema,
      documents: documents.map((d) => ({ id: d._id, name: d.name })),
      run: workspace.selected
        ? { model: workspace.selected.model, startedAt: workspace.selected.startedAt, isPrecomputed: workspace.selected.isPrecomputed }
        : null,
      results: workspace.results.map((r) => ({ fieldId: r.fieldId, raw: r.raw, current: r.current })),
      exportedAt: Date.now(),
    }
  }

  const item = 'flex w-full flex-col items-start gap-0.5 px-4 py-3 text-left outline-none hover:bg-ground focus-visible:bg-ground'

  return (
    <div ref={ref} className="relative">
      <Button variant="tint" disabled={disabled} onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu" className="max-md:h-11 max-md:px-3.5">
        Export
        <ChevronDown className="size-3.5" />
      </Button>
      {open && (
        <div role="menu" className="absolute right-0 top-[calc(100%+8px)] z-40 w-72 overflow-hidden rounded-[16px] bg-card shadow-[0_16px_40px_rgb(0_0_0/0.14)] animate-fade-in">
          <button
            role="menuitem"
            className={item}
            onClick={() => {
              const input = build()
              download(toCsv(input), exportFileName(project.name, 'csv', input.exportedAt), 'text/csv;charset=utf-8')
              setOpen(false)
            }}
          >
            <span className="text-[15px] font-semibold">CSV</span>
            <span className="text-[13px] text-muted">Reviewed values, one row</span>
          </button>
          <button
            role="menuitem"
            className={`${item} border-t border-line-soft`}
            onClick={() => {
              const input = build()
              download(toJson(input), exportFileName(project.name, 'json', input.exportedAt), 'application/json')
              setOpen(false)
            }}
          >
            <span className="text-[15px] font-semibold">JSON</span>
            <span className="text-[13px] text-muted">Values with their sources</span>
          </button>
        </div>
      )}
    </div>
  )
}
