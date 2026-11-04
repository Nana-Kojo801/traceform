import { useState, type FormEvent } from 'react'
import { useMutation } from 'convex/react'
import { useNavigate } from 'react-router'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input, Label } from '@/components/ui/input'
import { errorMessage } from '@/lib/errors'

export function CreateProjectForm() {
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
    <Card className="p-5">
      <h2 className="text-sm font-semibold">New project</h2>
      <p className="mt-1 text-[13px] text-muted-foreground">Upload your own TXT, DOCX, or PDF files and build a form.</p>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="project-name">Name</Label>
          <Input id="project-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Vendor onboarding packet" maxLength={120} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="project-description">Description (optional)</Label>
          <Input id="project-description" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} />
        </div>
        <Button type="submit" variant="secondary" disabled={busy || !name.trim()}>
          <Plus />
          Create project
        </Button>
      </form>
    </Card>
  )
}
