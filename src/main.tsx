import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

type ErrorBoundaryState = {
  hasError: boolean
  message: string
}

class AppErrorBoundary extends React.Component<{
  children: React.ReactNode
}, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, message: '' }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error.message }
  }

  componentDidCatch(error: Error) {
    console.error('App render error:', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', background: '#111', color: '#fff', display: 'grid', placeItems: 'center', padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
          <div style={{ maxWidth: '680px', border: '1px solid rgba(255,255,255,0.2)', padding: '1rem 1.25rem', borderRadius: '12px', background: 'rgba(255,255,255,0.04)' }}>
            <h2 style={{ marginBottom: '0.5rem' }}>UI crashed while rendering</h2>
            <p style={{ opacity: 0.9 }}>Open browser console for details. Error: {this.state.message || 'Unknown error'}</p>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
)
