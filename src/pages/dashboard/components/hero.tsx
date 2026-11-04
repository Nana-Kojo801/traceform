import { useState } from 'react'
import { useMutation } from 'convex/react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { api } from '@convex/_generated/api'
import { Button } from '@/components/ui/button'
import { errorMessage } from '@/lib/errors'
import { NewProjectDialog } from './new-project-dialog'

export function Hero() {
  const loadDemo = useMutation(api.demo.load)
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)

  async function openDemo() {
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
    <section className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-10">
      <div className="flex flex-col gap-5 md:gap-6">
        <span className="inline-flex h-[30px] items-center gap-2 self-start rounded-full bg-card px-3 text-[13px] font-medium shadow-[inset_0_0_0_1px_var(--line)]">
          <span className="cite">1</span>Every answer has a source
        </span>
        <h1 className="text-[36px] font-bold leading-[1.04] tracking-[-0.035em] md:text-[48px] md:leading-[1.04]">
          Fill forms from messy documents, <span className="hl px-0.5">with proof</span>.
        </h1>
        <p className="max-w-[470px] text-[16px] leading-relaxed text-muted md:text-[18px]">
          Upload emails, letters and scans. Meta’s model fills in your form, and each answer links to the exact sentence it came from.
        </p>
        <div className="grid grid-cols-2 gap-2.5 sm:flex">
          <NewProjectDialog
            trigger={
              <Button variant="ink" size="lg">
                New project
              </Button>
            }
          />
          <Button size="lg" onClick={openDemo} disabled={busy}>
            Open the sample
          </Button>
        </div>
      </div>
      <HeroPreview />
    </section>
  )
}

/** A static picture of the product, built from the sample project’s real content. */
function HeroPreview() {
  return (
    <figure aria-label="Example: a conflict between two sources, each linked to its sentence" className="rounded-[16px] bg-[#e6e6e1] p-3.5 md:p-[22px]">
      <div className="card p-4 shadow-[0_10px_30px_rgb(17_17_19/0.08)] md:px-6 md:py-[22px]">
        <div className="flex items-center justify-between gap-3">
          <span className="truncate text-[13px] text-muted">Harbor Light grant intake</span>
          <span className="inline-flex h-6 shrink-0 items-center rounded-full bg-warn-soft px-2.5 text-[12px] font-semibold text-warn-text">Sources disagree</span>
        </div>
        <p className="mb-3.5 mt-2.5 text-[17px] font-bold tracking-[-0.02em] md:text-[22px]">Requested amount</p>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-[12px] bg-ground px-3.5 py-3">
            <span className="flex items-center gap-1.5 text-[17px] font-bold md:text-[20px]">
              $48,000 <span className="cite">1</span>
            </span>
            <span className="text-[12.5px] text-muted">Application</span>
          </div>
          <div className="rounded-[12px] bg-ink px-3.5 py-3 text-white">
            <span className="flex items-center gap-1.5 text-[17px] font-bold md:text-[20px]">
              $54,000 <span className="cite bg-hl text-ink">2</span>
            </span>
            <span className="text-[12.5px] text-[#bdbdc2]">Follow-up email</span>
          </div>
        </div>
      </div>
      <div className="card mt-3 px-4 py-3.5 shadow-[0_10px_30px_rgb(17_17_19/0.08)] md:ml-12 md:mt-3.5 md:px-[22px] md:py-[18px]">
        <span className="flex items-center gap-1.5 text-[12.5px] text-muted">
          <span className="cite">2</span>follow-up-email.docx
        </span>
        <p className="mt-2 font-serif text-[15px] leading-relaxed text-ink-2 md:text-[15.5px]">
          …<span className="hl">we are revising our total request to $54,000.</span> All other budget lines stay the same.
        </p>
      </div>
    </figure>
  )
}
