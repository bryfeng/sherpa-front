import React, { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export interface PanelErrorBoundaryProps {
  children: ReactNode
  panelId?: string
  panelTitle?: string
  onRetry?: () => void
}

interface State {
  hasError: boolean
  error: Error | null
}

export class PanelErrorBoundary extends Component<PanelErrorBoundaryProps, State> {
  constructor(props: PanelErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`Panel error [${this.props.panelId || 'unknown'}]:`, error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
    this.props.onRetry?.()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="flex flex-col items-center justify-center gap-3 rounded-xl p-6 text-center"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--error)',
            minHeight: '120px',
          }}
        >
          <AlertTriangle
            className="h-8 w-8"
            style={{ color: 'var(--error)' }}
            aria-hidden="true"
          />
          <div>
            <p
              className="text-sm font-medium"
              style={{ color: 'var(--text)' }}
            >
              {this.props.panelTitle
                ? `Failed to load ${this.props.panelTitle}`
                : 'Something went wrong'}
            </p>
            <p
              className="mt-1 text-xs"
              style={{ color: 'var(--text-muted)' }}
            >
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
          </div>
          <button
            onClick={this.handleRetry}
            className="mt-2 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--line)',
              color: 'var(--text)',
            }}
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Try again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
