import { useState, type FormEvent, type ReactNode } from 'react'
import { useMutation } from 'convex/react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { api } from '@convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { Input, Label } from '@/components/ui/input'
import { errorMessage } from '@/lib/errors'

export function NewProjectDialog({ trigger }: { trigger: ReactNode }) {
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
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent title="New project" description="Give it a name. Next, you’ll add your documents.">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="project-name">Name</Label>
            <Input id="project-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Vendor onboarding packet" maxLength={120} autoFocus required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="project-description">Description (optional)</Label>
            <Input id="project-description" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} />
          </div>
          <Button type="submit" variant="ink" size="lg" className="mt-1" disabled={busy || !name.trim()}>
            Create project
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
