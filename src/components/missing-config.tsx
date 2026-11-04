export function MissingConfig() {
  return (
    <div className="mx-auto max-w-lg px-6 py-24">
      <div className="card p-7">
        <h1 className="text-[24px] font-bold tracking-[-0.02em]">TraceForm isn’t configured</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">
          <code className="text-ink">VITE_CONVEX_URL</code> is not set. Run <code className="text-ink">npx convex dev</code> locally, or set it in your hosting provider, then rebuild.
        </p>
      </div>
    </div>
  )
}
