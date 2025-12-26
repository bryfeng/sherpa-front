import React, { Suspense, useCallback, useMemo } from 'react'
import { BarChart3, Star, TrendingUp } from 'lucide-react'

import type { Widget } from '../../types/widgets'
import type { HistorySummaryResponse, HistoryComparisonReport } from '../../types/history'
import { emit } from '../../utils/events'
import { PanelCard, type PanelCardProps } from './PanelCard'
import { CardSkeleton } from './CardSkeleton'
import { PanelErrorBoundary } from './PanelErrorBoundary'
import { usePanelActions, type PanelControlsConfig } from './PanelControls'
import { useQuickActions } from './useQuickActions'
import { PortfolioOverview } from './PortfolioOverview'
import { TopCoinsPanel } from './TopCoinsPanel'
import { HistorySummaryPanel } from './history/HistorySummaryPanel'
import { HistoryComparisonTable } from './history/HistoryComparisonTable'

const ChartPanel = React.lazy(() => import('./ChartPanel'))
const RelayQuoteWidget = React.lazy(() => import('../widgets/RelayQuoteWidget'))
const TrendingTokensBanner = React.lazy(() =>
  import('../widgets/TrendingTokensWidget').then((module) => ({ default: module.TrendingTokensBanner })),
)
const TrendingTokensList = React.lazy(() =>
  import('../widgets/TrendingTokensWidget').then((module) => ({ default: module.TrendingTokensList })),
)

export interface PanelItemProps {
  widget: Widget
  index: number
  totalCount: number
  collapsed: boolean
  isHighlighted: boolean
  walletAddress?: string
  walletReady?: boolean
  onToggleCollapse: (id: string) => void
  onExpand: (id: string) => void
  onBridge?: (widget: Widget) => Promise<string | void>
  onSwap?: (widget: Widget) => Promise<string | void>
  onRefreshBridgeQuote?: () => Promise<void>
  onRefreshSwapQuote?: () => Promise<void>
  onInsertQuickPrompt?: (prompt: string) => void
}

function getWidgetIcon(kind: string): React.ReactNode {
  switch (kind) {
    case 'chart':
      return <BarChart3 className="h-4 w-4" />
    case 'trending':
      return <Star className="h-4 w-4" />
    case 'prediction':
      return <TrendingUp className="h-4 w-4" />
    default:
      return null
  }
}

