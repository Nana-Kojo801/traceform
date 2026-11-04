import { useEffect, useState } from 'react'
import { useMutation } from 'convex/react'
import { Plus, X } from 'lucide-react'
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

  // Re-sync from the server when not editing (e.g. after "Use sample form").
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
    setFields([...fields, { id, sectionId, label: '', type: 'short_text', required: false, description: '', choices: [], extractionHint: '' }])
    touch()
  }

  function updateField(id: string, patch: Partial<FormField>) {
    setFields((fs) => fs.map((f) => (f.id === id ? { ...f, ...patch } : f)))
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

  let n = 0

  return (
    <div className="mx-auto w-full max-w-[1000px] px-5 pb-20 pt-8 md:px-8">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-4 border-b border-ink pb-4">
        <div>
          <h2 className="text-[26px] font-semibold tracking-[-0.035em]">Form</h2>
          <p className="mt-1 text-[13.5px] text-muted">The fields Meta’s model fills in. Descriptions are sent to the model; be specific.</p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <span className="mr-2 font-mono text-[11px] uppercase text-muted" aria-live="polite">
            {dirty ? <span className="text-conflict">● Unsaved</span> : '✓ Saved'} · {fields.length}/{MAX_FIELDS_PER_SCHEMA}
          </span>
          <Button
            variant="ghost"
            onClick={async () => {
              if (fields.length && !confirm('Replace this form with the sample grant-intake form?')) return
              try {
                setDirty(false)
                await loadSample({ projectId })
                toast.success('Sample form loaded')
              } catch (err) {
                toast.error(errorMessage(err))
              }
            }}
          >
            Use sample form
          </Button>
          <Button onClick={addSection}>Add section</Button>
          <Button variant="ink" onClick={onSave} disabled={!dirty || saving}>
            {saving ? <span className="working">Saving</span> : 'Save form'}
          </Button>
        </div>
      </div>

      {sections.length === 0 && (
        <div className="py-12">
          <p className="text-[15px] font-medium">No sections yet.</p>
          <p className="mt-1 text-[13.5px] text-muted">Add a section, or start from the sample form.</p>
        </div>
      )}

      {sections.map((section) => {
        const inSection = fields.filter((f) => f.sectionId === section.id)
        return (
          <section key={section.id} className="mt-10">
            <div className="flex items-center gap-3 border-b border-ink pb-2">
              <input
                value={section.title}
                onChange={(e) => {
                  setSections(sections.map((s) => (s.id === section.id ? { ...s, title: e.target.value } : s)))
                  touch()
                }}
                aria-label="Section title"
                className="min-w-0 flex-1 border-0 bg-transparent font-mono text-xs uppercase tracking-[0.06em] text-ink outline-none focus-visible:underline"
              />
              <span className="font-mono text-[11px] text-faint">{inSection.length} fields</span>
              <button
                aria-label={`Remove section ${section.title}`}
                className="grid size-8 place-items-center rounded-[6px] text-faint hover:bg-wash hover:text-review"
                onClick={() => {
                  if (inSection.length && !confirm(`Remove "${section.title}" and its ${inSection.length} fields?`)) return
                  setSections(sections.filter((s) => s.id !== section.id))
                  setFields(fields.filter((f) => f.sectionId !== section.id))
                  touch()
                }}
              >
                <X className="size-4" />
              </button>
            </div>
            <ul>
              {inSection.map((f) => {
                n++
                return (
                  <li key={f.id} className="grid grid-cols-[28px_minmax(0,1fr)] gap-x-3 border-b border-line py-5">
                    <span className="pt-7 font-mono text-[11px] text-faint">{String(n).padStart(2, '0')}</span>
                    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_170px_160px] sm:items-end">
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor={`label-${f.id}`}>Label</Label>
                        <Input id={`label-${f.id}`} value={f.label} onChange={(e) => updateField(f.id, { label: e.target.value })} placeholder="e.g. Contract start date" className="text-[15px] font-medium" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor={`type-${f.id}`}>Type</Label>
                        <NativeSelect id={`type-${f.id}`} value={f.type} onChange={(e) => updateField(f.id, { type: e.target.value as FieldType })}>
                          {FIELD_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {TYPE_LABELS[t]}
                            </option>
                          ))}
                        </NativeSelect>
                      </div>
                      <div className="flex h-[34px] items-center gap-3">
                        <label className="flex items-center gap-2 text-[13px] text-ink-2">
                          <input type="checkbox" checked={f.required} onChange={(e) => updateField(f.id, { required: e.target.checked })} className="size-4 accent-[#0b0b0c]" />
                          Required
                        </label>
                        <button
                          aria-label={`Remove field ${f.label || f.id}`}
                          className="grid size-8 place-items-center rounded-[6px] text-faint hover:bg-wash hover:text-review"
                          onClick={() => {
                            setFields(fields.filter((x) => x.id !== f.id))
                            touch()
                          }}
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                      <div className="flex flex-col gap-1.5 sm:col-span-2">
                        <Label htmlFor={`desc-${f.id}`}>Description for the model</Label>
                        <Input id={`desc-${f.id}`} value={f.description} onChange={(e) => updateField(f.id, { description: e.target.value })} placeholder="What exactly should this field contain?" />
                      </div>
                      <p className="self-end truncate pb-2 font-mono text-[11px] text-faint" title={f.id}>{f.id.startsWith('new_field') ? 'id set on save' : `id ${f.id}`}</p>
                      {f.type === 'single_select' && (
                        <div className="flex flex-col gap-1.5 sm:col-span-3">
                          <Label htmlFor={`choices-${f.id}`}>Allowed choices · comma-separated</Label>
                          <Input
                            id={`choices-${f.id}`}
                            value={f.choices.join(', ')}
                            onChange={(e) => updateField(f.id, { choices: e.target.value.split(',').map((c) => c.trimStart()) })}
                            placeholder="New, Renewal"
                          />
                        </div>
                      )}
                      <div className="flex flex-col gap-1.5 sm:col-span-3">
                        <Label htmlFor={`hint-${f.id}`}>Extraction hint · optional</Label>
                        <Input id={`hint-${f.id}`} value={f.extractionHint} onChange={(e) => updateField(f.id, { extractionHint: e.target.value })} />
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
            <Button variant="ghost" className="mt-2" onClick={() => addField(section.id)}>
              <Plus /> Add field
            </Button>
          </section>
        )
      })}
    </div>
  )
}
