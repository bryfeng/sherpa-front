/**
 * Chat-Specific Error Boundary
 *
 * Catches errors in the chat section while preserving the sidebar and
 * widget panel. Provides chat-specific recovery options.
 */

import { Component, type ErrorInfo, type ReactNode } from 'react'
import { MessageSquareOff, RefreshCw, Trash2 } from 'lucide-react'

interface Props {
  children: ReactNode
  /** Callback to start a new chat conversation */
  onStartNewChat?: () => void
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ChatErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ChatErrorBoundary] Chat error:', error)
    console.error('[ChatErrorBoundary] Component stack:', errorInfo.componentStack)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  handleStartNewChat = () => {
    this.setState({ hasError: false, error: null })
    this.props.onStartNewChat?.()
  }

  render() {
    if (this.state.hasError) {
      const { error } = this.state

      return (
        <div
          className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center"
          style={{
            background: 'var(--bg)',
          }}
        >
          {/* Error icon */}
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full"
            style={{ background: 'rgba(239, 68, 68, 0.1)' }}
          >
            <MessageSquareOff
              className="h-8 w-8"
              style={{ color: 'var(--error, #ef4444)' }}
            />
          </div>

          {/* Message */}
          <div className="max-w-sm">
            <h3
              className="text-lg font-semibold"
              style={{ color: 'var(--text)' }}
            >
              Chat encountered an error
            </h3>
            <p
              className="mt-2 text-sm"
              style={{ color: 'var(--text-muted)' }}
            >
              Something went wrong with the chat. Your conversation history and
              widgets are safe.
            </p>
            {error && (
              <p
                className="mt-2 rounded-lg px-3 py-2 text-xs font-mono"
                style={{
                  background: 'var(--surface-2)',
                  color: 'var(--text-muted)',
                }}
              >
                {error.message}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={this.handleRetry}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90"
              style={{
                background: 'var(--accent)',
                color: 'var(--bg)',
              }}
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </button>

            {this.props.onStartNewChat && (
              <button
                onClick={this.handleStartNewChat}
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--line)',
                  color: 'var(--text)',
                }}
              >
                <Trash2 className="h-4 w-4" />
                Start new chat
              </button>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ChatErrorBoundary
