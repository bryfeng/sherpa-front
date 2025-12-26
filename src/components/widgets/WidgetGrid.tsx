/**
 * WIDGET GRID COMPONENT
 *
 * Responsive grid layout for widgets with drag-and-drop support.
 * Uses CSS Grid for layout and @dnd-kit for interactions.
 */

import React, { useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus, Layout, Lock, Unlock, Sparkles } from 'lucide-react'
import type { Widget, WidgetCategory } from '../../types/widget-system'
import { useWidgetStore, useWorkspaceLayout, useWidgetPicker } from '../../store/widget-store'
import { WIDGET_CATEGORIES } from '../../lib/widget-registry'
import '../../styles/design-system.css'

// ============================================
// SORTABLE WIDGET ITEM
// ============================================

interface SortableWidgetProps {
  widget: Widget
  children: React.ReactNode
  isLocked: boolean
}

function SortableWidget({ widget, children, isLocked }: SortableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: widget.id,
    disabled: isLocked,
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    gridColumn: `span ${widget.size.cols}`,
    gridRow: `span ${widget.size.rows}`,
    zIndex: isDragging ? 10 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      {React.cloneElement(children as React.ReactElement, {
        dragHandle: isLocked ? null : (
          <div {...listeners} className="cursor-grab active:cursor-grabbing">
            <div
              className="p-1 -ml-1 rounded opacity-40 hover:opacity-100 transition-opacity"
              style={{ color: 'var(--text-muted)' }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <circle cx="5" cy="4" r="1.5" />
                <circle cx="11" cy="4" r="1.5" />
                <circle cx="5" cy="8" r="1.5" />
                <circle cx="11" cy="8" r="1.5" />
                <circle cx="5" cy="12" r="1.5" />
                <circle cx="11" cy="12" r="1.5" />
              </svg>
            </div>
          </div>
        ),
      })}
    </div>
  )
}

// ============================================
// WIDGET PLACEHOLDER
// ============================================

interface WidgetPlaceholderProps {
  onAddWidget: (category?: WidgetCategory) => void
}

function WidgetPlaceholder({ onAddWidget }: WidgetPlaceholderProps) {
  return (
    <motion.button
      onClick={() => onAddWidget()}
      className="w-full h-full min-h-[200px] rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-colors"
      style={{
        borderColor: 'var(--line)',
        background: 'transparent',
        color: 'var(--text-muted)',
      }}
      whileHover={{
        borderColor: 'var(--accent)',
        background: 'var(--accent-muted)',
      }}
      whileTap={{ scale: 0.99 }}
    >
      <motion.div
        className="w-12 h-12 rounded-full flex items-center justify-center"
        style={{
          background: 'var(--surface-2)',
          border: '1px solid var(--line)',
        }}
        whileHover={{ scale: 1.1 }}
      >
        <Plus className="w-6 h-6" />
      </motion.div>
      <span className="text-sm font-medium">Add Widget</span>
    </motion.button>
  )
}

// ============================================
// GRID CONTROLS
// ============================================

interface GridControlsProps {
  isLocked: boolean
  widgetCount: number
  onToggleLock: () => void
  onAutoArrange: () => void
  onAddWidget: () => void
  onApplyPreset: (presetId: string) => void
}

function GridControls({
  isLocked,
  widgetCount,
  onToggleLock,
  onAutoArrange,
  onAddWidget,
  onApplyPreset,
}: GridControlsProps) {
  const [showPresets, setShowPresets] = React.useState(false)

  const presets = [
    { id: 'day-trader', name: 'Day Trader', icon: '📈' },
    { id: 'portfolio-manager', name: 'Portfolio Manager', icon: '📊' },
    { id: 'researcher', name: 'Researcher', icon: '🔍' },
  ]

  return (
    <div
      className="flex items-center justify-between px-4 py-3 border-b"
      style={{ borderColor: 'var(--line)' }}
    >
      <div className="flex items-center gap-3">
        <span
          className="text-xs font-medium uppercase tracking-wider"
          style={{ color: 'var(--text-muted)' }}
        >
          Workspace
        </span>
        {widgetCount > 0 && (
          <span
            className="px-2 py-0.5 text-xs font-medium rounded-full"
            style={{
              background: 'var(--accent-muted)',
              color: 'var(--accent)',
            }}
          >
            {widgetCount} widget{widgetCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Presets dropdown */}
        <div className="relative">
          <motion.button
            onClick={() => setShowPresets(!showPresets)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors"
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--line)',
              color: 'var(--text)',
            }}
            whileHover={{ borderColor: 'var(--accent)' }}
            whileTap={{ scale: 0.98 }}
          >
            <Sparkles className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            <span className="hidden sm:inline">Presets</span>
          </motion.button>

          <AnimatePresence>
            {showPresets && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-40"
                  onClick={() => setShowPresets(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute right-0 top-full mt-2 w-48 z-50 rounded-lg overflow-hidden"
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--line)',
                    boxShadow: 'var(--shadow-lg)',
                  }}
                >
                  {presets.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => {
                        onApplyPreset(preset.id)
                        setShowPresets(false)
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm transition-colors"
                      style={{ color: 'var(--text)' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--color-hover)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent'
                      }}
                    >
                      <span>{preset.icon}</span>
                      {preset.name}
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Auto arrange */}
        <motion.button
          onClick={onAutoArrange}
          className="p-2 rounded-lg transition-colors"
          style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--line)',
            color: 'var(--text-muted)',
          }}
          whileHover={{ borderColor: 'var(--accent)' }}
          whileTap={{ scale: 0.95 }}
          title="Auto arrange"
        >
          <Layout className="w-4 h-4" />
        </motion.button>

        {/* Lock toggle */}
        <motion.button
          onClick={onToggleLock}
          className="p-2 rounded-lg transition-colors"
          style={{
            background: isLocked ? 'var(--accent-muted)' : 'var(--surface-2)',
            border: `1px solid ${isLocked ? 'var(--accent)' : 'var(--line)'}`,
            color: isLocked ? 'var(--accent)' : 'var(--text-muted)',
          }}
          whileHover={{ borderColor: 'var(--accent)' }}
          whileTap={{ scale: 0.95 }}
          title={isLocked ? 'Unlock layout' : 'Lock layout'}
        >
          {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
        </motion.button>

        {/* Add widget */}
        <motion.button
          onClick={onAddWidget}
          className="sherpa-btn sherpa-btn--primary sherpa-btn--sm"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add</span>
        </motion.button>
      </div>
    </div>
  )
}

