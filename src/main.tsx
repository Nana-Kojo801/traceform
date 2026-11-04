import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConvexProvider, ConvexReactClient } from 'convex/react'
import { BrowserRouter } from 'react-router'
import { Toaster } from 'sonner'
import './index.css'
import { App } from './app'
import { MissingConfig } from './components/missing-config'

const url = import.meta.env.VITE_CONVEX_URL as string | undefined
const root = createRoot(document.getElementById('root')!)

if (!url) {
  root.render(<MissingConfig />)
} else {
  const convex = new ConvexReactClient(url)
  root.render(
    <StrictMode>
      <ConvexProvider client={convex}>
        <BrowserRouter>
          <App />
          <Toaster
            theme="dark"
            position="bottom-right"
            toastOptions={{
              style: { background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--foreground)', borderRadius: 14 },
            }}
          />
        </BrowserRouter>
      </ConvexProvider>
    </StrictMode>,
  )
}
