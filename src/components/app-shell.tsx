import { Outlet } from 'react-router'

export function AppShell() {
  return (
    <div className="flex min-h-dvh flex-col bg-ground">
      <Outlet />
    </div>
  )
}
