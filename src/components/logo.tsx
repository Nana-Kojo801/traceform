export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="9" fill="var(--surface-3)" />
      <path d="M9 10h14M9 16h8M9 22h11" stroke="var(--accent)" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="23" cy="16" r="2.4" fill="var(--accent)" />
    </svg>
  )
}
