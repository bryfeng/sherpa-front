/**
 * WIDGET CONTENT COMPONENTS
 *
 * Individual widget components that connect to backend data.
 * Each widget uses its own data hook for proper lifecycle management.
 */

import React from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import type { Widget } from '../../types/widget-system'
import { usePortfolioSummary } from '../../workspace/hooks/usePortfolioSummary'
import { usePriceTicker } from '../../workspace/hooks/usePriceTicker'
import '../../styles/design-system.css'

// ============================================
// SHARED COMPONENTS
// ============================================

function WidgetLoading({ message = 'Loading...' }: { message?: string }) {
  return (
    <div
      className="flex items-center justify-center gap-2 py-4"
      style={{ color: 'var(--text-muted)' }}
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      >
        <Loader2 className="w-4 h-4" />
      </motion.div>
      <span className="text-sm">{message}</span>
    </div>
  )
}

function WidgetError({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-2 py-4"
      style={{ color: 'var(--text-muted)' }}
    >
      <AlertCircle className="w-5 h-5" style={{ color: 'var(--danger)' }} />
      <p className="text-sm text-center">{message || 'Failed to load data'}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors"
          style={{ background: 'var(--surface-2)', color: 'var(--text)' }}
        >
          <RefreshCw className="w-3 h-3" />
          Retry
        </button>
      )}
    </div>
  )
}

// ============================================
// PORTFOLIO SUMMARY WIDGET
// ============================================

interface PortfolioSummaryWidgetProps {
  walletAddress?: string
  chain?: string
}

