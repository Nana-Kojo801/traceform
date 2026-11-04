import { Link } from 'react-router'

export function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <span className="relative grid shrink-0 place-items-center rounded-[12px] bg-ink" style={{ width: size, height: size }} aria-hidden>
      <svg width={size * 0.53} height={size * 0.53} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round">
        <path d="M5 7h14M12 7v12" />
      </svg>
      <span className="absolute -right-[3px] -top-[3px] size-2.5 rounded-full bg-hl shadow-[0_0_0_2px_var(--ground)]" />
    </span>
  )
}

export function Wordmark() {
  return (
    <Link to="/" className="flex items-center gap-2.5 rounded-[12px] text-[18px] font-bold tracking-[-0.02em] text-ink outline-none focus-visible:outline-2 focus-visible:outline-ink" aria-label="TraceForm home">
      <LogoMark />
      TraceForm
    </Link>
  )
}
