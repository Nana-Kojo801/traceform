import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { useNavigate } from 'react-router'
import { ArrowRight, FileText, GitCompareArrows, CircleDashed, ScanSearch } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { errorMessage } from '@/lib/errors'

export function DemoCard() {
  const demoId = useQuery(api.demo.find)
  const loadDemo = useMutation(api.demo.load)
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)

  async function open() {
    setBusy(true)
    try {
      const id = await loadDemo({})
      navigate(`/projects/${id}?tab=review`)
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="relative overflow-hidden p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold">Try the sample project</h2>
        <Badge tone="outline">Sample dataset / precomputed demo, not live AI</Badge>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        A fictional nonprofit grant intake: an application narrative, a follow-up email (.docx), and board minutes. Works
        without an API key. From the project you can also run Meta&apos;s model live on the same documents.
      </p>
      <ul className="mt-4 grid gap-2 text-[13px] text-muted-foreground sm:grid-cols-2">
        <li className="flex items-center gap-2">
          <FileText className="size-4 text-accent" aria-hidden /> 9 fields, 3 source documents
        </li>
        <li className="flex items-center gap-2">
          <GitCompareArrows className="size-4 text-conflicting" aria-hidden /> A requested-amount conflict
        </li>
        <li className="flex items-center gap-2">
          <CircleDashed className="size-4 text-missing" aria-hidden /> An undocumented field left blank
        </li>
        <li className="flex items-center gap-2">
          <ScanSearch className="size-4 text-review" aria-hidden /> A fabricated citation caught and repaired
        </li>
      </ul>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button onClick={open} disabled={busy}>
          {demoId ? 'Open demo' : 'Try demo'}
          <ArrowRight />
        </Button>
      </div>
    </Card>
  )
}