// ============================================
// EMPTY STATE
// ============================================

function EmptyWorkspace({ onAddWidget }: { onAddWidget: (category?: WidgetCategory) => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
        style={{
          background: 'var(--accent-muted)',
          border: '1px solid var(--accent)',
        }}
      >
        <Layout className="w-10 h-10" style={{ color: 'var(--accent)' }} />
      </motion.div>

      <h3
        className="text-lg font-semibold mb-2"
        style={{ color: 'var(--text)' }}
      >
        Your workspace is empty
      </h3>
      <p
        className="text-sm text-center max-w-md mb-8"
        style={{ color: 'var(--text-muted)' }}
      >
        Add widgets to customize your dashboard. Track prices, view your portfolio,
        analyze markets, and more.
      </p>

      {/* Quick add by category */}
      <div className="flex flex-wrap justify-center gap-3">
        {WIDGET_CATEGORIES.map((category) => (
          <motion.button
            key={category.id}
            onClick={() => onAddWidget(category.id)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--line)',
              color: 'var(--text)',
            }}
            whileHover={{ borderColor: category.color }}
            whileTap={{ scale: 0.98 }}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: category.color }}
            />
            {category.name}
          </motion.button>
        ))}
      </div>
    </div>
  )
}

// ============================================
// WIDGET GRID
// ============================================

interface WidgetGridProps {
  /** Render function for each widget */
  renderWidget: (widget: Widget) => React.ReactNode
  /** Additional class name */
  className?: string
}

export function WidgetGrid({ renderWidget, className = '' }: WidgetGridProps) {
  const widgets = useWidgetStore((s) => s.widgets)
  const reorderWidgets = useWidgetStore((s) => s.reorderWidgets)
  const applyPreset = useWidgetStore((s) => s.applyPreset)
  const autoArrange = useWidgetStore((s) => s.autoArrangeWidgets)
  const { layout, isLocked, toggleLock } = useWorkspaceLayout()
  const { open: openPicker } = useWidgetPicker()

  const [activeId, setActiveId] = React.useState<string | null>(null)

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Sort widgets: pinned first, then by creation time
  const sortedWidgets = useMemo(() => {
    return [...widgets].sort((a, b) => {
      if (a.display.pinned && !b.display.pinned) return -1
      if (!a.display.pinned && b.display.pinned) return 1
      return a.createdAt - b.createdAt
    })
  }, [widgets])

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null)
      const { active, over } = event
      if (over && active.id !== over.id) {
        const oldIndex = sortedWidgets.findIndex((w) => w.id === active.id)
        const newIndex = sortedWidgets.findIndex((w) => w.id === over.id)
        reorderWidgets(oldIndex, newIndex)
      }
    },
    [sortedWidgets, reorderWidgets]
  )

  const activeWidget = activeId ? widgets.find((w) => w.id === activeId) : null

  return (
    <div className={`widget-grid-container ${className}`}>
      {/* Controls */}
      <GridControls
        isLocked={isLocked}
        widgetCount={widgets.length}
        onToggleLock={toggleLock}
        onAutoArrange={autoArrange}
        onAddWidget={() => openPicker()}
        onApplyPreset={applyPreset}
      />

      {/* Grid */}
      <div className="p-4">
        {widgets.length === 0 ? (
          <EmptyWorkspace onAddWidget={(cat) => openPicker(cat)} />
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sortedWidgets.map((w) => w.id)}
              strategy={rectSortingStrategy}
            >
              <div
                className="grid gap-4"
                style={{
                  gridTemplateColumns: `repeat(${layout.columns}, minmax(0, 1fr))`,
                  gridAutoRows: `${layout.rowHeight}px`,
                }}
              >
                {sortedWidgets.map((widget) => (
                  <SortableWidget
                    key={widget.id}
                    widget={widget}
                    isLocked={isLocked}
                  >
                    {renderWidget(widget)}
                  </SortableWidget>
                ))}

                {/* Add widget placeholder */}
                {!isLocked && (
                  <div style={{ gridColumn: 'span 4', gridRow: 'span 2' }}>
                    <WidgetPlaceholder onAddWidget={(cat) => openPicker(cat)} />
                  </div>
                )}
              </div>
            </SortableContext>

            {/* Drag overlay */}
            <DragOverlay>
              {activeWidget && (
                <div
                  style={{
                    width: `${(activeWidget.size.cols / layout.columns) * 100}%`,
                    opacity: 0.8,
                  }}
                >
                  {renderWidget(activeWidget)}
                </div>
              )}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </div>
  )
}

export default WidgetGrid
