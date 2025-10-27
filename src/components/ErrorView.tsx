// TODO: Workstream 9 — Empty & Error States

import React from 'react'
import { AlertTriangle } from 'lucide-react'

import { Button } from './ui/primitives'

export interface ErrorViewProps {
  title?: string
  message?: string
  onRetry?: () => void
  retryLabel?: string
  className?: string
}

export function ErrorView({
  title = 'Something went off course',
  message = 'Sherpa hit a snag fetching this data. Try again to refresh the panel.',
  onRetry,
  retryLabel = 'Retry',
  className = '',
}: ErrorViewProps) {
  return (
    <div
      role="status"
      className={`flex w-full flex-col items-start gap-[var(--s1)] rounded-xl border px-[var(--s3)] py-[var(--s2)] ${className}`.trim()}
      style={{
        borderColor: 'rgba(255, 107, 107, 0.25)',
        background: 'rgba(255, 107, 107, 0.07)',
        color: 'var(--text)',
      }}
    >
      <div className="flex items-center gap-[var(--s1)]">
        <AlertTriangle className="h-4 w-4" color="var(--danger)" aria-hidden="true" />
        <span className="font-semibold" style={{ fontSize: 'var(--fs-sm)' }}>
          {title}
        </span>
      </div>
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        {message}
      </p>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry} style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}>
          {retryLabel}
        </Button>
      )}
    </div>
  )
}

export default ErrorView
