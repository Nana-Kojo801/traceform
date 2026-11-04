export function MissingConfig() {
  return (
    <div className="mx-auto max-w-lg px-6 py-24">
      <p className="cap">Configuration</p>
      <h1 className="mt-2 border-b border-ink pb-3 text-2xl font-semibold tracking-[-0.03em]">Traceform is not configured</h1>
      <p className="mt-4 text-[14px] leading-relaxed text-ink-2">
        <code className="font-mono text-[13px]">VITE_CONVEX_URL</code> is not set. Run <code className="font-mono text-[13px]">npx convex dev</code> to
        create <code className="font-mono text-[13px]">.env.local</code>, or set it in your hosting provider, then rebuild.
      </p>
    </div>
  )
}
