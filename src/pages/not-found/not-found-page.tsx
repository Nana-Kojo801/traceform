import { Link } from 'react-router'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <p className="font-mono text-xs text-subtle-foreground">404</p>
      <h1 className="mt-2 text-xl font-semibold">Nothing to trace here</h1>
      <p className="mt-2 text-sm text-muted-foreground">This page or project does not exist.</p>
      <Button asChild className="mt-6">
        <Link to="/">Back to projects</Link>
      </Button>
    </div>
  )
}
