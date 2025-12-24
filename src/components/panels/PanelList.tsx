import React, { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Widget } from '../../types/widgets'
import { TOKEN_PRICE_WIDGET_ID } from '../../constants/widgets'
import { PanelItem } from './PanelItem'

const panelSpring = {
  type: 'spring',
  stiffness: 400,
  damping: 30,
  mass: 0.8,
}

const panelVariants = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.95,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: panelSpring,
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.98,
    transition: { duration: 0.2, ease: 'easeOut' },
  },
}

export interface PanelListProps {
  widgets: Widget[]
  highlight?: string[]
  panelUI: Record<string, { collapsed?: boolean }>
  walletAddress?: string
  walletReady?: boolean
  onToggleCollapse: (id: string) => void
  onExpand: (id: string) => void
  onMove: (id: string, direction: 'up' | 'down') => void
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
  onMove,
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

  const liveMessage = useMemo(() => {
    if (!highlight?.length) return ''
    const titles = highlight
      .map((id) => widgets.find((widget) => widget.id === id)?.title)
      .filter((title): title is string => Boolean(title))
    if (!titles.length) return ''
    return `Opened ${titles.join(', ')}`
  }, [highlight, widgets])

  return (
    <>
      <AnimatePresence mode="popLayout" initial={false}>
        {orderedWidgets.map((widget, index) => (
          <motion.div
            key={widget.id}
            layout
            variants={panelVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={panelSpring}
          >
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
              onMove={onMove}
              onBridge={onBridge}
              onSwap={onSwap}
              onRefreshBridgeQuote={onRefreshBridgeQuote}
              onRefreshSwapQuote={onRefreshSwapQuote}
              onInsertQuickPrompt={onInsertQuickPrompt}
            />
          </motion.div>
        ))}
      </AnimatePresence>
      <div className="sr-only" aria-live="polite">
        {liveMessage}
      </div>
    </>
  )
}
