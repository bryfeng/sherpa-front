/**
 * WIDGET BASE COMPONENT
 *
 * The foundation component for all widgets in the workspace.
 * Provides common functionality: header, state indicators, resize, context menu.
 */

import React, { useCallback, useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MoreHorizontal,
  RefreshCw,
  Pin,
  PinOff,
  ChevronDown,
  ChevronUp,
  Copy,
  Settings,
  Download,
  Trash2,
  Maximize2,
  AlertCircle,
  Loader2,
  Clock,
  GripVertical,
} from 'lucide-react'
import type { Widget, WidgetAction } from '../../types/widget-system'
import { getWidgetMetadata } from '../../lib/widget-registry'
import { useWidgetStore } from '../../store/widget-store'
import '../../styles/design-system.css'

// ============================================
// TYPES
// ============================================

interface WidgetBaseProps {
  widget: Widget
  children: React.ReactNode
  className?: string
  /** Custom header actions */
  headerActions?: React.ReactNode
  /** Hide the default header */
  hideHeader?: boolean
  /** Custom loading component */
  loadingComponent?: React.ReactNode
  /** Custom error component */
  errorComponent?: React.ReactNode
  /** Called when widget data should be refreshed */
  onRefresh?: () => void | Promise<void>
  /** Drag handle render prop for DnD */
  dragHandle?: React.ReactNode
}

// ============================================
// WIDGET HEADER
// ============================================

interface WidgetHeaderProps {
  widget: Widget
  customActions?: React.ReactNode
  onAction: (action: WidgetAction) => void
  dragHandle?: React.ReactNode
}

