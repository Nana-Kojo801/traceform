import { Link } from 'react-router'
import { HomeBar } from '@/components/top-bar'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <>
      <HomeBar />
      <main className="mx-auto w-full max-w-lg px-6 py-24">
        <div className="card p-8 text-center">
          <p className="text-[13px] font-medium text-muted">404</p>
          <h1 className="mt-1 text-[28px] font-bold tracking-[-0.025em]">Nothing here</h1>
          <p className="mt-2 text-muted">This page or project doesn’t exist, or it was deleted.</p>
          <Button asChild variant="ink" className="mt-6">
            <Link to="/">Back home</Link>
          </Button>
        </div>
      </main>
    </>
  )
}
