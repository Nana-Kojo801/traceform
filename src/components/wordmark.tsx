import { Link } from 'react-router'

/** "Traceform¹": the footnote marker is the brand. */
export function Wordmark() {
  return (
    <Link to="/" className="flex items-baseline rounded-[6px] text-[17px] font-bold tracking-[-0.035em] text-ink outline-none focus-visible:outline-2 focus-visible:outline-ink" aria-label="Traceform home">
      Traceform
      <span aria-hidden className="relative -top-[7px] ml-0.5 bg-hl px-[3px] font-mono text-[10px] font-medium tracking-normal">1</span>
    </Link>
  )
}
