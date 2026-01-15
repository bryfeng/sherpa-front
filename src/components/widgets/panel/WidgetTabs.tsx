import React from 'react'
import { X } from 'lucide-react'
import type { Widget } from '../../../types/widgets'

export interface WidgetTabsProps {
  tabs: Widget[]
  activeId: string | null
  onTabClick: (id: string) => void
  onTabClose: (id: string) => void
}

export function WidgetTabs({
  tabs,
  activeId,
  onTabClick,
  onTabClose,
}: WidgetTabsProps) {
  if (tabs.length === 0) return null

  return (
    <div
      className="flex items-center gap-1 overflow-x-auto border-b px-2 py-1"
      style={{ borderColor: 'var(--line)', background: 'var(--surface-2)' }}
      role="tablist"
      aria-label="Widget tabs"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeId
        return (
          <div
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onTabClick(tab.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onTabClick(tab.id)
              }
            }}
            className={`
              group flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium
              cursor-pointer transition-colors select-none
              ${isActive
                ? 'bg-[var(--accent)]/15 text-[var(--accent)]'
                : 'text-[var(--text-muted)] hover:bg-[var(--surface-3)] hover:text-[var(--text)]'
              }
            `}
          >
            <span className="truncate max-w-[120px]">{tab.title}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onTabClose(tab.id)
              }}
              className={`
                rounded p-0.5 transition-colors
                ${isActive
                  ? 'hover:bg-[var(--accent)]/25'
                  : 'opacity-0 group-hover:opacity-100 hover:bg-[var(--surface-4)]'
                }
              `}
              aria-label={`Close ${tab.title}`}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
