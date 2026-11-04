import { Check, Sparkles, Upload } from 'lucide-react'

const STEPS = [
  { title: 'Add your documents', body: 'Text, Word and PDF are read in the browser. Photos and scans are read by Meta AI.', icon: Upload, tile: 'bg-ground text-ink' },
  { title: 'Extract and verify', body: 'Meta’s model answers each field with a quote. We check every quote is really in the source.', icon: Sparkles, tile: 'bg-ink text-hl' },
  { title: 'Review and export', body: 'Approve, edit or pick a side when sources disagree. Export to CSV or JSON.', icon: Check, tile: 'bg-ok-soft text-ok-text' },
]

export function HowItWorks() {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-[20px] font-semibold tracking-[-0.015em]">How it works</h2>
      <div className="grid gap-2.5 md:grid-cols-3 md:gap-4">
        {STEPS.map(({ title, body, icon: Icon, tile }) => (
          <div key={title} className="card flex gap-4 p-4 md:p-[22px]">
            <span className={`grid size-11 shrink-0 place-items-center rounded-[12px] ${tile}`}>
              <Icon className="size-[22px]" strokeWidth={2.2} />
            </span>
            <span className="flex flex-col gap-1">
              <span className="font-semibold">{title}</span>
              <span className="text-[14px] leading-[1.45] text-muted">{body}</span>
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
