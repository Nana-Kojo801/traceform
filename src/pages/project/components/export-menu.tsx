import { Braces, Sheet } from 'lucide-react'
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
  const disabled = !workspace.selected || !schema || workspace.results.length === 0

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

  return (
    <div className="flex items-center gap-1 rounded-full border border-border p-0.5" role="group" aria-label="Export reviewed values">
      <Button
        variant="ghost"
        size="sm"
        disabled={disabled}
        title="Download CSV: one row per project, reviewed values"
        onClick={() => {
          const input = build()
          download(toCsv(input), exportFileName(project.name, 'csv', input.exportedAt), 'text/csv;charset=utf-8')
        }}
      >
        <Sheet />
        CSV
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={disabled}
        title="Download JSON: values, statuses, evidence, review state"
        onClick={() => {
          const input = build()
          download(toJson(input), exportFileName(project.name, 'json', input.exportedAt), 'application/json')
        }}
      >
        <Braces />
        JSON
      </Button>
    </div>
  )
}