function PanelItemComponent({
  widget,
  index,
  totalCount,
  collapsed,
  isHighlighted,
  walletAddress,
  walletReady,
  onToggleCollapse,
  onExpand,
  onBridge,
  onSwap,
  onRefreshBridgeQuote,
  onRefreshSwapQuote,
  onInsertQuickPrompt,
}: PanelItemProps) {
  const density = widget.density ?? 'rail'
  const payload: any = widget.payload

  const handleToggleCollapse = useCallback(() => {
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
  }, [collapsed, widget.id, widget.title, onToggleCollapse])

  const handleExpand = useCallback(() => {
    emit({ name: 'panel.expand', payload: { id: widget.id, title: widget.title } })
    onExpand(widget.id)
  }, [widget.id, widget.title, onExpand])

  const actions = usePanelActions({
    widgetId: widget.id,
    widgetTitle: widget.title,
    collapsed,
    onToggleCollapse: handleToggleCollapse,
    onExpand: handleExpand,
  })

  const quickActions = useQuickActions({
    widget,
    onRefresh: widget.kind === 'trending' || widget.kind === 'prices' || widget.kind === 'portfolio'
      ? () => onInsertQuickPrompt?.(`Refresh ${widget.title}`)
      : undefined,
  })

  const controls: PanelControlsConfig = useMemo(() => ({
    collapsed,
    onToggleCollapse: handleToggleCollapse,
    onExpand: handleExpand,
  }), [collapsed, handleToggleCollapse, handleExpand])

  const { panelStatus, panelError, panelRetry, widgetContent } = useMemo(() => {
    let status: PanelCardProps['status'] = 'idle'
    let error: string | undefined
    let retry: (() => void) | undefined
    let content: React.ReactNode = null

    if (payload && typeof payload === 'object' && payload.status === 'loading') {
      status = 'loading'
    }

    switch (widget.kind) {
      case 'history-summary':
        content = <HistorySummaryPanel widget={widget as Widget<HistorySummaryResponse>} />
        break
      case 'history-comparison':
        content = <HistoryComparisonTable report={(widget as Widget<HistoryComparisonReport>).payload} />
        break
      case 'portfolio':
        content = (
          <PortfolioOverview
            payload={payload}
            walletAddress={walletAddress}
            collapsed={collapsed}
            controls={controls}
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
          content = (
            <RelayQuoteWidget
              panel={widget}
              walletAddress={walletAddress}
              walletReady={walletReady}
              onExecuteQuote={executeFn}
              onRefreshQuote={refreshFn}
              onInsertQuickPrompt={onInsertQuickPrompt}
              controls={controls}
            />
          )
        } else {
          content = <div className="text-sm text-slate-700">{JSON.stringify(payload)}</div>
        }
        break
      }
      case 'prices':
        content = <TopCoinsPanel payload={payload} />
        break
      case 'trending': {
        const tokens = Array.isArray(payload?.tokens) ? payload.tokens : []
        const fetchedAt = typeof payload?.fetchedAt === 'string' ? payload.fetchedAt : undefined
        const errorMsg = typeof payload?.error === 'string' ? payload.error : undefined
        if (errorMsg && tokens.length === 0) {
          status = 'error'
          error = errorMsg
          retry = () => onInsertQuickPrompt?.('Show me trending tokens again.')
        } else if (payload?.layout === 'banner') {
          content = (
            <TrendingTokensBanner
              tokens={tokens}
              fetchedAt={fetchedAt}
              onInsertQuickPrompt={onInsertQuickPrompt}
              onViewAll={handleExpand}
              error={errorMsg}
            />
          )
        } else {
          content = (
            <TrendingTokensList
              tokens={tokens}
              fetchedAt={fetchedAt}
              error={errorMsg}
              onInsertQuickPrompt={onInsertQuickPrompt}
            />
          )
        }
        break
      }
      case 'chart':
        content = <ChartPanel widget={widget} onExpand={handleExpand} />
        break
      default:
        content = <div className="text-sm text-slate-400">{JSON.stringify(payload)}</div>
        break
    }

    return { panelStatus: status, panelError: error, panelRetry: retry, widgetContent: content }
  }, [
    widget,
    payload,
    collapsed,
    controls,
    walletAddress,
    walletReady,
    onSwap,
    onBridge,
    onRefreshSwapQuote,
    onRefreshBridgeQuote,
    onInsertQuickPrompt,
    handleExpand,
  ])

  // Chart widgets get minimal wrapper - they handle their own chrome
  if (widget.kind === 'chart') {
    return (
      <div
        data-panel-id={widget.id}
        data-highlighted={isHighlighted ? 'true' : undefined}
        className="chart-panel-container"
      >
        <PanelErrorBoundary panelId={widget.id} panelTitle={widget.title}>
          <Suspense fallback={<CardSkeleton density={density} />}>
            {widgetContent}
          </Suspense>
        </PanelErrorBoundary>
      </div>
    )
  }

  return (
    <PanelCard
      id={widget.id}
      title={widget.title}
      density={density}
      collapsed={collapsed}
      onToggleCollapse={handleToggleCollapse}
      onExpand={handleExpand}
      actions={actions}
      quickActions={quickActions}
      sources={widget.sources}
      highlighted={isHighlighted}
      status={panelStatus}
      errorMessage={panelError}
      onRetry={panelRetry}
      icon={getWidgetIcon(widget.kind)}
    >
      <PanelErrorBoundary panelId={widget.id} panelTitle={widget.title}>
        <Suspense fallback={<CardSkeleton density={density} />}>
          {panelStatus === 'error' ? null : widgetContent}
        </Suspense>
      </PanelErrorBoundary>
    </PanelCard>
  )
}

export const PanelItem = React.memo(PanelItemComponent)
PanelItem.displayName = 'PanelItem'
