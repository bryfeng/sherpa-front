import React, { Suspense, useMemo } from 'react'
import { BarChart3, Star, TrendingUp } from 'lucide-react'

import type { Widget } from '../../types/widgets'
import { TOKEN_PRICE_WIDGET_ID } from '../../constants/widgets'
import '../../styles/panel-host.css'
import { emit } from '../../utils/events'
import { PortfolioOverview } from './PortfolioOverview'
import { TopCoinsPanel } from './TopCoinsPanel'
import { PanelCard, type PanelCardProps } from './PanelCard'
import { CardSkeleton } from './CardSkeleton'

const ChartPanel = React.lazy(() => import('./ChartPanel'))
const RelayQuoteWidget = React.lazy(() => import('../widgets/RelayQuoteWidget'))
const TrendingTokensBanner = React.lazy(() =>
  import('../widgets/TrendingTokensWidget').then((module) => ({ default: module.TrendingTokensBanner })),
)
const TrendingTokensList = React.lazy(() =>
  import('../widgets/TrendingTokensWidget').then((module) => ({ default: module.TrendingTokensList })),
)

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
    if (a.id === TOKEN_PRICE_WIDGET_ID && b.id !== TOKEN_PRICE_WIDGET_ID) return -1
    if (b.id === TOKEN_PRICE_WIDGET_ID && a.id !== TOKEN_PRICE_WIDGET_ID) return 1
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

        const handleToggleCollapse = () => {
          const nextCollapsed = !collapsed
          emit({
            name: nextCollapsed ? 'panel.close' : 'panel.open',
            payload: { id: widget.id, title: widget.title, nextCollapsed },
          })
          emit({
            name: nextCollapsed ? 'panel.pin' : 'panel.unpin',
            payload: { id: widget.id, title: widget.title },
          })
          onToggleCollapse(widget.id)
        }

        const handleExpand = () => {
          emit({ name: 'panel.expand', payload: { id: widget.id, title: widget.title } })
          onExpand(widget.id)
        }

        const handleMove = (direction: 'up' | 'down') => {
          const fromIndex = index
          const toIndex = direction === 'up' ? Math.max(0, index - 1) : Math.min(orderedWidgets.length - 1, index + 1)
          emit({
            name: 'panel.reorder',
            payload: { id: widget.id, title: widget.title, direction, from: fromIndex, to: toIndex },
          })
          onMove(widget.id, direction)
        }

        const actions = [
          {
            id: `pin-${widget.id}`,
            label: collapsed ? 'Unpin' : 'Pin',
            onClick: handleToggleCollapse,
            ariaLabel: collapsed ? `Unpin ${widget.title}` : `Pin ${widget.title}`,
          },
          {
            id: `expand-${widget.id}`,
            label: 'Expand',
            onClick: handleExpand,
            ariaLabel: `Expand ${widget.title}`,
          },
        ]

        if (index > 0) {
          actions.push({
            id: `move-up-${widget.id}`,
            label: 'Move up',
            onClick: () => handleMove('up'),
            ariaLabel: `Move ${widget.title} earlier`,
          })
        }
        if (index < orderedWidgets.length - 1) {
          actions.push({
            id: `move-down-${widget.id}`,
            label: 'Move down',
            onClick: () => handleMove('down'),
            ariaLabel: `Move ${widget.title} later`,
          })
        }

        const payload: any = widget.payload

        let panelStatus: PanelCardProps['status'] = 'idle'
        let panelError: string | undefined
        let panelRetry: (() => void) | undefined
        let widgetContent: React.ReactNode = null

        if (payload && typeof payload === 'object' && payload.status === 'loading') {
          panelStatus = 'loading'
        }

        switch (widget.kind) {
          case 'portfolio':
            widgetContent = (
              <PortfolioOverview
                payload={payload}
                walletAddress={walletAddress}
                collapsed={collapsed}
                controls={{
                  collapsed,
                  onToggleCollapse: handleToggleCollapse,
                  onExpand: handleExpand,
                }}
              />
            )
            break
          case 'card': {
            const quoteType = typeof payload?.quote_type === 'string' ? payload.quote_type : undefined
            const isSwapWidget = quoteType === 'swap' || widget.id === 'relay_swap_quote'
            const isBridgeWidget = quoteType === 'bridge' || widget.id === 'relay_bridge_quote'
            if (isSwapWidget || isBridgeWidget) {
              const executeFn = isSwapWidget ? onSwap : onBridge
              const refreshFn = isSwapWidget ? onRefreshSwapQuote : onRefreshBridgeQuote
              widgetContent = (
                <RelayQuoteWidget
                  panel={widget}
                  walletAddress={walletAddress}
                  walletReady={walletReady}
                  onExecuteQuote={executeFn}
                  onRefreshQuote={refreshFn}
                  onInsertQuickPrompt={onInsertQuickPrompt}
                  controls={{
                    collapsed,
                    onToggleCollapse: handleToggleCollapse,
                    onExpand: handleExpand,
                  }}
                />
              )
            } else {
              widgetContent = <div className="text-sm text-slate-700">{JSON.stringify(payload)}</div>
            }
            break
          }
          case 'prices':
            widgetContent = <TopCoinsPanel payload={payload} />
            break
          case 'trending': {
            const tokens = Array.isArray(payload?.tokens) ? payload.tokens : []
            const fetchedAt = typeof payload?.fetchedAt === 'string' ? payload.fetchedAt : undefined
            const error = typeof payload?.error === 'string' ? payload.error : undefined
            if (error && tokens.length === 0) {
              panelStatus = 'error'
              panelError = error
              panelRetry = () => onInsertQuickPrompt?.('Show me trending tokens again.')
            } else if (payload?.layout === 'banner') {
              widgetContent = (
                <TrendingTokensBanner
                  tokens={tokens}
                  fetchedAt={fetchedAt}
                  onInsertQuickPrompt={onInsertQuickPrompt}
                  onViewAll={handleExpand}
                  error={error}
                />
              )
            } else {
              widgetContent = (
                <TrendingTokensList
                  tokens={tokens}
                  fetchedAt={fetchedAt}
                  error={error}
                  onInsertQuickPrompt={onInsertQuickPrompt}
                />
              )
            }
            break
          }
          case 'chart':
            widgetContent = <ChartPanel widget={widget} />
            break
          default:
            widgetContent = <div className="text-sm text-slate-400">{JSON.stringify(payload)}</div>
            break
        }

        const sharedCardProps = {
          id: widget.id,
          title: widget.title,
          density,
          collapsed,
          onToggleCollapse: handleToggleCollapse,
          onExpand: handleExpand,
          actions,
          sources: widget.sources,
          highlighted: isHighlighted,
          status: panelStatus,
          errorMessage: panelError,
          onRetry: panelRetry,
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
            <Suspense fallback={<CardSkeleton density={density} />}>
              {panelStatus === 'error' ? null : widgetContent}
            </Suspense>
          </PanelCard>
        )
      })}
      <div className="sr-only" aria-live="polite">
        {liveMessage}
      </div>
    </div>
  )
}
