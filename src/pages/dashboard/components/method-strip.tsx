const STEPS = [
  { who: 'Model', title: 'Extract', body: 'Each answer arrives with a verbatim quote, or is marked missing.' },
  { who: 'Code', title: 'Verify', body: 'Every quote is searched for in its source; types are checked.' },
  { who: 'Model', title: 'Repair', body: 'A failed quote gets one retry: cite it exactly, or give up.' },
  { who: 'Model', title: 'Second opinion', body: 'Advisory: does the quote really answer the field?' },
  { who: 'You', title: 'Decide', body: 'Approve, edit, or pick a side. Export CSV or JSON.' },
]

export function MethodStrip() {
  return (
    <section aria-labelledby="method-heading" className="flex flex-col gap-4">
      <h2 id="method-heading" className="text-xl font-semibold tracking-[-0.02em]">
        Method
      </h2>
      <ol className="grid grid-cols-1 border-t border-ink sm:grid-cols-2 lg:grid-cols-5">
        {STEPS.map((s, i) => (
          <li key={s.title} className="flex flex-col gap-2 border-b border-line py-4 sm:pr-5 lg:border-b-0 lg:border-l lg:px-5 lg:first:border-l-0 lg:first:pl-0">
            <span className={s.who === 'You' ? 'cap text-ink' : 'cap'}>
              {String(i + 1).padStart(2, '0')} · {s.who}
            </span>
            <span className="text-base font-semibold">{s.title}</span>
            <span className="text-[13px] leading-relaxed text-muted">{s.body}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}
