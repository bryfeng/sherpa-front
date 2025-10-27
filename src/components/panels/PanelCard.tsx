// TODO: Workstream 1 — Shell Split (Monolith → Feature Slices)

import React from 'react'
import { ChevronDown, ChevronUp, Maximize2 } from 'lucide-react'

import type { WidgetAction, WidgetDensity } from '../../types/widgets'
import { ErrorView } from '../ErrorView'
import { Skeleton } from '../Skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/primitives'

interface SourceLink {
  label: string
  href?: string
}

function SourcesFooter({ sources }: { sources?: SourceLink[] }) {
  if (!sources || sources.length === 0) return null

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
      <span className="text-slate-600">Sources:</span>
      {sources.map((source, index) => {
        const key = `${source.label}-${index}`
        if (source.href) {
          return (
            <a
              key={key}
              href={source.href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-600 transition hover:border-slate-300 hover:text-slate-800"
            >
              {source.label}
            </a>
          )
        }
        return (
          <span
            key={key}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-500"
          >
            {source.label}
          </span>
        )
      })}
    </div>
  )
}

export interface PanelCardProps {
  id: string
  title: string
  icon?: React.ReactNode
  density?: WidgetDensity
  collapsed?: boolean
  onToggleCollapse?: () => void
  onExpand?: () => void
  actions?: WidgetAction[]
  sources?: SourceLink[]
  highlighted?: boolean
  children?: React.ReactNode
  status?: 'idle' | 'loading' | 'error'
  errorMessage?: string
  onRetry?: () => void
  retryLabel?: string
}

function PanelCardComponent({
  id,
  title,
  icon,
  density = 'rail',
  collapsed,
  onToggleCollapse,
  onExpand,
  actions,
  sources,
  highlighted,
  children,
  status = 'idle',
  errorMessage,
  onRetry,
  retryLabel,
}: PanelCardProps) {
  const renderActions = () => {
    if (!actions || actions.length === 0) return null
    return actions.map((action) => (
      <button
        key={action.id}
        type="button"
        onClick={action.onClick}
        disabled={status === 'loading'}
        className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900"
        aria-label={action.ariaLabel || action.label}
      >
        {action.label}
      </button>
    ))
  }

  return (
    <Card
      data-panel-id={id}
      className={`card rounded-2xl density-${density}${highlighted ? ' ring-2 ring-primary-300' : ''}`}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          {icon}
          <span>{title}</span>
        </CardTitle>
        <div className="ml-auto flex items-center gap-1">
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="h-8 w-8 rounded-lg hover:bg-slate-100 text-slate-600"
              title={collapsed ? 'Expand' : 'Minimize'}
              aria-label={collapsed ? 'Expand panel' : 'Minimize panel'}
            >
              {collapsed ? <ChevronDown className="h-4 w-4 mx-auto" /> : <ChevronUp className="h-4 w-4 mx-auto" />}
            </button>
          )}
          {onExpand && (
            <button
              onClick={onExpand}
              className="h-8 w-8 rounded-lg hover:bg-slate-100 text-slate-600"
              title="Expand"
              aria-label="Expand panel"
            >
              <Maximize2 className="h-4 w-4 mx-auto" />
            </button>
          )}
          {renderActions()}
        </div>
      </CardHeader>
      {!collapsed && (
        <CardContent>
          {status === 'loading' ? (
            <div className="flex flex-col gap-[var(--s1)]">
              <Skeleton height="1rem" width="35%" />
              <Skeleton height="0.75rem" />
              <Skeleton height="0.75rem" width="70%" />
              <Skeleton height="0.75rem" width="55%" />
            </div>
          ) : status === 'error' ? (
            <ErrorView message={errorMessage} onRetry={onRetry} retryLabel={retryLabel} />
          ) : (
            <>
              {children}
              <SourcesFooter sources={sources} />
            </>
          )}
        </CardContent>
      )}
    </Card>
  )
}

export const PanelCard = React.memo(PanelCardComponent)

PanelCard.displayName = 'PanelCard'
