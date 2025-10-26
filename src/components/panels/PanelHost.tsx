import React, { useMemo } from 'react'
import { BarChart3, Star, TrendingUp } from 'lucide-react'

import type { Widget } from '../../types/widgets'
import '../../styles/panel-host.css'
import { TrendingTokensBanner, TrendingTokensList } from '../widgets/TrendingTokensWidget'
import { RelayQuoteWidget } from '../widgets/RelayQuoteWidget'
import { PortfolioOverview } from './PortfolioOverview'
import { TopCoinsPanel } from './TopCoinsPanel'
import { ChartPanel } from './ChartPanel'
import { PanelCard } from './PanelCard'

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

function orderWidgets(widgets: Widget[]): Widget[] {
  return [...widgets].sort((a, b) => {
    const orderA = typeof a.order === 'number' ? a.order : Number.MAX_SAFE_INTEGER
    const orderB = typeof b.order === 'number' ? b.order : Number.MAX_SAFE_INTEGER
    if (orderA === orderB) return a.title.localeCompare(b.title)
    return orderA - orderB
  })
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
    <div className="panel-host" role="list">
      {orderedWidgets.map((widget, index) => {
        const collapsed = Boolean(panelUI[widget.id]?.collapsed)
        const isHighlighted = highlightedIds.has(widget.id)
        const density = widget.density ?? 'rail'
        const actions = [
          {
            id: `pin-${widget.id}`,
            label: collapsed ? 'Unpin' : 'Pin',
            onClick: () => onToggleCollapse(widget.id),
            ariaLabel: collapsed ? `Unpin ${widget.title}` : `Pin ${widget.title}`,
          },
          {
            id: `expand-${widget.id}`,
            label: 'Expand',
            onClick: () => onExpand(widget.id),
            ariaLabel: `Expand ${widget.title}`,
          },
        ]

        if (index > 0) {
          actions.push({
            id: `move-up-${widget.id}`,
            label: 'Move up',
            onClick: () => onMove(widget.id, 'up'),
            ariaLabel: `Move ${widget.title} earlier`,
          })
        }
        if (index < orderedWidgets.length - 1) {
          actions.push({
            id: `move-down-${widget.id}`,
            label: 'Move down',
            onClick: () => onMove(widget.id, 'down'),
            ariaLabel: `Move ${widget.title} later`,
          })
        }

        const sharedCardProps = {
          id: widget.id,
          title: widget.title,
          density,
          collapsed,
          onToggleCollapse: () => onToggleCollapse(widget.id),
          onExpand: () => onExpand(widget.id),
          actions,
          sources: widget.sources,
          highlighted: isHighlighted,
        }

        const payload: any = widget.payload

        const renderWidget = () => {
          switch (widget.kind) {
            case 'portfolio':
              return (
                <PortfolioOverview
                  payload={payload}
                  walletAddress={walletAddress}
                  collapsed={collapsed}
                  controls={{
                    collapsed,
                    onToggleCollapse: () => onToggleCollapse(widget.id),
                    onExpand: () => onExpand(widget.id),
                  }}
                />
              )
            case 'card': {
              const quoteType = typeof payload?.quote_type === 'string' ? payload.quote_type : undefined
              const isSwapWidget = quoteType === 'swap' || widget.id === 'relay_swap_quote'
              const isBridgeWidget = quoteType === 'bridge' || widget.id === 'relay_bridge_quote'
              if (isSwapWidget || isBridgeWidget) {
                const executeFn = isSwapWidget ? onSwap : onBridge
                const refreshFn = isSwapWidget ? onRefreshSwapQuote : onRefreshBridgeQuote
                return (
                  <RelayQuoteWidget
                    panel={widget}
                    walletAddress={walletAddress}
                    walletReady={walletReady}
                    onExecuteQuote={executeFn}
                    onRefreshQuote={refreshFn}
                    onInsertQuickPrompt={onInsertQuickPrompt}
                    controls={{
                      collapsed,
                      onToggleCollapse: () => onToggleCollapse(widget.id),
                      onExpand: () => onExpand(widget.id),
                    }}
                  />
                )
              }
              return <div className="text-sm text-slate-700">{JSON.stringify(payload)}</div>
            }
            case 'prices':
              return <TopCoinsPanel payload={payload} />
            case 'trending': {
              const tokens = Array.isArray(payload?.tokens) ? payload.tokens : []
              const fetchedAt = typeof payload?.fetchedAt === 'string' ? payload.fetchedAt : undefined
              const error = typeof payload?.error === 'string' ? payload.error : undefined
              if (payload?.layout === 'banner') {
                return (
                  <TrendingTokensBanner
                    tokens={tokens}
                    fetchedAt={fetchedAt}
                    onInsertQuickPrompt={onInsertQuickPrompt}
                    onViewAll={() => onExpand(widget.id)}
                  />
                )
              }
              return (
                <TrendingTokensList
                  tokens={tokens}
                  fetchedAt={fetchedAt}
                  error={error}
                  onInsertQuickPrompt={onInsertQuickPrompt}
                />
              )
            }
            case 'chart':
              return <ChartPanel widget={widget} />
            default:
              return <div className="text-sm text-slate-400">{JSON.stringify(payload)}</div>
          }
        }

        return (
          <PanelCard
            key={widget.id}
            {...sharedCardProps}
            icon={(() => {
              switch (widget.kind) {
                case 'chart':
                  return <BarChart3 className="h-4 w-4" />
                case 'trending':
                  return <Star className="h-4 w-4" />
                case 'prediction':
                  return <TrendingUp className="h-4 w-4" />
                default:
                  return null
              }
            })()}
          >
            {renderWidget()}
          </PanelCard>
        )
      })}
      <div className="sr-only" aria-live="polite">
        {liveMessage}
      </div>
    </div>
  )
}