export function PortfolioSummaryWidget({ walletAddress, chain }: PortfolioSummaryWidgetProps) {
  const { data, status, error, refresh, isFetching } = usePortfolioSummary({
    walletAddress,
    chain,
    auto: Boolean(walletAddress),
  })

  if (!walletAddress) {
    return (
      <div className="text-center py-4">
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Connect wallet to view portfolio
        </p>
      </div>
    )
  }

  if (status === 'loading' && !data) {
    return <WidgetLoading message="Loading portfolio..." />
  }

  if (status === 'error') {
    return <WidgetError message={error || undefined} onRetry={refresh} />
  }

  if (!data) {
    return <WidgetLoading message="Loading portfolio..." />
  }

  const isPositive = (data.change24hPercent ?? 0) >= 0

  return (
    <div className="space-y-4">
      {/* Total Value */}
      <div className="flex items-center justify-between">
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Total Value
        </span>
        <span
          className="text-2xl font-semibold tabular-nums"
          style={{ color: 'var(--text)' }}
        >
          {data.totalValueFormatted}
        </span>
      </div>

      {/* 24h Change */}
      <div className="flex items-center justify-between">
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
          24h Change
        </span>
        <div className="flex items-center gap-1.5">
          {isPositive ? (
            <TrendingUp className="w-4 h-4" style={{ color: 'var(--success)' }} />
          ) : (
            <TrendingDown className="w-4 h-4" style={{ color: 'var(--danger)' }} />
          )}
          <span
            className="font-medium tabular-nums"
            style={{ color: isPositive ? 'var(--success)' : 'var(--danger)' }}
          >
            {data.change24hFormatted}
          </span>
        </div>
      </div>

      {/* Token count */}
      {data.tokenCount > 0 && (
        <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: 'var(--line)' }}>
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Assets
          </span>
          <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
            {data.tokenCount} token{data.tokenCount !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Top tokens preview */}
      {data.topTokens && data.topTokens.length > 0 && (
        <div className="space-y-2 pt-2">
          {data.topTokens.slice(0, 3).map((token) => (
            <div
              key={token.symbol}
              className="flex items-center justify-between py-1"
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium"
                  style={{ background: 'var(--surface-2)', color: 'var(--text)' }}
                >
                  {token.symbol.slice(0, 2)}
                </div>
                <span className="text-sm" style={{ color: 'var(--text)' }}>
                  {token.symbol}
                </span>
              </div>
              <span className="text-sm tabular-nums" style={{ color: 'var(--text-muted)' }}>
                {token.valueFormatted}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Refreshing indicator */}
      {isFetching && (
        <div className="flex items-center justify-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <RefreshCw className="w-3 h-3" />
          </motion.div>
          <span>Refreshing...</span>
        </div>
      )}
    </div>
  )
}

// ============================================
// PRICE TICKER WIDGET
// ============================================

interface PriceTickerWidgetProps {
  limit?: number
}

export function PriceTickerWidget({ limit = 5 }: PriceTickerWidgetProps) {
  const { data, status, error, refresh, isFetching } = usePriceTicker({
    limit,
    auto: true,
    refreshInterval: 60000,
  })

  if (status === 'loading' && !data) {
    return <WidgetLoading message="Loading prices..." />
  }

  if (status === 'error') {
    return <WidgetError message={error || undefined} onRetry={refresh} />
  }

  if (!data || data.coins.length === 0) {
    return <WidgetLoading message="Loading prices..." />
  }

  return (
    <div className="space-y-1">
      {/* Scrollable coin list */}
      <div className="flex gap-3 overflow-x-auto py-2 -mx-1 px-1">
        {data.coins.map((coin) => (
          <motion.div
            key={coin.id}
            className="flex-shrink-0 px-4 py-3 rounded-lg min-w-[120px]"
            style={{ background: 'var(--surface-2)' }}
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex items-center justify-between mb-1">
              <span
                className="text-sm font-medium"
                style={{ color: 'var(--text)' }}
              >
                {coin.symbol}
              </span>
              {coin.isPositive ? (
                <TrendingUp className="w-3 h-3" style={{ color: 'var(--success)' }} />
              ) : (
                <TrendingDown className="w-3 h-3" style={{ color: 'var(--danger)' }} />
              )}
            </div>
            <div
              className="text-sm font-semibold tabular-nums"
              style={{ color: 'var(--text)' }}
            >
              {coin.priceFormatted}
            </div>
            <div
              className="text-xs tabular-nums"
              style={{ color: coin.isPositive ? 'var(--success)' : 'var(--danger)' }}
            >
              {coin.changeFormatted}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Refreshing indicator */}
      {isFetching && (
        <div className="flex items-center justify-center gap-1 text-xs pt-1" style={{ color: 'var(--text-muted)' }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <RefreshCw className="w-3 h-3" />
          </motion.div>
          <span>Updating...</span>
        </div>
      )}
    </div>
  )
}

// ============================================
// PRICE CHART WIDGET (Placeholder)
// ============================================

interface PriceChartWidgetProps {
  symbol?: string
}

export function PriceChartWidget({ symbol = 'ETH' }: PriceChartWidgetProps) {
  // TODO: Connect to getTokenChart API when chart library is integrated
  return (
    <div
      className="h-48 rounded-lg flex items-center justify-center"
      style={{ background: 'var(--surface-2)' }}
    >
      <div className="text-center">
        <div className="text-lg font-medium" style={{ color: 'var(--text)' }}>
          {symbol} Chart
        </div>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Chart visualization coming soon
        </p>
      </div>
    </div>
  )
}

// ============================================
// SWAP WIDGET
// ============================================

interface SwapWidgetProps {
  walletAddress?: string
}

export function SwapWidget({ walletAddress }: SwapWidgetProps) {
  // TODO: Connect to swap/quote API
  return (
    <div className="space-y-4">
      <div
        className="p-3 rounded-lg"
        style={{ background: 'var(--surface-2)', border: '1px solid var(--line)' }}
      >
        <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>From</div>
        <div className="flex items-center justify-between">
          <input
            type="text"
            placeholder="0.0"
            className="bg-transparent text-lg font-medium outline-none w-full"
            style={{ color: 'var(--text)' }}
          />
          <button
            className="px-3 py-1 rounded-lg text-sm flex-shrink-0"
            style={{ background: 'var(--surface)', color: 'var(--text)' }}
          >
            ETH
          </button>
        </div>
      </div>
      <div
        className="p-3 rounded-lg"
        style={{ background: 'var(--surface-2)', border: '1px solid var(--line)' }}
      >
        <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>To</div>
        <div className="flex items-center justify-between">
          <input
            type="text"
            placeholder="0.0"
            className="bg-transparent text-lg font-medium outline-none w-full"
            style={{ color: 'var(--text)' }}
          />
          <button
            className="px-3 py-1 rounded-lg text-sm flex-shrink-0"
            style={{ background: 'var(--surface)', color: 'var(--text)' }}
          >
            USDC
          </button>
        </div>
      </div>
      <button
        className="w-full py-3 rounded-lg font-medium"
        style={{ background: 'var(--accent)', color: 'var(--text-inverse)' }}
      >
        {walletAddress ? 'Swap' : 'Connect Wallet'}
      </button>
    </div>
  )
}

// ============================================
// AI SUMMARY WIDGET (Static for now)
// ============================================

export function AISummaryWidget() {
  return (
    <div className="space-y-3">
      <p style={{ color: 'var(--text)' }}>
        Welcome to Sherpa! I can help you analyze your portfolio, find opportunities,
        and make informed decisions about your DeFi positions.
      </p>
      <div className="flex flex-wrap gap-2">
        {['Portfolio Analysis', 'Market Trends', 'Risk Assessment'].map((topic) => (
          <span
            key={topic}
            className="px-2 py-1 text-xs rounded-lg"
            style={{
              background: 'var(--accent-muted)',
              color: 'var(--accent)',
            }}
          >
            {topic}
          </span>
        ))}
      </div>
    </div>
  )
}

// ============================================
// GAS TRACKER WIDGET (Static placeholder)
// ============================================

export function GasTrackerWidget() {
  // TODO: No backend endpoint for gas data yet
  return (
    <div className="flex items-center justify-between">
      <div className="text-center">
        <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Low</div>
        <div className="font-medium" style={{ color: 'var(--success)' }}>--</div>
      </div>
      <div className="text-center">
        <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Avg</div>
        <div className="font-medium" style={{ color: 'var(--warning)' }}>--</div>
      </div>
      <div className="text-center">
        <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Fast</div>
        <div className="font-medium" style={{ color: 'var(--danger)' }}>--</div>
      </div>
    </div>
  )
}

// ============================================
// NOTES WIDGET
// ============================================

export function NotesWidget() {
  return (
    <textarea
      placeholder="Type your research notes here..."
      className="w-full h-32 p-3 rounded-lg resize-none outline-none text-sm"
      style={{
        background: 'var(--surface-2)',
        border: '1px solid var(--line)',
        color: 'var(--text)',
      }}
    />
  )
}

// ============================================
// WATCHLIST WIDGET
// ============================================

export function WatchlistWidget() {
  // TODO: Implement watchlist persistence
  return (
    <div className="space-y-2">
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        Add tokens to your watchlist to track them.
      </p>
      <button
        className="w-full py-2 rounded-lg border border-dashed flex items-center justify-center gap-2"
        style={{ borderColor: 'var(--line)', color: 'var(--text-muted)' }}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add Token
      </button>
    </div>
  )
}

// ============================================
// WIDGET CONTENT DISPATCHER
// ============================================

interface WidgetContentProps {
  widget: Widget
  walletAddress?: string
  isPro: boolean
}

export function WidgetContent({ widget, walletAddress, isPro }: WidgetContentProps) {
  switch (widget.kind) {
    case 'portfolio-summary':
      return (
        <PortfolioSummaryWidget
          walletAddress={walletAddress}
          chain="ethereum"
        />
      )

    case 'price-ticker':
      return <PriceTickerWidget limit={5} />

    case 'price-chart':
      return <PriceChartWidget symbol={(widget.payload as any)?.symbol || 'ETH'} />

    case 'ai-summary':
      return <AISummaryWidget />

    case 'gas-tracker':
      return <GasTrackerWidget />

    case 'swap':
      return <SwapWidget walletAddress={walletAddress} />

    case 'notes':
      return <NotesWidget />

    case 'watchlist':
      return <WatchlistWidget />

    default:
      return (
        <div className="text-center py-4">
          <p style={{ color: 'var(--text-muted)' }}>
            Widget content for &quot;{widget.kind}&quot;
          </p>
          {!isPro && widget.kind.includes('prediction') && (
            <p className="text-sm mt-2" style={{ color: 'var(--warning)' }}>
              This is a Pro feature
            </p>
          )}
        </div>
      )
  }
}
