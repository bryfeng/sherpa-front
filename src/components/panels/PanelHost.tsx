import React from 'react'
import type { Widget } from '../../types/widgets'
import '../../styles/panel-host.css'
import { PanelList } from './PanelList'

export interface PanelHostProps {
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

export function PanelHost({
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
}: PanelHostProps) {
  return (
    <div className="panel-host" role="list">
      <PanelList
        widgets={widgets}
        highlight={highlight}
        panelUI={panelUI}
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
    </div>
  )
}
