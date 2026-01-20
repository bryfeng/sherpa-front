/**
 * Generic ErrorBoundary Component
 *
 * A reusable error boundary that can be customized for different sections
 * of the application. Provides error catching, logging, and recovery.
 */

import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

export interface ErrorBoundaryProps {
  children: ReactNode
  /** Identifier for error logging */
  name?: string
  /** Custom fallback UI */
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode)
  /** Called when error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  /** Called when user attempts recovery */
  onReset?: () => void
  /** Show home button for navigation recovery */
  showHomeButton?: boolean
  /** Custom reset button label */
  resetLabel?: string
  /** Minimal styling for inline boundaries */
  minimal?: boolean
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, State> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo })

    const boundaryName = this.props.name || 'unknown'
    console.error(`[ErrorBoundary:${boundaryName}]`, error, errorInfo)

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    this.props.onReset?.()
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      const { error } = this.state
      const { fallback, minimal, showHomeButton, resetLabel = 'Try again' } = this.props

      // Custom fallback component
      if (fallback) {
        if (typeof fallback === 'function') {
          return fallback(error!, this.handleReset)
        }
        return fallback
      }

      // Minimal inline error display
      if (minimal) {
        return (
          <div
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: 'var(--text)',
            }}
          >
            <AlertTriangle className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--error)' }} />
            <span className="truncate">{error?.message || 'Something went wrong'}</span>
            <button
              onClick={this.handleReset}
              className="ml-auto flex-shrink-0 rounded px-2 py-1 text-xs hover:opacity-80"
              style={{ background: 'var(--surface-2)' }}
            >
              Retry
            </button>
          </div>
        )
      }

      // Full error display
      return (
        <div
          className="flex flex-col items-center justify-center gap-4 rounded-xl p-8 text-center"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            minHeight: '200px',
          }}
        >
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full"
            style={{ background: 'rgba(239, 68, 68, 0.1)' }}
          >
            <AlertTriangle className="h-8 w-8" style={{ color: 'var(--error)' }} />
          </div>

          <div className="max-w-md">
            <h2
              className="text-lg font-semibold"
              style={{ color: 'var(--text)' }}
            >
              Something went wrong
            </h2>
            <p
              className="mt-2 text-sm"
              style={{ color: 'var(--text-muted)' }}
            >
              {error?.message || 'An unexpected error occurred. Please try again.'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90"
              style={{
                background: 'var(--accent)',
                color: 'var(--bg)',
              }}
            >
              <RefreshCw className="h-4 w-4" />
              {resetLabel}
            </button>

            {showHomeButton && (
              <button
                onClick={this.handleGoHome}
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--line)',
                  color: 'var(--text)',
                }}
              >
                <Home className="h-4 w-4" />
                Go home
              </button>
            )}
          </div>

          {/* Debug info in development */}
          {import.meta.env.DEV && this.state.errorInfo && (
            <details
              className="mt-4 w-full max-w-lg text-left"
              style={{ color: 'var(--text-muted)' }}
            >
              <summary className="cursor-pointer text-xs hover:underline">
                Error details (dev only)
              </summary>
              <pre
                className="mt-2 overflow-auto rounded-lg p-3 text-xs"
                style={{ background: 'var(--surface-2)', maxHeight: '200px' }}
              >
                {error?.stack}
                {'\n\nComponent Stack:'}
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
