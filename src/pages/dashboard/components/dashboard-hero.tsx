import { useState, type FormEvent } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { api } from '@convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { Input, Label } from '@/components/ui/input'
import { errorMessage } from '@/lib/errors'

export function DashboardHero() {
  const demoId = useQuery(api.demo.find)
  const loadDemo = useMutation(api.demo.load)
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)

  async function openDemo(reset = false) {
    if (reset && !confirm('Reset the sample project? Its review edits and live runs will be deleted.')) return
    setBusy(true)
    try {
      const id = await loadDemo({ reset })
      navigate(`/projects/${id}?tab=review`)
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="grid items-end gap-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-14">
      <div className="flex flex-col gap-6">
        <h1 className="text-[44px] font-semibold leading-[0.95] tracking-[-0.05em] sm:text-[64px]">
          Every answer,
          <br />
          accounted for.
        </h1>
        <p className="max-w-[540px] font-serif text-[18px] leading-[1.5] text-ink-2 sm:text-[19px]">
          Upload messy documents, define a form, and Meta’s model fills it in. Each answer carries its own{' '}
          <span className="hl">footnote</span>
          <span className="fn">1</span>. Contradictions are shown, never settled for you, and anything undocumented stays blank.
        </p>
      </div>
      <div className="flex flex-col gap-4 lg:pb-1.5">
        <div className="flex flex-wrap gap-2.5">
          <NewProjectDialog />
          <Button size="lg" onClick={() => openDemo()} disabled={busy}>
            {demoId ? 'Open the sample' : 'Try the sample'}
          </Button>
          {demoId && (
            <Button size="lg" variant="ghost" onClick={() => openDemo(true)} disabled={busy}>
              Reset sample
            </Button>
          )}
        </div>
        <p className="border-t border-ink pt-3 font-mono text-[11.5px] leading-relaxed text-ink-2">
          <b>1</b>&nbsp;&nbsp;A verbatim quote from your source, found and located by code, not by the model. A person approves every answer.
        </p>
      </div>
    </section>
  )
}

function NewProjectDialog() {
  const create = useMutation(api.projects.create)
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    try {
      const id = await create({ name, description })
      navigate(`/projects/${id}?tab=sources`)
    } catch (err) {
      toast.error(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="lg" variant="ink">
          New project
        </Button>
      </DialogTrigger>
      <DialogContent title="New project" description="Name it, then add TXT, DOCX, PDF files or photos of pages.">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="project-name">Name</Label>
            <Input id="project-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Vendor onboarding packet" maxLength={120} autoFocus required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="project-description">Description · optional</Label>
            <Input id="project-description" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} />
          </div>
          <Button type="submit" variant="ink" className="self-start" disabled={busy || !name.trim()}>
            Create project
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
