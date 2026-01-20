/**
 * App-Level Error Boundary
 *
 * Root-level error boundary that catches catastrophic errors and provides
 * a full-page recovery UI. This is the last line of defense.
 */

import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertOctagon, RefreshCw, Bug } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class AppErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo })

    // Log to console with clear marker
    console.error('[AppErrorBoundary] Catastrophic error caught:', error)
    console.error('[AppErrorBoundary] Component stack:', errorInfo.componentStack)

    // TODO: Send to error reporting service (Sentry, etc.)
    // reportError({ error, errorInfo, context: 'app-root' })
  }

  handleReload = () => {
    window.location.reload()
  }

  handleReset = () => {
    // Clear potentially corrupt state
    try {
      // Clear Zustand persisted state that might be corrupt
      const keysToPreserve = ['theme', 'sherpa.llm_model']
      const preserved: Record<string, string | null> = {}

      keysToPreserve.forEach((key) => {
        preserved[key] = localStorage.getItem(key)
      })

      // Clear all sherpa-related storage
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('sherpa') || key.includes('zustand')) {
          localStorage.removeItem(key)
        }
      })

      // Restore preserved items
      keysToPreserve.forEach((key) => {
        if (preserved[key]) {
          localStorage.setItem(key, preserved[key]!)
        }
      })
    } catch {
      // Storage might be unavailable
    }

    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  render() {
    if (this.state.hasError) {
      const { error, errorInfo } = this.state

      return (
        <div
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{
            background: 'var(--bg, #0a0c10)',
            color: 'var(--text, #f8fafc)',
          }}
        >
          <div className="w-full max-w-lg text-center">
            {/* Error icon */}
            <div
              className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full"
              style={{ background: 'rgba(239, 68, 68, 0.15)' }}
            >
              <AlertOctagon
                className="h-10 w-10"
                style={{ color: '#ef4444' }}
              />
            </div>

            {/* Error message */}
            <h1
              className="mb-2 text-2xl font-bold"
              style={{ color: 'var(--text, #f8fafc)' }}
            >
              Something went wrong
            </h1>
            <p
              className="mb-6 text-sm"
              style={{ color: 'var(--text-muted, #94a3b8)' }}
            >
              Sherpa encountered an unexpected error. Your wallet is safe.
              Try refreshing the page or resetting the app state.
            </p>

            {/* Error details */}
            {error && (
              <div
                className="mb-6 rounded-lg p-4 text-left"
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                }}
              >
                <p
                  className="mb-1 text-xs font-medium uppercase tracking-wide"
                  style={{ color: '#ef4444' }}
                >
                  Error Details
                </p>
                <p
                  className="text-sm font-mono break-words"
                  style={{ color: 'var(--text, #f8fafc)' }}
                >
                  {error.message || 'Unknown error'}
                </p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                onClick={this.handleReload}
                className="inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold transition-opacity hover:opacity-90"
                style={{
                  background: 'var(--accent, #f5a623)',
                  color: '#000',
                }}
              >
                <RefreshCw className="h-4 w-4" />
                Refresh Page
              </button>

              <button
                onClick={this.handleReset}
                className="inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-medium transition-colors"
                style={{
                  background: 'transparent',
                  border: '1px solid var(--line, #2d3444)',
                  color: 'var(--text, #f8fafc)',
                }}
              >
                <Bug className="h-4 w-4" />
                Reset App State
              </button>
            </div>

            {/* Dev-only stack trace */}
            {import.meta.env.DEV && errorInfo && (
              <details
                className="mt-8 text-left"
                style={{ color: 'var(--text-muted, #94a3b8)' }}
              >
                <summary className="cursor-pointer text-xs hover:underline">
                  Stack trace (development only)
                </summary>
                <pre
                  className="mt-2 overflow-auto rounded-lg p-4 text-xs"
                  style={{
                    background: 'var(--surface, #12151c)',
                    maxHeight: '300px',
                  }}
                >
                  {error?.stack}
                  {'\n\n--- Component Stack ---'}
                  {errorInfo.componentStack}
                </pre>
              </details>
            )}

            {/* Footer */}
            <p
              className="mt-8 text-xs"
              style={{ color: 'var(--text-muted, #94a3b8)' }}
            >
              If this keeps happening, please{' '}
              <a
                href="https://github.com/anthropics/claude-code/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:opacity-80"
                style={{ color: 'var(--accent, #f5a623)' }}
              >
                report an issue
              </a>
            </p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default AppErrorBoundary
