import { useState } from 'react'
import { useMutation } from 'convex/react'
import { motion } from 'motion/react'
import { fadeUp, soft } from '@/lib/motion'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { api } from '@convex/_generated/api'
import { Button } from '@/components/ui/button'
import { errorMessage } from '@/lib/errors'
import { NewProjectDialog } from './new-project-dialog'

/** A highlighter stroke that sweeps across the text. */
const HL_SWEEP = {
  backgroundImage: 'linear-gradient(var(--hl), var(--hl))',
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'left center',
  boxDecorationBreak: 'clone',
  WebkitBoxDecorationBreak: 'clone',
} as const

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
      <motion.div className="flex flex-col gap-5 md:gap-6" initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}>
        <motion.span variants={fadeUp} className="inline-flex h-[30px] items-center gap-2 self-start rounded-full bg-card px-3 text-[13px] font-medium shadow-[inset_0_0_0_1px_var(--line)]">
          <span className="cite">1</span>Every answer has a source
        </motion.span>
        <motion.h1 variants={fadeUp} className="text-[36px] font-bold leading-[1.04] tracking-[-0.035em] md:text-[48px] md:leading-[1.04]">
          Fill forms from messy documents,{' '}
          <motion.span
            className="rounded-[3px] px-0.5"
            initial={{ backgroundSize: '0% 100%' }}
            animate={{ backgroundSize: '100% 100%' }}
            transition={{ delay: 0.55, duration: 0.7, ease: [0.32, 0.72, 0, 1] }}
            style={HL_SWEEP}
          >
            with proof
          </motion.span>
          .
        </motion.h1>
        <motion.p variants={fadeUp} className="max-w-[470px] text-[16px] leading-relaxed text-muted md:text-[18px]">
          Upload emails, letters and scans. Meta’s model fills in your form, and each answer links to the exact sentence it came from.
        </motion.p>
        <motion.div variants={fadeUp} className="grid grid-cols-2 gap-2.5 sm:flex">
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
        </motion.div>
      </motion.div>
      <HeroPreview />
    </section>
  )
}

/** A static picture of the product, built from the sample project’s real content. */
function HeroPreview() {
  return (
    <motion.figure
      aria-label="Example: a conflict between two sources, each linked to its sentence"
      className="rounded-[16px] bg-[#e6e6e1] p-3.5 md:p-[22px]"
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ ...soft, delay: 0.15 }}
    >
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ ...soft, delay: 0.3 }} className="card p-4 shadow-[0_10px_30px_rgb(17_17_19/0.08)] md:px-6 md:py-[22px]">
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
          <motion.div
            className="rounded-[12px] bg-ink px-3.5 py-3 text-white"
            initial={{ backgroundColor: '#f4f4f2', color: '#111113' }}
            animate={{ backgroundColor: '#111113', color: '#ffffff' }}
            transition={{ delay: 1.1, duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
          >
            <span className="flex items-center gap-1.5 text-[17px] font-bold md:text-[20px]">
              $54,000 <span className="cite bg-hl text-ink">2</span>
            </span>
            <span className="text-[12.5px] opacity-70">Follow-up email</span>
          </motion.div>
        </div>
      </motion.div>
      <motion.div initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ ...soft, delay: 0.75 }} className="card mt-3 px-4 py-3.5 shadow-[0_10px_30px_rgb(17_17_19/0.08)] md:ml-12 md:mt-3.5 md:px-[22px] md:py-[18px]">
        <span className="flex items-center gap-1.5 text-[12.5px] text-muted">
          <span className="cite">2</span>follow-up-email.docx
        </span>
        <p className="mt-2 font-serif text-[15px] leading-relaxed text-ink-2 md:text-[15.5px]">
          …
          <motion.span
            className="rounded-[3px]"
            initial={{ backgroundSize: '0% 100%' }}
            animate={{ backgroundSize: '100% 100%' }}
            transition={{ delay: 1.1, duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
            style={HL_SWEEP}
          >
            we are revising our total request to $54,000.
          </motion.span>{' '}
          All other budget lines stay the same.
        </p>
      </motion.div>
    </motion.figure>
  )
}
