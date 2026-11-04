import { useEffect, useState } from 'react'
import { useMutation } from 'convex/react'
import { FilePlus2, Loader2, Plus, Save, Trash2, Wand2 } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { FIELD_TYPES, type FieldType, type FormField, type FormSection } from '@shared/types'
import { MAX_FIELDS_PER_SCHEMA } from '@shared/limits'
import { Button } from '@/components/ui/button'
import { Input, Label, NativeSelect } from '@/components/ui/input'
import { errorMessage } from '@/lib/errors'
import type { SchemaRow } from './types'

const TYPE_LABELS: Record<FieldType, string> = {
  short_text: 'Short text',
  long_text: 'Long text',
  number: 'Number',
  date: 'Date',
  single_select: 'Single select',
}

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 48) || 'field'
}

function uniqueId(base: string, taken: Set<string>) {
  let id = base
  let n = 2
  while (taken.has(id)) id = `${base}_${n++}`
  return id
}

export function FormBuilder({ projectId, schema }: { projectId: Id<'projects'>; schema: SchemaRow }) {
  const save = useMutation(api.forms.save)
  const loadSample = useMutation(api.forms.useSample)
  const [sections, setSections] = useState<FormSection[]>(schema?.sections ?? [])
  const [fields, setFields] = useState<FormField[]>(schema?.fields ?? [])
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)

  // Re-sync from the server when not editing (e.g. after "Use sample schema").
  useEffect(() => {
    if (!dirty) {
      setSections(schema?.sections ?? [])
      setFields(schema?.fields ?? [])
    }
  }, [schema, dirty])

  const touch = () => setDirty(true)

  function addSection() {
    const id = uniqueId(`section_${sections.length + 1}`, new Set(sections.map((s) => s.id)))
    setSections([...sections, { id, title: `Section ${sections.length + 1}` }])
    touch()
  }

  function addField(sectionId: string) {
    if (fields.length >= MAX_FIELDS_PER_SCHEMA) return toast.error(`At most ${MAX_FIELDS_PER_SCHEMA} fields.`)
    const id = uniqueId('new_field', new Set(fields.map((f) => f.id)))
    setFields([
      ...fields,
      { id, sectionId, label: '', type: 'short_text', required: false, description: '', choices: [], extractionHint: '' },
    ])
    touch()
  }

  function updateField(id: string, patch: Partial<FormField>) {
    setFields((fs) =>
      fs.map((f) => {
        if (f.id !== id) return f
        return { ...f, ...patch }
      }),
    )
    touch()
  }

  async function onSave() {
    setSaving(true)
    try {
      // Brand-new fields get a stable id derived from their label on first save.
      const taken = new Set(fields.filter((f) => !f.id.startsWith('new_field')).map((f) => f.id))
      const withIds = fields.map((f) => {
        if (!f.id.startsWith('new_field')) return f
        const id = uniqueId(slug(f.label), taken)
        taken.add(id)
        return { ...f, id }
      })
      await save({ projectId, sections, fields: withIds })
      setFields(withIds)
      setDirty(false)
      toast.success('Form saved')
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-4xl space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={onSave} disabled={!dirty || saving}>
          {saving ? <Loader2 className="animate-spin" /> : <Save />}
          Save form
        </Button>
        <Button variant="secondary" onClick={addSection}>
          <FilePlus2 /> Add section
        </Button>
        <Button
          variant="ghost"
          onClick={async () => {
            if (fields.length && !confirm('Replace this form with the sample grant-intake schema?')) return
            try {
              setDirty(false)
              await loadSample({ projectId })
              toast.success('Sample schema loaded')
            } catch (err) {
              toast.error(errorMessage(err))
            }
          }}
        >
          <Wand2 /> Use sample schema
        </Button>
        <span className="text-xs text-subtle-foreground" aria-live="polite">
          {dirty ? 'Unsaved changes' : 'All changes saved'} · {fields.length}/{MAX_FIELDS_PER_SCHEMA} fields
        </span>
      </div>

      {sections.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          No sections yet. Add a section, or start from the sample schema.
        </div>
      )}

      {sections.map((section) => {
        const inSection = fields.filter((f) => f.sectionId === section.id)
        return (
          <section key={section.id} className="rounded-2xl border border-border bg-surface">
            <div className="flex items-center gap-2 border-b border-border p-3">
              <Input
                value={section.title}
                onChange={(e) => {
                  setSections(sections.map((s) => (s.id === section.id ? { ...s, title: e.target.value } : s)))
                  touch()
                }}
                aria-label="Section title"
                className="h-8 max-w-xs font-medium"
              />
              <span className="text-xs text-subtle-foreground">{inSection.length} fields</span>
              <Button
                variant="ghost"
                size="icon-sm"
                className="ml-auto"
                aria-label={`Remove section ${section.title}`}
                onClick={() => {
                  if (inSection.length && !confirm(`Remove "${section.title}" and its ${inSection.length} fields?`)) return
                  setSections(sections.filter((s) => s.id !== section.id))
                  setFields(fields.filter((f) => f.sectionId !== section.id))
                  touch()
                }}
              >
                <Trash2 />
              </Button>
            </div>
            <ul className="divide-y divide-border">
              {inSection.map((f) => (
                <li key={f.id} className="grid gap-2 p-3 sm:grid-cols-[minmax(0,1.4fr)_150px_auto] sm:items-end">
                  <div className="space-y-1">
                    <Label htmlFor={`label-${f.id}`}>Label</Label>
                    <Input id={`label-${f.id}`} value={f.label} onChange={(e) => updateField(f.id, { label: e.target.value })} placeholder="e.g. Contract start date" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`type-${f.id}`}>Type</Label>
                    <NativeSelect id={`type-${f.id}`} value={f.type} onChange={(e) => updateField(f.id, { type: e.target.value as FieldType })}>
                      {FIELD_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {TYPE_LABELS[t]}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                  <div className="flex items-center gap-2 pb-1">
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <input type="checkbox" checked={f.required} onChange={(e) => updateField(f.id, { required: e.target.checked })} className="size-3.5 accent-[var(--accent)]" />
                      Required
                    </label>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remove field ${f.label || f.id}`}
                      onClick={() => {
                        setFields(fields.filter((x) => x.id !== f.id))
                        touch()
                      }}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label htmlFor={`desc-${f.id}`}>Description for the model</Label>
                    <Input id={`desc-${f.id}`} value={f.description} onChange={(e) => updateField(f.id, { description: e.target.value })} placeholder="What exactly should this field contain?" />
                  </div>
                  <p className="self-center font-mono text-[11px] text-subtle-foreground sm:pb-2">{f.id.startsWith('new_field') ? 'id set on save' : `id: ${f.id}`}</p>
                  {f.type === 'single_select' && (
                    <div className="space-y-1 sm:col-span-3">
                      <Label htmlFor={`choices-${f.id}`}>Allowed choices (comma-separated)</Label>
                      <Input
                        id={`choices-${f.id}`}
                        value={f.choices.join(', ')}
                        onChange={(e) => updateField(f.id, { choices: e.target.value.split(',').map((c) => c.trimStart()) })}
                        placeholder="New, Renewal"
                      />
                    </div>
                  )}
                  <div className="space-y-1 sm:col-span-3">
                    <Label htmlFor={`hint-${f.id}`}>Extraction hint (optional)</Label>
                    <Input id={`hint-${f.id}`} value={f.extractionHint} onChange={(e) => updateField(f.id, { extractionHint: e.target.value })} />
                  </div>
                </li>
              ))}
            </ul>
            <div className="p-3">
              <Button variant="ghost" size="sm" onClick={() => addField(section.id)}>
                <Plus /> Add field
              </Button>
            </div>
          </section>
        )
      })}
    </div>
  )
}
