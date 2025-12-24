import React, { useMemo } from 'react'
import { AnimatePresence } from 'framer-motion'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'

import type { Widget } from '../../types/widgets'
import { TOKEN_PRICE_WIDGET_ID } from '../../constants/widgets'
import { PanelItem } from './PanelItem'
import { SortablePanelItem } from './SortablePanelItem'

export interface PanelListProps {
  widgets: Widget[]
  highlight?: string[]
  panelUI: Record<string, { collapsed?: boolean }>
  walletAddress?: string
  walletReady?: boolean
  onToggleCollapse: (id: string) => void
  onExpand: (id: string) => void
  onReorder: (activeId: string, overId: string) => void
  onBridge?: (widget: Widget) => Promise<string | void>
  onSwap?: (widget: Widget) => Promise<string | void>
  onRefreshBridgeQuote?: () => Promise<void>
  onRefreshSwapQuote?: () => Promise<void>
  onInsertQuickPrompt?: (prompt: string) => void
}

function orderWidgets(widgets: Widget[]): Widget[] {
  return [...widgets].sort((a, b) => {
    if (a.id === TOKEN_PRICE_WIDGET_ID && b.id !== TOKEN_PRICE_WIDGET_ID) return -1
    if (b.id === TOKEN_PRICE_WIDGET_ID && a.id !== TOKEN_PRICE_WIDGET_ID) return 1
    const orderA = typeof a.order === 'number' ? a.order : Number.MAX_SAFE_INTEGER
    const orderB = typeof b.order === 'number' ? b.order : Number.MAX_SAFE_INTEGER
    if (orderA === orderB) return a.title.localeCompare(b.title)
    return orderA - orderB
  })
}

export function PanelList({
  widgets,
  highlight,
  panelUI,
  walletAddress,
  walletReady,
  onToggleCollapse,
  onExpand,
  onReorder,
  onBridge,
  onSwap,
  onRefreshBridgeQuote,
  onRefreshSwapQuote,
  onInsertQuickPrompt,
}: PanelListProps) {
  const highlightedIds = useMemo(() => new Set(highlight ?? []), [highlight])

  const orderedWidgets = useMemo(() => {
    const sorted = orderWidgets(widgets)
    if (!highlight?.length) return sorted
    const priority = sorted.filter((widget) => highlightedIds.has(widget.id))
    const remainder = sorted.filter((widget) => !highlightedIds.has(widget.id))
    return [...priority, ...remainder]
  }, [widgets, highlight, highlightedIds])

  const widgetIds = useMemo(() => orderedWidgets.map((w) => w.id), [orderedWidgets])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      onReorder(String(active.id), String(over.id))
    }
  }

  const liveMessage = useMemo(() => {
    if (!highlight?.length) return ''
    const titles = highlight
      .map((id) => widgets.find((widget) => widget.id === id)?.title)
      .filter((title): title is string => Boolean(title))
    if (!titles.length) return ''
    return `Opened ${titles.join(', ')}`
  }, [highlight, widgets])

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={widgetIds} strategy={verticalListSortingStrategy}>
        <AnimatePresence mode="popLayout" initial={false}>
          {orderedWidgets.map((widget, index) => (
            <SortablePanelItem key={widget.id} id={widget.id}>
              <PanelItem
                widget={widget}
                index={index}
                totalCount={orderedWidgets.length}
                collapsed={Boolean(panelUI[widget.id]?.collapsed)}
                isHighlighted={highlightedIds.has(widget.id)}
                walletAddress={walletAddress}
                walletReady={walletReady}
                onToggleCollapse={onToggleCollapse}
                onExpand={onExpand}
                onBridge={onBridge}
                onSwap={onSwap}
                onRefreshBridgeQuote={onRefreshBridgeQuote}
                onRefreshSwapQuote={onRefreshSwapQuote}
                onInsertQuickPrompt={onInsertQuickPrompt}
              />
            </SortablePanelItem>
          ))}
        </AnimatePresence>
      </SortableContext>
      <div className="sr-only" aria-live="polite">
        {liveMessage}
      </div>
    </DndContext>
  )
}
