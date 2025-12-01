import React from 'react'

export function ChartPlaceholder({ label }: { label: string }) {
  return (
    <div
      className="flex h-64 items-center justify-center rounded-2xl border text-sm"
      style={{ borderColor: 'var(--line)', background: 'var(--surface-2)', color: 'var(--text-muted)' }}
      aria-label={label}
    >
      {label}
    </div>
  )
}
