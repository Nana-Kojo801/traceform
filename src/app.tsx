import { Route, Routes } from 'react-router'
import { AppShell } from './components/app-shell'
import { DashboardPage } from './pages/dashboard/dashboard-page'
import { ProjectPage } from './pages/project/project-page'
import { NotFoundPage } from './pages/not-found/not-found-page'

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="projects/:projectId" element={<ProjectPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
