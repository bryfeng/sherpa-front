// TODO: Workstream 1 — Shell Split (Monolith → Feature Slices)

import React from 'react'
import { ChevronDown, ChevronUp, Maximize2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

import type { WidgetAction, WidgetDensity } from '../../types/widgets'
import { ErrorView } from '../ErrorView'
import { Skeleton } from '../Skeleton'
import { Card, CardContent } from '../ui/primitives'
import { WidgetButton } from '../widgets/widget-kit'

const springTransition = {
  type: 'spring',
  stiffness: 400,
  damping: 35,
  mass: 0.8,
}

const contentVariants = {
  collapsed: {
    height: 0,
    opacity: 0,
    transition: { ...springTransition, opacity: { duration: 0.15 } }
  },
  expanded: {
    height: 'auto',
    opacity: 1,
    transition: { ...springTransition, opacity: { delay: 0.05, duration: 0.2 } }
  },
}

interface SourceLink {
  label: string
  href?: string
}

function SourcesFooter({ sources }: { sources?: SourceLink[] }) {
  if (!sources || sources.length === 0) return null

  return (
    <div
      className="mt-[var(--s2)] flex flex-wrap items-center gap-[var(--s-1)] text-[11px]"
      style={{ color: 'var(--text-muted)' }}
    >
      <span className="uppercase tracking-[0.2em]">Sources</span>
      {sources.map((source, index) => {
        const key = `${source.label}-${index}`
        const baseClass =
          'inline-flex items-center gap-[var(--s-1)] rounded-full border px-[var(--s1)] py-[var(--s-1)] text-[11px] font-semibold'
        if (source.href) {
          return (
            <a
              key={key}
              href={source.href}
              target="_blank"
              rel="noreferrer"
              className={`${baseClass} bg-[var(--surface-2)] text-[var(--text)] hover:bg-[var(--hover)]`}
              style={{ borderColor: 'var(--line)' }}
            >
              {source.label}
            </a>
          )
        }
        return (
          <span
            key={key}
            className={`${baseClass} text-[var(--text-muted)]`}
            style={{ borderColor: 'var(--line)', background: 'var(--surface-2)' }}
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
  const densityLabel = density === 'full' ? 'Full-width widget' : 'Rail widget'
  const filteredActions = (actions ?? []).filter(
    (action) => action && !action.id?.startsWith('pin-') && !action.id?.startsWith('expand-'),
  )

  const renderActions = () => {
    if (!filteredActions.length) return null
    return filteredActions.map((action) => (
      <WidgetButton
        key={action.id}
        variant="ghost"
        size="sm"
        className="uppercase tracking-[0.12em] text-[10px] font-semibold text-[var(--text-muted)]"
        onClick={action.onClick}
        disabled={status === 'loading'}
        aria-label={action.ariaLabel || action.label}
      >
        {action.label}
      </WidgetButton>
    ))
  }

  return (
    <Card
      data-panel-id={id}
      data-highlighted={highlighted ? 'true' : undefined}
      className={`card density-${density}`}
    >
      <div
        className="flex flex-wrap items-start justify-between gap-[var(--s1)] border-b px-[var(--s3)] py-[var(--s2)]"
        style={{ borderColor: 'var(--line)' }}
      >
        <div className="flex items-center gap-[var(--s1)]">
          {icon ? (
            <span
              className="inline-flex h-8 w-8 items-center justify-center rounded-md"
              style={{
                background: 'var(--accent-muted)',
                color: 'var(--accent)',
              }}
              aria-hidden
            >
              {icon}
            </span>
          ) : null}
          <div className="space-y-[2px]">
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
              {title}
            </p>
            <p className="text-[11px] uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>
              {densityLabel}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-[var(--s-1)]">
          {renderActions()}
          {onToggleCollapse ? (
            <WidgetButton
              variant="ghost"
              size="sm"
              className="h-8 w-8 rounded-full p-0 text-[var(--text-muted)]"
              onClick={onToggleCollapse}
              aria-label={collapsed ? 'Expand panel' : 'Collapse panel'}
              title={collapsed ? 'Expand' : 'Collapse'}
              disabled={status === 'loading'}
            >
              {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </WidgetButton>
          ) : null}
          {onExpand ? (
            <WidgetButton
              variant="ghost"
              size="sm"
              className="h-8 w-8 rounded-full p-0 text-[var(--text-muted)]"
              onClick={onExpand}
              aria-label="Expand panel"
              title="Expand panel"
            >
              <Maximize2 className="h-4 w-4" />
            </WidgetButton>
          ) : null}
        </div>
      </div>
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            key="panel-content"
            initial="collapsed"
            animate="expanded"
            exit="collapsed"
            variants={contentVariants}
            style={{ overflow: 'hidden' }}
          >
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
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}

export const PanelCard = React.memo(PanelCardComponent)

PanelCard.displayName = 'PanelCard'
