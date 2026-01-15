import React from 'react'
import { PanelRightClose, Plus } from 'lucide-react'

export interface WidgetPanelHeaderProps {
  tabCount: number
  onCollapse: () => void
  onAddWidget?: () => void
}

export function WidgetPanelHeader({
  tabCount,
  onCollapse,
  onAddWidget,
}: WidgetPanelHeaderProps) {
  return (
    <div
      className="flex items-center justify-between gap-2 border-b px-4 py-3"
      style={{ borderColor: 'var(--line)', background: 'var(--surface-2)' }}
    >
      <div className="flex items-center gap-2">
        <span
          className="text-xs font-medium uppercase tracking-wide"
          style={{ color: 'var(--text-muted)' }}
        >
          Widgets
        </span>
        {tabCount > 0 && (
          <span className="badge badge--secondary text-[10px]">
            {tabCount}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1">
        {onAddWidget && (
          <button
            type="button"
            onClick={onAddWidget}
            className="rounded p-1.5 transition-colors hover:bg-[var(--surface-3)]"
            aria-label="Add widget"
            title="Add widget"
          >
            <Plus className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
          </button>
        )}
        <button
          type="button"
          onClick={onCollapse}
          className="rounded p-1.5 transition-colors hover:bg-[var(--surface-3)]"
          aria-label="Close widgets panel"
          title="Close panel"
        >
          <PanelRightClose className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
        </button>
      </div>
    </div>
  )
}
