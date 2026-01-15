import React, { memo, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Widget } from '../../types/widgets'
import { WidgetPanelHeader } from '../widgets/panel/WidgetPanelHeader'
import { WidgetTabs } from '../widgets/panel/WidgetTabs'
import { WidgetContent } from '../widgets/panel/WidgetContent'

export interface WidgetPanelProps {
  /** All widgets in the panel tabs */
  panelWidgets: Widget[]
  /** Currently active widget ID */
  activeWidgetId: string | null
  /** Current panel width */
  panelWidth: number
  /** Whether the panel is visible */
  isVisible: boolean
  /** Connected wallet address */
  walletAddress?: string
  /** Callbacks */
  onTabClick: (id: string) => void
  onTabClose: (id: string) => void
  onCollapse: () => void
  onPanelResize: (width: number) => void
  onAddWidget?: () => void
}

function WidgetPanelComponent({
  panelWidgets,
  activeWidgetId,
  panelWidth,
  isVisible,
  walletAddress,
  onTabClick,
  onTabClose,
  onCollapse,
  onPanelResize,
  onAddWidget,
}: WidgetPanelProps) {
  const activeWidget = panelWidgets.find((w) => w.id === activeWidgetId) ?? null

  // Keyboard shortcut: Escape to close panel
  useEffect(() => {
    if (!isVisible) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented) {
        event.preventDefault()
        onCollapse()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isVisible, onCollapse])

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="hidden lg:flex flex-1 overflow-hidden border-l min-w-0"
          style={{ borderColor: 'var(--line)' }}
        >
          <div
            className="flex h-full w-full flex-col"
            style={{
              background: 'var(--surface)',
            }}
          >
            <WidgetPanelHeader
              tabCount={panelWidgets.length}
              onCollapse={onCollapse}
              onAddWidget={onAddWidget}
            />

            <WidgetTabs
              tabs={panelWidgets}
              activeId={activeWidgetId}
              onTabClick={onTabClick}
              onTabClose={onTabClose}
            />

            <WidgetContent
              widget={activeWidget}
              walletAddress={walletAddress}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export const WidgetPanel = memo(WidgetPanelComponent)
