import React, { Suspense, useEffect, useState } from 'react'
import { Minimize2 } from 'lucide-react'

import type { Widget } from '../../types/widgets'
import { PortfolioOverview } from './PortfolioOverview'
import { TopCoinsPanel } from './TopCoinsPanel'
import { CardSkeleton } from './CardSkeleton'
import { readThemeTokens, withAlpha, type ThemeTokens } from '../../utils/theme'

const ChartPanel = React.lazy(() => import('./ChartPanel'))
const RelayQuoteWidget = React.lazy(() => import('../widgets/RelayQuoteWidget'))
const TrendingTokensList = React.lazy(() =>
  import('../widgets/TrendingTokensWidget').then((module) => ({ default: module.TrendingTokensList })),
)

export interface ExpandedPanelModalProps {
  widget?: Widget
  onClose: () => void
  walletAddress?: string
  walletReady?: boolean
  onBridge?: (widget: Widget) => Promise<string | void>
  onSwap?: (widget: Widget) => Promise<string | void>
  onRefreshBridgeQuote?: () => Promise<void>
  onRefreshSwapQuote?: () => Promise<void>
  onInsertQuickPrompt?: (prompt: string) => void
}

export function ExpandedPanelModal({
  widget,
  onClose,
  walletAddress,
  walletReady,
  onBridge,
  onSwap,
  onRefreshBridgeQuote,
  onRefreshSwapQuote,
  onInsertQuickPrompt,
}: ExpandedPanelModalProps) {
  const [theme, setTheme] = useState<ThemeTokens>(() => readThemeTokens())

  useEffect(() => {
    if (typeof window === 'undefined') return
    const updateTheme = () => setTheme(readThemeTokens())
    updateTheme()
    const observer = new MutationObserver(updateTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style'] })
    return () => observer.disconnect()
  }, [])

  if (!widget) return null

  const renderContent = () => {
    if (widget.kind === 'chart') return <ChartPanel widget={widget} />
    if (widget.kind === 'portfolio') {
      return <PortfolioOverview payload={widget.payload} walletAddress={walletAddress} />
    }
    if (widget.kind === 'card') {
      const quoteType = typeof widget.payload?.quote_type === 'string' ? widget.payload.quote_type : undefined
      const isSwapPanel = quoteType === 'swap' || widget.id === 'relay_swap_quote'
      const isBridgePanel = quoteType === 'bridge' || widget.id === 'relay_bridge_quote'
      if (isSwapPanel || isBridgePanel) {
        const executeFn = isSwapPanel ? onSwap : onBridge
        const refreshFn = isSwapPanel ? onRefreshSwapQuote : onRefreshBridgeQuote
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
      return <div className="text-sm text-slate-700">{JSON.stringify(widget.payload)}</div>
    }
    if (widget.kind === 'prices') return <TopCoinsPanel payload={widget.payload} />
    if (widget.kind === 'trending') {
      return (
        <TrendingTokensList
          tokens={Array.isArray(widget.payload?.tokens) ? widget.payload.tokens : []}
          fetchedAt={typeof widget.payload?.fetchedAt === 'string' ? widget.payload.fetchedAt : undefined}
          error={typeof widget.payload?.error === 'string' ? widget.payload.error : undefined}
          onInsertQuickPrompt={onInsertQuickPrompt}
        />
      )
    }
    if (widget.kind === 'prediction') {
      return (
        <div className="space-y-2">
          {(widget.payload?.markets || []).map((market: any) => (
            <div key={market.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3">
              <div className="text-sm text-slate-900">{market.question}</div>
              <div className="flex items-center gap-3 text-xs text-slate-600">
                <span>Yes {Math.round((market.yesPrice || 0) * 100)}%</span>
                <span>No {Math.round((market.noPrice || 0) * 100)}%</span>
                <a href={market.url} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline">
                  Open
                </a>
              </div>
            </div>
          ))}
        </div>
      )
    }
    return <div className="text-sm text-slate-400">{JSON.stringify(widget.payload)}</div>
  }

  const panelBorder = withAlpha(theme.line, 0.8)
  const headerBorder = withAlpha(theme.line, 0.6)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-3 sm:items-center sm:p-6">
      <div
        className="w-full max-w-4xl max-h-[85vh] rounded-3xl shadow-2xl border flex flex-col"
        style={{ backgroundColor: theme.surface, borderColor: panelBorder, color: theme.text }}
      >
        <div
          className="px-5 py-4 flex items-center justify-between"
          style={{ borderBottom: `1px solid ${headerBorder}` }}
        >
          <div className="text-lg font-semibold" style={{ color: theme.text }}>
            {widget.title}
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-full transition"
            style={{ color: theme.text, backgroundColor: withAlpha(theme.line, 0.2) }}
            title="Close"
            aria-label="Close"
          >
            <Minimize2 className="h-4 w-4 mx-auto" />
          </button>
        </div>
        <div className="p-5 flex-1 overflow-y-auto">
          <Suspense fallback={<CardSkeleton density="full" />}>
            {renderContent()}
          </Suspense>
        </div>
      </div>
    </div>
  )
}
