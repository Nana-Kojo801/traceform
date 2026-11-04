export function MissingConfig() {
  return (
    <div className="mx-auto max-w-lg px-4 py-24">
      <h1 className="text-lg font-semibold">TraceForm is not configured</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        <code className="font-mono">VITE_CONVEX_URL</code> is not set. Run <code className="font-mono">npx convex dev</code> to
        create <code className="font-mono">.env.local</code>, or set it in your hosting provider, then rebuild.
      </p>
    </div>
  )
}