function WidgetHeader({ widget, customActions, onAction, dragHandle }: WidgetHeaderProps) {
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const metadata = getWidgetMetadata(widget.kind)
  const isRefreshing = widget.state === 'refreshing'
  const isStale = widget.state === 'stale'
  const hasError = widget.state === 'error'

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }
    if (showMenu) {
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }
  }, [showMenu])

  // Format last refresh time
  const getRefreshStatus = () => {
    if (!widget.refresh.lastRefreshedAt) return null
    const elapsed = Math.floor((Date.now() - widget.refresh.lastRefreshedAt) / 1000)
    if (elapsed < 60) return 'Just now'
    if (elapsed < 3600) return `${Math.floor(elapsed / 60)}m ago`
    return `${Math.floor(elapsed / 3600)}h ago`
  }

  const menuItems: Array<{
    action: WidgetAction
    label: string
    icon: React.ReactNode
    danger?: boolean
    disabled?: boolean
  }> = [
    { action: 'refresh', label: 'Refresh', icon: <RefreshCw className="w-4 h-4" />, disabled: !metadata.refreshable },
    { action: widget.display.pinned ? 'unpin' : 'pin', label: widget.display.pinned ? 'Unpin' : 'Pin to Top', icon: widget.display.pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" /> },
    { action: 'duplicate', label: 'Duplicate', icon: <Copy className="w-4 h-4" /> },
    { action: 'configure', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
    { action: 'resize', label: 'Resize', icon: <Maximize2 className="w-4 h-4" />, disabled: !metadata.resizable },
    { action: 'export', label: 'Export', icon: <Download className="w-4 h-4" /> },
    { action: 'remove', label: 'Remove', icon: <Trash2 className="w-4 h-4" />, danger: true },
  ]

  return (
    <div
      className="flex items-center justify-between px-4 py-3 border-b"
      style={{ borderColor: 'var(--line)' }}
    >
      {/* Left: Drag handle + Title + Status */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {dragHandle || (
          <div
            className="cursor-grab active:cursor-grabbing p-1 -ml-1 rounded opacity-40 hover:opacity-100 transition-opacity flex-shrink-0"
            style={{ color: 'var(--text-muted)' }}
          >
            <GripVertical className="w-4 h-4" />
          </div>
        )}

        <div className="flex items-center gap-2">
          <h3
            className="font-medium text-sm whitespace-nowrap"
            style={{ color: 'var(--text)' }}
          >
            {widget.title}
          </h3>

          {/* Status indicators */}
          {widget.display.pinned && (
            <Pin
              className="w-3 h-3 flex-shrink-0"
              style={{ color: 'var(--accent)' }}
            />
          )}

          {isStale && (
            <Clock
              className="w-3 h-3 flex-shrink-0"
              style={{ color: 'var(--warning)' }}
            />
          )}

          {hasError && (
            <AlertCircle
              className="w-3 h-3 flex-shrink-0"
              style={{ color: 'var(--danger)' }}
            />
          )}
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-0.5 flex-shrink-0">
        {/* Last refresh time */}
        {metadata.refreshable && widget.refresh.lastRefreshedAt && (
          <span
            className="text-xs mr-1 hidden md:inline"
            style={{ color: 'var(--text-muted)' }}
          >
            {getRefreshStatus()}
          </span>
        )}

        {/* Custom actions */}
        {customActions}

        {/* Refresh button */}
        {metadata.refreshable && (
          <motion.button
            onClick={() => onAction('refresh')}
            disabled={isRefreshing}
            className="p-1.5 rounded-lg transition-colors"
            style={{
              color: 'var(--text-muted)',
              background: 'transparent',
            }}
            whileHover={{ backgroundColor: 'var(--color-hover)' }}
            whileTap={{ scale: 0.95 }}
          >
            <motion.div
              animate={isRefreshing ? { rotate: 360 } : { rotate: 0 }}
              transition={isRefreshing ? { duration: 1, repeat: Infinity, ease: 'linear' } : undefined}
            >
              <RefreshCw className="w-4 h-4" />
            </motion.div>
          </motion.button>
        )}

        {/* Collapse/Expand */}
        <motion.button
          onClick={() => onAction(widget.display.collapsed ? 'expand' : 'collapse')}
          className="p-1.5 rounded-lg transition-colors"
          style={{
            color: 'var(--text-muted)',
            background: 'transparent',
          }}
          whileHover={{ backgroundColor: 'var(--color-hover)' }}
          whileTap={{ scale: 0.95 }}
        >
          {widget.display.collapsed ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronUp className="w-4 h-4" />
          )}
        </motion.button>

        {/* More menu */}
        <div className="relative" ref={menuRef}>
          <motion.button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 rounded-lg transition-colors"
            style={{
              color: 'var(--text-muted)',
              background: showMenu ? 'var(--color-hover)' : 'transparent',
            }}
            whileHover={{ backgroundColor: 'var(--color-hover)' }}
            whileTap={{ scale: 0.95 }}
          >
            <MoreHorizontal className="w-4 h-4" />
          </motion.button>

          {/* Dropdown menu */}
          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.96 }}
                transition={{ duration: 0.1 }}
                className="absolute right-0 top-full mt-1 w-48 z-50 rounded-lg overflow-hidden"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--line)',
                  boxShadow: 'var(--shadow-lg)',
                }}
              >
                {menuItems.map((item, index) => (
                  <React.Fragment key={item.action}>
                    {item.danger && index > 0 && (
                      <div
                        className="h-px mx-2 my-1"
                        style={{ background: 'var(--line)' }}
                      />
                    )}
                    <button
                      onClick={() => {
                        onAction(item.action)
                        setShowMenu(false)
                      }}
                      disabled={item.disabled}
                      className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm transition-colors disabled:opacity-40"
                      style={{
                        color: item.danger ? 'var(--danger)' : 'var(--text)',
                        background: 'transparent',
                      }}
                      onMouseEnter={(e) => {
                        if (!item.disabled) {
                          e.currentTarget.style.background = 'var(--color-hover)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent'
                      }}
                    >
                      <span style={{ color: item.danger ? 'var(--danger)' : 'var(--text-muted)' }}>
                        {item.icon}
                      </span>
                      {item.label}
                    </button>
                  </React.Fragment>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

// ============================================
// WIDGET STATES
// ============================================

function WidgetLoading({ message = 'Loading...' }: { message?: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center h-full min-h-[120px] gap-3"
      style={{ color: 'var(--text-muted)' }}
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      >
        <Loader2 className="w-6 h-6" />
      </motion.div>
      <span className="text-sm">{message}</span>
    </div>
  )
}

function WidgetError({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div
      className="flex flex-col items-center justify-center h-full min-h-[120px] gap-3 p-4"
      style={{ color: 'var(--text-muted)' }}
    >
      <AlertCircle className="w-8 h-8" style={{ color: 'var(--danger)' }} />
      <p className="text-sm text-center">{message || 'Something went wrong'}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-3 py-1.5 text-sm rounded-lg transition-colors"
          style={{
            background: 'var(--surface-2)',
            color: 'var(--text)',
            border: '1px solid var(--line)',
          }}
        >
          Try again
        </button>
      )}
    </div>
  )
}

// ============================================
// WIDGET BASE
// ============================================

export function WidgetBase({
  widget,
  children,
  className = '',
  headerActions,
  hideHeader = false,
  loadingComponent,
  errorComponent,
  onRefresh,
  dragHandle,
}: WidgetBaseProps) {
  const performAction = useWidgetStore((s) => s.performWidgetAction)
  const setWidgetDisplay = useWidgetStore((s) => s.setWidgetDisplay)

  const handleAction = useCallback(
    (action: WidgetAction) => {
      if (action === 'refresh' && onRefresh) {
        onRefresh()
      } else {
        performAction(widget.id, action)
      }
    },
    [widget.id, performAction, onRefresh]
  )

  // Clear highlight after animation
  useEffect(() => {
    if (widget.display.highlighted) {
      const timer = setTimeout(() => {
        setWidgetDisplay(widget.id, { highlighted: false })
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [widget.display.highlighted, widget.id, setWidgetDisplay])

  // Auto-transition from loading to ready state
  const setWidgetState = useWidgetStore((s) => s.setWidgetState)
  const markWidgetRefreshed = useWidgetStore((s) => s.markWidgetRefreshed)

  useEffect(() => {
    if (widget.state === 'loading') {
      const timer = setTimeout(() => {
        setWidgetState(widget.id, 'ready')
        markWidgetRefreshed(widget.id)
      }, 800)
      return () => clearTimeout(timer)
    }
  }, [widget.id, widget.state, setWidgetState, markWidgetRefreshed])

  const isLoading = widget.state === 'loading'
  const hasError = widget.state === 'error'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{
        opacity: 1,
        scale: 1,
        y: 0,
        boxShadow: widget.display.highlighted
          ? '0 0 0 2px var(--accent), var(--shadow-lg)'
          : 'var(--shadow-md)',
      }}
      exit={{ opacity: 0, scale: 0.95, y: 10 }}
      transition={{ duration: 0.2 }}
      className={`widget-base rounded-xl overflow-hidden ${className}`}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--line)',
      }}
    >
      {/* Header */}
      {!hideHeader && (
        <WidgetHeader
          widget={widget}
          customActions={headerActions}
          onAction={handleAction}
          dragHandle={dragHandle}
        />
      )}

      {/* Content */}
      <AnimatePresence mode="wait">
        {widget.display.collapsed ? (
          <motion.div
            key="collapsed"
            initial={{ height: 0 }}
            animate={{ height: 0 }}
            exit={{ height: 'auto' }}
            transition={{ duration: 0.2 }}
          />
        ) : (
          <motion.div
            key="expanded"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4">
              {isLoading ? (
                loadingComponent || <WidgetLoading />
              ) : hasError ? (
                errorComponent || (
                  <WidgetError
                    message={widget.error}
                    onRetry={onRefresh}
                  />
                )
              ) : (
                children
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default WidgetBase
