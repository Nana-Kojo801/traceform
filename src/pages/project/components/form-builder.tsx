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
import { cn } from '@/lib/utils'
import type { SchemaRow } from './types'

const TYPE_LABELS: Record<FieldType, string> = {
  short_text: 'Text',
  long_text: 'Paragraph',
  number: 'Number',
  date: 'Date',
  single_select: 'Choice',
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

  const inputCls = 'bg-ground shadow-none focus-visible:shadow-[inset_0_0_0_2px_var(--ink)]'

  return (
    <div className="mx-auto w-full max-w-[860px] px-4 pb-20 lg:px-7">
      <div className="flex flex-wrap items-center gap-2.5 pb-2">
        <span className={cn('mr-auto text-[13px]', dirty ? 'font-semibold text-warn-text' : 'text-muted')} aria-live="polite">
          {dirty ? 'Unsaved changes' : 'All changes saved'} · {fields.length} of {MAX_FIELDS_PER_SCHEMA} fields
        </span>
        <Button
          variant="ghost"
          onClick={async () => {
            if (fields.length && !confirm('Replace this form with the sample grant form?')) return
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
        <Button variant="tint" onClick={addSection}>
          <Plus strokeWidth={2.6} /> Section
        </Button>
        <Button variant="ink" onClick={onSave} disabled={!dirty || saving}>
          {saving ? <span className="working">Saving</span> : 'Save'}
        </Button>
      </div>

      {sections.length === 0 && (
        <div className="card mt-4 flex flex-col items-center gap-2 px-6 py-12 text-center">
          <p className="text-[17px] font-semibold">No fields yet</p>
          <p className="text-[15px] text-muted">Add a section, or start from the sample form.</p>
        </div>
      )}

      {sections.map((section) => {
        const inSection = fields.filter((f) => f.sectionId === section.id)
        return (
          <section key={section.id} className="mt-6">
            <div className="flex items-center gap-2 px-4 pb-1.5">
              <input
                value={section.title}
                onChange={(e) => {
                  setSections(sections.map((s) => (s.id === section.id ? { ...s, title: e.target.value } : s)))
                  touch()
                }}
                aria-label="Section name"
                className="min-w-0 flex-1 rounded-[12px] bg-transparent text-[13px] font-medium text-muted outline-none focus-visible:text-ink"
              />
              <button
                aria-label={`Remove section ${section.title}`}
                className="grid size-7 place-items-center rounded-full text-faint hover:bg-bad-soft hover:text-bad-text"
                onClick={() => {
                  if (inSection.length && !confirm(`Remove "${section.title}" and its ${inSection.length} fields?`)) return
                  setSections(sections.filter((s) => s.id !== section.id))
                  setFields(fields.filter((f) => f.sectionId !== section.id))
                  touch()
                }}
              >
                <X className="size-4" strokeWidth={2.4} />
              </button>
            </div>
            <div className="card overflow-hidden">
              {inSection.map((f, i) => (
                <div key={f.id} className={cn('grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_170px_auto] sm:items-end', i > 0 && 'border-t border-line-soft')}>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`label-${f.id}`}>Field name</Label>
                    <Input id={`label-${f.id}`} value={f.label} onChange={(e) => updateField(f.id, { label: e.target.value })} placeholder="e.g. Contract start date" className={cn(inputCls, 'font-semibold')} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`type-${f.id}`}>Type</Label>
                    <NativeSelect id={`type-${f.id}`} value={f.type} onChange={(e) => updateField(f.id, { type: e.target.value as FieldType })} className={inputCls}>
                      {FIELD_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {TYPE_LABELS[t]}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                  <div className="flex h-11 items-center gap-2">
                    <label className="flex items-center gap-2 text-[14px]">
                      <input type="checkbox" checked={f.required} onChange={(e) => updateField(f.id, { required: e.target.checked })} className="size-[18px] accent-[#111113]" />
                      Required
                    </label>
                    <button
                      aria-label={`Remove field ${f.label || 'untitled'}`}
                      className="grid size-8 place-items-center rounded-full text-faint hover:bg-bad-soft hover:text-bad-text"
                      onClick={() => {
                        setFields(fields.filter((x) => x.id !== f.id))
                        touch()
                      }}
                    >
                      <X className="size-4" strokeWidth={2.4} />
                    </button>
                  </div>
                  <div className="flex flex-col gap-1.5 sm:col-span-3">
                    <Label htmlFor={`desc-${f.id}`}>What should it contain?</Label>
                    <Input id={`desc-${f.id}`} value={f.description} onChange={(e) => updateField(f.id, { description: e.target.value })} placeholder="Helps Meta’s model find the right answer" className={inputCls} />
                  </div>
                  {f.type === 'single_select' && (
                    <div className="flex flex-col gap-1.5 sm:col-span-3">
                      <Label htmlFor={`choices-${f.id}`}>Choices, separated by commas</Label>
                      <Input
                        id={`choices-${f.id}`}
                        value={f.choices.join(', ')}
                        onChange={(e) => updateField(f.id, { choices: e.target.value.split(',').map((c) => c.trimStart()) })}
                        placeholder="New, Renewal"
                        className={inputCls}
                      />
                    </div>
                  )}
                </div>
              ))}
              <button onClick={() => addField(section.id)} className={cn('flex w-full items-center gap-2 px-4 py-3.5 text-[15px] font-semibold hover:bg-[#fafaf8]', inSection.length > 0 && 'border-t border-line-soft')}>
                <span className="grid size-6 place-items-center rounded-full bg-ink text-white">
                  <Plus className="size-3.5" strokeWidth={3} />
                </span>
                Add field
              </button>
            </div>
          </section>
        )
      })}
    </div>
  )
}
