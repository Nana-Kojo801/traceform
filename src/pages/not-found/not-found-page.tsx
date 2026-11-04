import { Link } from 'react-router'
import { TopBar } from '@/components/top-bar'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <>
      <TopBar />
      <main className="mx-auto w-full max-w-xl px-6 py-24">
        <p className="cap">404</p>
        <h1 className="mt-2 border-b border-ink pb-3 text-3xl font-semibold tracking-[-0.04em]">Nothing to trace here</h1>
        <p className="mt-4 text-ink-2">This page or project does not exist, or it was deleted.</p>
        <Button asChild variant="ink" className="mt-6">
          <Link to="/">All projects</Link>
        </Button>
      </main>
    </>
  )
}
