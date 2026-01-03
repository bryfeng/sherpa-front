import React from 'react'
import { PanelRightClose, Maximize2, Plus } from 'lucide-react'

export interface ArtifactHeaderProps {
  tabCount: number
  onCollapse: () => void
  onAddArtifact?: () => void
}

export function ArtifactHeader({
  tabCount,
  onCollapse,
  onAddArtifact,
}: ArtifactHeaderProps) {
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
          Artifacts
        </span>
        {tabCount > 0 && (
          <span className="badge badge--secondary text-[10px]">
            {tabCount}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1">
        {onAddArtifact && (
          <button
            type="button"
            onClick={onAddArtifact}
            className="rounded p-1.5 transition-colors hover:bg-[var(--surface-3)]"
            aria-label="Add artifact"
            title="Add artifact"
          >
            <Plus className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
          </button>
        )}
        <button
          type="button"
          onClick={onCollapse}
          className="rounded p-1.5 transition-colors hover:bg-[var(--surface-3)]"
          aria-label="Close artifacts panel"
          title="Close panel"
        >
          <PanelRightClose className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
        </button>
      </div>
    </div>
  )
}
