/**
 * WIDGET CONTENT COMPONENTS
 *
 * Individual widget components that connect to backend data.
 * Each widget uses its own data hook for proper lifecycle management.
 */

import React, { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TrendingUp, TrendingDown, Loader2, AlertCircle, RefreshCw, ChevronDown, ArrowDownUp, Info } from 'lucide-react'
import type { Widget } from '../../types/widget-system'
import { usePortfolioSummary } from '../../workspace/hooks/usePortfolioSummary'
import { usePriceTicker } from '../../workspace/hooks/usePriceTicker'
import { useSwapQuote, COMMON_TOKENS, type CommonToken } from '../../workspace/hooks/useSwapQuote'
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
          {data.totalUsdFormatted}
        </span>
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

      {/* Top positions preview */}
      {data.topPositions && data.topPositions.length > 0 && (
        <div className="space-y-2 pt-2">
          {data.topPositions.slice(0, 3).map((position) => (
            <div
              key={position.symbol}
              className="flex items-center justify-between py-1"
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium"
                  style={{ background: 'var(--surface-2)', color: 'var(--text)' }}
                >
                  {position.symbol.slice(0, 2)}
                </div>
                <span className="text-sm" style={{ color: 'var(--text)' }}>
                  {position.symbol}
                </span>
              </div>
              <span className="text-sm tabular-nums" style={{ color: 'var(--text-muted)' }}>
                {position.usdFormatted}
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

// Token format from backend (CoinGecko)
interface BackendToken {
  id?: string
  symbol: string
  name?: string
  price_usd?: number
  change_24h?: number | null
  market_cap?: number
  volume_24h?: number
}

interface PriceTickerWidgetProps {
  tokens?: BackendToken[]  // Contextual tokens from backend
  limit?: number
}

// Format price for display
function formatTokenPrice(value?: number): string {
  if (value == null || !Number.isFinite(value)) return '—'
  const abs = Math.abs(value)
  const options: Intl.NumberFormatOptions = abs >= 1
    ? { maximumFractionDigits: 2, minimumFractionDigits: 2 }
    : { maximumFractionDigits: 6, minimumFractionDigits: 2 }
  return `$${value.toLocaleString(undefined, options)}`
}

// Format percentage change
function formatTokenChange(value?: number | null): string {
  if (value == null || !Number.isFinite(value)) return '—'
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

// Transform backend tokens to display format
function transformBackendTokens(tokens: BackendToken[]) {
  return tokens.map((token) => ({
    id: token.id || token.symbol,
    symbol: token.symbol?.toUpperCase() || '?',
    name: token.name || token.symbol,
    price: token.price_usd ?? 0,
    priceFormatted: formatTokenPrice(token.price_usd),
    change24h: token.change_24h ?? null,
    changeFormatted: formatTokenChange(token.change_24h),
    isPositive: (token.change_24h ?? 0) >= 0,
  }))
}

export function PriceTickerWidget({ tokens, limit = 5 }: PriceTickerWidgetProps) {
  // If tokens are provided from backend, use those directly
  const hasContextualTokens = tokens && tokens.length > 0

  // Only fetch if no contextual tokens provided
  const { data, status, error, refresh, isFetching } = usePriceTicker({
    limit,
    auto: !hasContextualTokens, // Don't auto-fetch if we have tokens
    refreshInterval: hasContextualTokens ? 0 : 60000,
  })

  // Use contextual tokens if available, otherwise use fetched data
  const displayTokens = hasContextualTokens
    ? transformBackendTokens(tokens).slice(0, limit)
    : data?.coins || []

  // Loading state (only when fetching and no contextual tokens)
  if (!hasContextualTokens && status === 'loading' && !data) {
    return <WidgetLoading message="Loading prices..." />
  }

  // Error state (only when fetching and no contextual tokens)
  if (!hasContextualTokens && status === 'error') {
    return <WidgetError message={error || undefined} onRetry={refresh} />
  }

  if (displayTokens.length === 0) {
    return <WidgetLoading message="Loading prices..." />
  }

  return (
    <div className="space-y-1">
      {/* Scrollable coin list */}
      <div className="flex gap-3 overflow-x-auto py-2 -mx-1 px-1">
        {displayTokens.map((coin) => (
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

      {/* Refreshing indicator (only when fetching fallback data) */}
      {!hasContextualTokens && isFetching && (
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

interface TokenSelectorProps {
  selected: CommonToken
  onSelect: (token: CommonToken) => void
  exclude?: string
}

function TokenSelector({ selected, onSelect, exclude }: TokenSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const availableTokens = COMMON_TOKENS.filter((t) => t.symbol !== exclude)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
        style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--line)' }}
      >
        {selected.symbol}
        <ChevronDown className="w-3 h-3" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute right-0 top-full mt-1 w-40 z-50 rounded-lg overflow-hidden py-1"
              style={{ background: 'var(--surface)', border: '1px solid var(--line)', boxShadow: 'var(--shadow-lg)' }}
            >
              {availableTokens.map((token) => (
                <button
                  key={token.symbol}
                  onClick={() => {
                    onSelect(token)
                    setIsOpen(false)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors"
                  style={{ color: 'var(--text)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-hover)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium"
                    style={{ background: 'var(--surface-2)' }}
                  >
                    {token.symbol.slice(0, 2)}
                  </div>
                  <div>
                    <div className="font-medium">{token.symbol}</div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{token.name}</div>
                  </div>
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

interface SwapWidgetProps {
  walletAddress?: string
}

export function SwapWidget({ walletAddress }: SwapWidgetProps) {
  const [fromToken, setFromToken] = useState<CommonToken>(COMMON_TOKENS[0]) // ETH
  const [toToken, setToToken] = useState<CommonToken>(COMMON_TOKENS[1]) // USDC
  const [amountIn, setAmountIn] = useState('')
  const [showDetails, setShowDetails] = useState(false)

  const { data: quote, status, error, isFetching, fetchQuote, refresh } = useSwapQuote({
    debounceMs: 500,
  })

  // Fetch quote when inputs change
  useEffect(() => {
    const amount = parseFloat(amountIn)
    if (amount > 0 && fromToken && toToken) {
      fetchQuote({
        token_in: fromToken.symbol,
        token_out: toToken.symbol,
        amount_in: amount,
        chain: 'ethereum',
        slippage_bps: 50, // 0.5%
        wallet_address: walletAddress || null,
      })
    }
  }, [amountIn, fromToken, toToken, walletAddress, fetchQuote])

  // Swap tokens
  const handleSwapTokens = useCallback(() => {
    const temp = fromToken
    setFromToken(toToken)
    setToToken(temp)
    setAmountIn('')
  }, [fromToken, toToken])

  const hasQuote = status === 'success' && quote
  const isLoading = status === 'loading' || isFetching
  const hasError = status === 'error'

  return (
    <div className="space-y-3">
      {/* From Token */}
      <div
        className="p-3 rounded-lg"
        style={{ background: 'var(--surface-2)', border: '1px solid var(--line)' }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>From</span>
          {hasQuote && (
            <span className="text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>
              {quote.valueInUsd}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            inputMode="decimal"
            placeholder="0.0"
            value={amountIn}
            onChange={(e) => {
              const val = e.target.value.replace(/[^0-9.]/g, '')
              if (val.split('.').length <= 2) {
                setAmountIn(val)
              }
            }}
            className="flex-1 bg-transparent text-xl font-medium outline-none tabular-nums"
            style={{ color: 'var(--text)' }}
          />
          <TokenSelector
            selected={fromToken}
            onSelect={setFromToken}
            exclude={toToken.symbol}
          />
        </div>
      </div>

      {/* Swap Direction Button */}
      <div className="flex justify-center -my-1">
        <motion.button
          onClick={handleSwapTokens}
          className="p-2 rounded-full transition-colors"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', color: 'var(--text-muted)' }}
          whileHover={{ scale: 1.1, borderColor: 'var(--accent)' }}
          whileTap={{ scale: 0.95 }}
        >
          <ArrowDownUp className="w-4 h-4" />
        </motion.button>
      </div>

      {/* To Token */}
      <div
        className="p-3 rounded-lg"
        style={{ background: 'var(--surface-2)', border: '1px solid var(--line)' }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>To (estimated)</span>
          {hasQuote && (
            <span className="text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>
              {quote.valueOutUsd}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div
            className="flex-1 text-xl font-medium tabular-nums"
            style={{ color: hasQuote ? 'var(--text)' : 'var(--text-muted)' }}
          >
            {isLoading && amountIn ? (
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                ...
              </motion.div>
            ) : hasQuote ? (
              quote.amountOutFormatted
            ) : (
              '0.0'
            )}
          </div>
          <TokenSelector
            selected={toToken}
            onSelect={setToToken}
            exclude={fromToken.symbol}
          />
        </div>
      </div>

      {/* Quote Details */}
      {hasQuote && (
        <div className="space-y-2">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full flex items-center justify-between text-xs py-1"
            style={{ color: 'var(--text-muted)' }}
          >
            <span className="flex items-center gap-1">
              <Info className="w-3 h-3" />
              {quote.rateFormatted}
            </span>
            <ChevronDown
              className={`w-3 h-3 transition-transform ${showDetails ? 'rotate-180' : ''}`}
            />
          </button>

          <AnimatePresence>
            {showDetails && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div
                  className="p-2 rounded-lg space-y-1 text-xs"
                  style={{ background: 'var(--surface-2)' }}
                >
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-muted)' }}>Estimated Fee</span>
                    <span style={{ color: 'var(--text)' }}>{quote.feeFormatted}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-muted)' }}>Slippage</span>
                    <span style={{ color: 'var(--text)' }}>{quote.slippageFormatted}</span>
                  </div>
                  {quote.sources.length > 0 && (
                    <div className="flex justify-between">
                      <span style={{ color: 'var(--text-muted)' }}>Route</span>
                      <span style={{ color: 'var(--text)' }}>{quote.sources.join(' → ')}</span>
                    </div>
                  )}
                  {quote.warnings.length > 0 && (
                    <div className="pt-1 border-t" style={{ borderColor: 'var(--line)' }}>
                      {quote.warnings.map((warning, i) => (
                        <div key={i} className="flex items-start gap-1" style={{ color: 'var(--warning)' }}>
                          <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          <span>{warning}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Error State */}
      {hasError && amountIn && (
        <div
          className="flex items-center gap-2 p-2 rounded-lg text-xs"
          style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' }}
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error || 'Failed to get quote'}</span>
          <button
            onClick={refresh}
            className="ml-auto p-1 rounded hover:bg-white/10"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Swap Button */}
      <motion.button
        disabled={!walletAddress || !hasQuote || isLoading}
        className="w-full py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background: walletAddress ? 'var(--accent)' : 'var(--surface-2)',
          color: walletAddress ? 'var(--text-inverse)' : 'var(--text-muted)',
        }}
        whileHover={walletAddress && hasQuote ? { scale: 1.01 } : undefined}
        whileTap={walletAddress && hasQuote ? { scale: 0.99 } : undefined}
      >
        {!walletAddress ? (
          'Connect Wallet'
        ) : isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Getting Quote...
          </span>
        ) : hasQuote ? (
          'Swap'
        ) : (
          'Enter Amount'
        )}
      </motion.button>
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
