/**
 * WIDGET CARD - Redesigned
 *
 * A premium, animated widget card for the workspace.
 * Features:
 * - Smooth reveal animations
 * - Highlight state for newly added widgets
 * - Drag handle for reordering
 * - Expandable/collapsible states
 */

import React, { memo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDown,
  ChevronUp,
  Maximize2,
  GripVertical,
  ExternalLink,
  RefreshCw,
  X,
} from 'lucide-react'
import type { Widget } from '../../types/widgets'
import '../../styles/design-system.css'

// ============================================
// WIDGET HEADER
// ============================================

interface WidgetHeaderProps {
  title: string
  sources?: Array<{ label: string; href?: string }>
  isCollapsed: boolean
  isHighlighted: boolean
  onToggleCollapse: () => void
  onExpand: () => void
  onRemove?: () => void
  onRefresh?: () => void
  dragHandleProps?: any
}

function WidgetHeader({
  title,
  sources,
  isCollapsed,
  isHighlighted,
  onToggleCollapse,
  onExpand,
  onRemove,
  onRefresh,
  dragHandleProps,
}: WidgetHeaderProps) {
  const [_showMenu, _setShowMenu] = useState(false)

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 border-b"
      style={{
        borderColor: 'var(--line)',
        background: isHighlighted
          ? 'var(--accent-muted)'
          : 'var(--surface)',
      }}
    >
      {/* Drag handle */}
      <button
        className="cursor-grab active:cursor-grabbing p-1 -ml-1 rounded opacity-40 hover:opacity-100 transition-opacity"
        style={{ color: 'var(--text-muted)' }}
        {...dragHandleProps}
      >
        <GripVertical className="w-4 h-4" />
      </button>

      {/* Title and sources */}
      <div className="flex-1 min-w-0">
        <h3
          className="font-display font-semibold text-sm truncate"
          style={{ color: 'var(--text)' }}
        >
          {title}
        </h3>
        {sources && sources.length > 0 && !isCollapsed && (
          <div className="flex items-center gap-2 mt-1">
            {sources.slice(0, 2).map((source, i) => (
              <span
                key={i}
                className="text-xs"
                style={{ color: 'var(--text-muted)' }}
              >
                {source.href ? (
                  <a
                    href={source.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 hover:underline"
                    style={{ color: 'var(--accent)' }}
                  >
                    {source.label}
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                ) : (
                  source.label
                )}
                {i < sources.length - 1 && <span className="mx-1">{'\u00B7'}</span>}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        {onRefresh && (
          <motion.button
            onClick={onRefresh}
            className="p-1.5 rounded-lg transition-colors"
            style={{
              color: 'var(--text-muted)',
              background: 'transparent',
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </motion.button>
        )}

        <motion.button
          onClick={onExpand}
          className="p-1.5 rounded-lg transition-colors"
          style={{
            color: 'var(--text-muted)',
            background: 'transparent',
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </motion.button>

        <motion.button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg transition-colors"
          style={{
            color: 'var(--text-muted)',
            background: 'transparent',
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {isCollapsed ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronUp className="w-4 h-4" />
          )}
        </motion.button>

        {onRemove && (
          <motion.button
            onClick={onRemove}
            className="p-1.5 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
            style={{
              color: 'var(--danger)',
              background: 'transparent',
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <X className="w-3.5 h-3.5" />
          </motion.button>
        )}
      </div>
    </div>
  )
}

// ============================================
// WIDGET CARD
// ============================================

export interface WidgetCardProps {
  widget: Widget
  isCollapsed?: boolean
  isHighlighted?: boolean
  onToggleCollapse?: () => void
  onExpand?: () => void
  onRemove?: () => void
  onRefresh?: () => void
  dragHandleProps?: any
  children?: React.ReactNode
  className?: string
}

export const WidgetCard = memo(function WidgetCard({
  widget,
  isCollapsed = false,
  isHighlighted = false,
  onToggleCollapse,
  onExpand,
  onRemove,
  onRefresh,
  dragHandleProps,
  children,
  className = '',
}: WidgetCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
        boxShadow: isHighlighted
          ? 'var(--shadow-glow)'
          : 'var(--shadow-sm)',
      }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{
        duration: 0.3,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={`sherpa-card group overflow-hidden ${className}`}
      style={{
        border: isHighlighted
          ? '1px solid var(--accent)'
          : '1px solid var(--line)',
      }}
    >
      <WidgetHeader
        title={widget.title}
        sources={widget.sources}
        isCollapsed={isCollapsed}
        isHighlighted={isHighlighted}
        onToggleCollapse={onToggleCollapse || (() => {})}
        onExpand={onExpand || (() => {})}
        onRemove={onRemove}
        onRefresh={onRefresh}
        dragHandleProps={dragHandleProps}
      />

      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div
              className="p-4"
              style={{ background: 'var(--surface)' }}
            >
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
})

// ============================================
// WIDGET SKELETON
// ============================================

export function WidgetSkeleton({ density = 'rail' }: { density?: 'full' | 'rail' }) {
  const isFullWidth = density === 'full'

  return (
    <div
      className="sherpa-card overflow-hidden"
      style={{ border: '1px solid var(--line)' }}
    >
      {/* Header skeleton */}
      <div
        className="flex items-center gap-3 px-4 py-3 border-b"
        style={{ borderColor: 'var(--line)' }}
      >
        <div
          className="w-4 h-4 rounded animate-shimmer"
          style={{ background: 'var(--surface-2)' }}
        />
        <div className="flex-1">
          <div
            className="h-4 w-32 rounded animate-shimmer"
            style={{ background: 'var(--surface-2)' }}
          />
        </div>
        <div className="flex gap-1">
          <div
            className="w-6 h-6 rounded animate-shimmer"
            style={{ background: 'var(--surface-2)' }}
          />
          <div
            className="w-6 h-6 rounded animate-shimmer"
            style={{ background: 'var(--surface-2)' }}
          />
        </div>
      </div>

      {/* Content skeleton */}
      <div className="p-4 space-y-3">
        <div
          className="h-4 w-full rounded animate-shimmer"
          style={{ background: 'var(--surface-2)' }}
        />
        <div
          className="h-4 w-3/4 rounded animate-shimmer"
          style={{ background: 'var(--surface-2)' }}
        />
        {isFullWidth && (
          <>
            <div
              className="h-32 w-full rounded animate-shimmer mt-4"
              style={{ background: 'var(--surface-2)' }}
            />
            <div
              className="h-4 w-1/2 rounded animate-shimmer"
              style={{ background: 'var(--surface-2)' }}
            />
          </>
        )}
      </div>
    </div>
  )
}

// ============================================
// EMPTY STATE
// ============================================

export function WidgetEmptyState({
  title = 'No widgets yet',
  description = 'Ask questions in the chat to populate your workspace with data panels.',
  action,
}: {
  title?: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
}) {
  return (
    <div
      className="flex flex-col items-center justify-center text-center py-16 px-8"
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
        style={{
          background: 'var(--surface-2)',
          border: '1px solid var(--line)',
        }}
      >
        <ChevronDown
          className="w-8 h-8"
          style={{ color: 'var(--text-muted)' }}
        />
      </div>
      <h3
        className="font-display font-semibold text-lg mb-2"
        style={{ color: 'var(--text)' }}
      >
        {title}
      </h3>
      <p
        className="text-sm max-w-xs"
        style={{ color: 'var(--text-muted)' }}
      >
        {description}
      </p>
      {action && (
        <motion.button
          onClick={action.onClick}
          className="sherpa-btn sherpa-btn--secondary mt-6"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {action.label}
        </motion.button>
      )}
    </div>
  )
}

export default WidgetCard
