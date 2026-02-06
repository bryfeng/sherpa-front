import React, { Suspense } from 'react'
import { FileQuestion } from 'lucide-react'
import type { Widget } from '../../../types/widgets'
import { useSherpaStore } from '../../../store'
import { CardSkeleton } from '../../panels/CardSkeleton'
import { PanelErrorBoundary } from '../../panels/PanelErrorBoundary'
import { RelayQuoteWidget } from '../RelayQuoteWidget'

// Lazy load heavy components
const ChartPanel = React.lazy(() => import('../../panels/ChartPanel'))
const PortfolioOverview = React.lazy(() =>
  import('../../panels/PortfolioOverview').then((m) => ({ default: m.PortfolioOverview }))
)
const TopCoinsPanel = React.lazy(() =>
  import('../../panels/TopCoinsPanel').then((m) => ({ default: m.TopCoinsPanel }))
)
const TrendingTokensList = React.lazy(() =>
  import('../TrendingTokensWidget').then((m) => ({ default: m.TrendingTokensList }))
)
const HistorySummaryPanel = React.lazy(() =>
  import('../../panels/history/HistorySummaryPanel').then((m) => ({ default: m.HistorySummaryPanel }))
)

// Policy widgets
const RiskPolicyWidget = React.lazy(() =>
  import('../../policy/RiskPolicyWidget').then((m) => ({ default: m.RiskPolicyWidget }))
)
const SessionKeysWidget = React.lazy(() =>
  import('../../policy/SessionKeysWidget').then((m) => ({ default: m.SessionKeysWidget }))
)
const PolicyStatusWidget = React.lazy(() =>
  import('../../policy/PolicyStatusWidget').then((m) => ({ default: m.PolicyStatusWidget }))
)

// Strategy widgets
const StrategiesWidget = React.lazy(() =>
  import('../../strategies/StrategiesWidget').then((m) => ({ default: m.StrategiesWidget }))
)

// Transaction history widget
const TransactionHistoryWidget = React.lazy(() =>
  import('../../transactions/TransactionHistoryWidget').then((m) => ({ default: m.TransactionHistoryWidget }))
)

// Type for dca-strategies payload
interface DCAStrategiesPayload {
  walletAddress?: string
  userId?: string
  walletId?: string
}

export interface WidgetContentProps {
  widget: Widget | null
  walletAddress?: string
  walletReady?: boolean
  /** Swap/Bridge execution callbacks */
  onSwap?: (widget: Widget) => Promise<string | void>
  onBridge?: (widget: Widget) => Promise<string | void>
  onRefreshSwapQuote?: (widget: Widget) => Promise<void>
  onRefreshBridgeQuote?: (widget: Widget) => Promise<void>
  onInsertQuickPrompt?: (prompt: string) => void
  /** Callback to expand widget in modal */
  onExpandWidget?: (widgetId: string) => void
}

export function WidgetContent({
  widget,
  walletAddress,
  walletReady,
  onSwap,
  onBridge,
  onRefreshSwapQuote,
  onRefreshBridgeQuote,
  onInsertQuickPrompt,
  onExpandWidget,
}: WidgetContentProps) {
  if (!widget) {
    return <WidgetEmptyState />
  }

  return (
    <div className="flex-1 overflow-auto p-4">
      <PanelErrorBoundary>
        <Suspense fallback={<CardSkeleton density="full" />}>
          <WidgetRenderer
            widget={widget}
            walletAddress={walletAddress}
            walletReady={walletReady}
            onSwap={onSwap}
            onBridge={onBridge}
            onRefreshSwapQuote={onRefreshSwapQuote}
            onRefreshBridgeQuote={onRefreshBridgeQuote}
            onInsertQuickPrompt={onInsertQuickPrompt}
            onExpandWidget={onExpandWidget}
          />
        </Suspense>
      </PanelErrorBoundary>
    </div>
  )
}

