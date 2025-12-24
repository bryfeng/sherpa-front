// TODO: Workstream 1 — Shell Split (Monolith → Feature Slices)

import React from 'react'
import { ArrowLeftRight, Repeat, Sparkles, Wand2, BarChart3 } from 'lucide-react'

import type { Widget } from '../../types/widgets'
import '../../styles/workspace.css'
import { Entitled } from '../Entitled'
import { Button } from '../ui/primitives'
import { PanelHost } from '../panels/PanelHost'

export interface WorkspaceSurfaceProps {
  widgets: Widget[]
  highlight?: string[]
  panelUI: Record<string, { collapsed?: boolean }>
  walletAddress?: string
  walletReady?: boolean
  portfolioStatus: string
  portfolioError?: string
  portfolioRefreshing: boolean
  onToggleCollapse: (id: string) => void
  onExpand: (id: string) => void
  onReorder: (activeId: string, overId: string) => void
  onBridge?: (widget: Widget) => Promise<string | void>
  onSwap?: (widget: Widget) => Promise<string | void>
  onRefreshBridgeQuote?: () => Promise<void>
  onRefreshSwapQuote?: () => Promise<void>
  onInsertQuickPrompt?: (prompt: string) => void
  onLoadTopCoins: () => void
  onOpenPortfolio: () => void
  onOpenRelayQuote: () => void
  onExplainProtocol: () => void
  showCoachMark?: boolean
  onDismissCoachMark?: () => void
  quickActionsFooter?: React.ReactNode
  secondaryColumn?: React.ReactNode
  onRequestPro?: (source: 'cta' | 'action') => void
}

function WorkspaceSurfaceComponent({
  widgets,
  highlight,
  panelUI,
  walletAddress,
  walletReady,
  portfolioStatus,
  portfolioError,
  portfolioRefreshing,
  onToggleCollapse,
  onExpand,
  onReorder,
  onBridge,
  onSwap,
  onRefreshBridgeQuote,
  onRefreshSwapQuote,
  onInsertQuickPrompt,
  onLoadTopCoins,
  onOpenPortfolio,
  onOpenRelayQuote,
  onExplainProtocol,
  showCoachMark = false,
  onDismissCoachMark,
  quickActionsFooter,
  secondaryColumn,
  onRequestPro,
}: WorkspaceSurfaceProps) {
  const hasWidgets = widgets.length > 0

  return (
    <div className="workspace-surface flex h-full flex-col">
      <div
        className="border-b px-6 py-4 text-sm"
        style={{ borderColor: 'var(--line)', background: 'var(--surface)', color: 'var(--text-muted)' }}
      >
        Arrange live panels, quotes, and research in one streamlined workspace.
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {showCoachMark && (
          <div
            className="mb-4 rounded-lg border p-4 text-sm"
            style={{ borderColor: 'var(--line)', background: 'var(--accent-muted)', color: 'var(--text)' }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex-1">
                <span className="font-semibold" style={{ color: 'var(--text)' }}>Workspace tip:</span>{' '}
                Arrange widgets, pin favourites, or expand cards for deeper analysis. Everything you request lands here.
              </div>
              {onDismissCoachMark && (
                <button
                  type="button"
                  onClick={onDismissCoachMark}
                  className="btn btn-sm btn-secondary"
                >
                  Got it
                </button>
              )}
            </div>
          </div>
        )}
        {hasWidgets ? (
          <PanelHost
            widgets={widgets}
            highlight={highlight}
            panelUI={panelUI}
            walletAddress={walletAddress}
            walletReady={walletReady}
            onToggleCollapse={onToggleCollapse}
            onExpand={onExpand}
            onReorder={onReorder}
            onBridge={onBridge}
            onSwap={onSwap}
            onRefreshBridgeQuote={onRefreshBridgeQuote}
            onRefreshSwapQuote={onRefreshSwapQuote}
            onInsertQuickPrompt={onInsertQuickPrompt}
          />
        ) : (
          <div
            className="flex h-full min-h-[220px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-8 text-center"
            style={{ borderColor: 'var(--line)', background: 'var(--surface)', color: 'var(--text-muted)' }}
          >
            <Sparkles className="h-5 w-5" style={{ color: 'var(--accent)' }} />
            <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>
              No workspace panels yet.
            </div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Ask Sherpa for portfolio or market insights and they’ll land here automatically.
            </p>
          </div>
        )}
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div
            className="rounded-lg border"
            style={{ borderColor: 'var(--line)', background: 'var(--surface-2)' }}
          >
            <div
              className="border-b px-5 py-4 text-sm font-semibold"
              style={{ borderColor: 'var(--line)', color: 'var(--text)' }}
            >
              Quick actions
            </div>
            <div className="flex flex-col gap-3 p-5">
              <Button size="sm" variant="secondary" className="justify-start" onClick={onLoadTopCoins}>
                <BarChart3 className="mr-2 h-3.5 w-3.5" />Top coins insight
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="justify-start"
                disabled={walletAddress ? portfolioRefreshing : false}
                onClick={onOpenPortfolio}
              >
                <ArrowLeftRight className="mr-2 h-3.5 w-3.5" />Portfolio check
              </Button>
              {walletAddress && portfolioStatus === 'error' && (
                <div className="text-xs text-rose-600">
                  {portfolioError || 'Unable to load portfolio. Try again in a moment.'}
                </div>
              )}
              <Button size="sm" variant="secondary" className="justify-start" onClick={onOpenRelayQuote}>
                <Repeat className="mr-2 h-3.5 w-3.5" />Relay bridge quote
              </Button>
              <Entitled
                fallback={
                  <Button
                    size="sm"
                    variant="secondary"
                    className="justify-start"
                    onClick={() => onRequestPro?.('action')}
                    aria-label="Explain a protocol (requires Pro)"
                  >
                    <Wand2 className="mr-2 h-3.5 w-3.5" />Explain a protocol
                  </Button>
                }
              >
                <Button size="sm" variant="secondary" className="justify-start" onClick={onExplainProtocol}>
                  <Wand2 className="mr-2 h-3.5 w-3.5" />Explain a protocol
                </Button>
              </Entitled>
              {quickActionsFooter}
            </div>
          </div>
          {secondaryColumn}
        </div>
      </div>
    </div>
  )
}

export const WorkspaceSurface = React.memo(WorkspaceSurfaceComponent)
WorkspaceSurface.displayName = 'WorkspaceSurface'
