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

  const item = 'flex w-full flex-col items-start gap-0.5 px-3.5 py-2.5 text-left outline-none hover:bg-wash focus-visible:bg-wash'

  return (
    <div ref={ref} className="relative">
      <Button disabled={disabled} onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu" className="max-md:h-11">
        Export
        <ChevronDown className="size-3.5" />
      </Button>
      {open && (
        <div role="menu" className="absolute right-0 top-[calc(100%+6px)] z-40 w-64 border border-ink bg-white py-1 shadow-[0_12px_32px_rgb(11_11_12/0.12)] animate-fade-in">
          <button
            role="menuitem"
            className={item}
            onClick={() => {
              const input = build()
              download(toCsv(input), exportFileName(project.name, 'csv', input.exportedAt), 'text/csv;charset=utf-8')
              setOpen(false)
            }}
          >
            <span className="text-[13.5px] font-medium">CSV</span>
            <span className="text-xs text-muted">One row, reviewed values and statuses</span>
          </button>
          <button
            role="menuitem"
            className={`${item} border-t border-line`}
            onClick={() => {
              const input = build()
              download(toJson(input), exportFileName(project.name, 'json', input.exportedAt), 'application/json')
              setOpen(false)
            }}
          >
            <span className="text-[13.5px] font-medium">JSON</span>
            <span className="text-xs text-muted">Values, citations, verification, review state</span>
          </button>
        </div>
      )}
    </div>
  )
}