function WidgetRenderer({
  widget,
  walletAddress,
  walletReady,
  onSwap,
  onBridge,
  onRefreshSwapQuote,
  onRefreshBridgeQuote,
  onInsertQuickPrompt,
  onExpandWidget,
}: {
  widget: Widget
  walletAddress?: string
  walletReady?: boolean
  onSwap?: (widget: Widget) => Promise<string | void>
  onBridge?: (widget: Widget) => Promise<string | void>
  onRefreshSwapQuote?: (widget: Widget) => Promise<void>
  onRefreshBridgeQuote?: (widget: Widget) => Promise<void>
  onInsertQuickPrompt?: (prompt: string) => void
  onExpandWidget?: (widgetId: string) => void
}) {
  const payload: any = widget.payload

  switch (widget.kind) {
    case 'chart':
      return <ChartPanel widget={widget} />

    case 'portfolio':
      return (
        <PortfolioOverview
          payload={payload}
          walletAddress={walletAddress}
          collapsed={false}
          controls={{
            collapsed: false,
            onToggleCollapse: () => {},
            onExpand: () => onExpandWidget?.(widget.id),
          }}
        />
      )

    case 'prices':
      return <TopCoinsPanel payload={payload} />

    case 'trending': {
      const tokens = Array.isArray(payload?.tokens) ? payload.tokens : []
      return <TrendingTokensList tokens={tokens} />
    }

    case 'history-summary':
      return <HistorySummaryPanel widget={widget as any} />

    case 'card': {
      // Check if this is a swap or bridge quote
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
          />
        )
      }

      // Generic card content
      return (
        <div className="rounded-lg border p-4" style={{ borderColor: 'var(--line)' }}>
          <h3 className="mb-2 text-sm font-medium">{widget.title}</h3>
          {payload?.content && (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {payload.content}
            </p>
          )}
        </div>
      )
    }

    // Policy widgets
    case 'risk-policy':
      return <RiskPolicyWidget widget={widget} walletAddress={walletAddress} />

    case 'session-keys':
      return <SessionKeysWidget widget={widget} walletAddress={walletAddress} />

    case 'policy-status':
      return <PolicyStatusWidget />

    // Strategy widgets
    case 'dca-strategies': {
      const dcaPayload = payload as DCAStrategiesPayload
      return (
        <StrategiesWidget
          walletAddress={dcaPayload?.walletAddress ?? walletAddress ?? null}
          userId={dcaPayload?.userId as any}
          walletId={dcaPayload?.walletId as any}
        />
      )
    }

    // Transaction history widget
    case 'transaction-history':
      return <TransactionHistoryWidget />

    default:
      return (
        <div
          className="flex flex-col items-center justify-center gap-2 rounded-lg border p-8"
          style={{ borderColor: 'var(--line)', color: 'var(--text-muted)' }}
        >
          <FileQuestion className="h-8 w-8" />
          <p className="text-sm">Unknown widget type: {widget.kind}</p>
        </div>
      )
  }
}

function WidgetEmptyState() {
  return (
    <div
      className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center"
      style={{ color: 'var(--text-muted)' }}
    >
      <div
        className="rounded-xl p-5"
        style={{ background: 'var(--surface-2)', border: '1px dashed var(--line)' }}
      >
        <FileQuestion className="h-10 w-10" style={{ color: 'var(--accent)' }} />
      </div>
      <div className="max-w-[240px]">
        <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
          No widget selected
        </p>
        <p className="mt-2 text-xs leading-relaxed">
          Pin charts, portfolios, and analysis from chat to keep them visible while you explore.
        </p>
        <p className="mt-3 text-[11px]" style={{ color: 'var(--text-muted)' }}>
          Press <kbd className="rounded border px-1.5 py-0.5 text-[10px] font-mono" style={{ borderColor: 'var(--line)', background: 'var(--surface-3)' }}>Esc</kbd> to close
        </p>
      </div>
    </div>
  )
}
