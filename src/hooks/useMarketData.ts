/**
 * MARKET DATA HOOK
 *
 * Focused hook for fetching and managing market data widgets.
 * Handles top coins, trending tokens, and price charts.
 */

import { useCallback, useEffect, useRef } from 'react'
import { useSherpaStore } from '../store'
import { getTopPrices } from '../services/prices'
import { getTrendingTokens, type TrendingToken } from '../services/trending'
import type { Widget } from '../types/widgets'

// Token price widget ID constant
export const TOKEN_PRICE_WIDGET_ID = 'token_price_chart'

// Auto-refresh interval for trending tokens (60 seconds)
const TRENDING_REFRESH_INTERVAL = 60_000

export function useMarketData() {
  const {
    widgets,
    addWidget,
    setHighlightedWidgets,
    show: showWorkspace,
  } = useSherpaStore((state) => ({
    widgets: state.widgets,
    addWidget: state.addWidget,
    setHighlightedWidgets: state.setHighlightedWidgets,
    show: state.show,
  }))

  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Load top coins panel
  const loadTopCoins = useCallback(async (options: { highlight?: boolean } = {}) => {
    const { highlight = true } = options

    try {
      const coins = await getTopPrices(5)

      if (!isMountedRef.current) return

      const widget: Widget = {
        id: 'top_coins',
        kind: 'prices',
        title: 'Top Coins (excl. stablecoins)',
        payload: { coins },
        sources: [{ label: 'CoinGecko', href: 'https://www.coingecko.com' }],
        density: 'rail',
      }

      addWidget(widget)

      if (highlight) {
        setHighlightedWidgets(['top_coins'])
      }

      return widget
    } catch (error) {
      console.error('Failed to load top coins:', error)
      throw error
    }
  }, [addWidget, setHighlightedWidgets])

  // Load trending tokens panel
  const loadTrendingTokens = useCallback(async (options: { highlight?: boolean } = {}) => {
    const { highlight = false } = options

    let tokens: TrendingToken[] = []
    let errorMessage: string | undefined

    try {
      tokens = await getTrendingTokens(8)
    } catch (error: any) {
      errorMessage = error?.message || 'Unable to load trending tokens.'
    }

    if (!isMountedRef.current) return

    const widget: Widget = {
      id: 'trending_tokens',
      kind: 'trending',
      title: 'Trending Tokens (Relay-ready)',
      payload: {
        tokens,
        fetchedAt: new Date().toISOString(),
        error: errorMessage,
        layout: 'banner',
      },
      sources: [
        { label: 'CoinGecko', href: 'https://www.coingecko.com' },
        { label: 'Relay', href: 'https://relay.link' },
      ],
      density: 'full',
    }

    // Check if widget already exists
    const existed = widgets.some((w) => w.id === 'trending_tokens')
    addWidget(widget)

    if (highlight || !existed) {
      setHighlightedWidgets(['trending_tokens'])
    }

    return widget
  }, [widgets, addWidget, setHighlightedWidgets])

  // Load token price chart
  const loadTokenChart = useCallback(async (
    coinId: string,
    symbol: string,
    options: { highlight?: boolean } = {}
  ) => {
    const { highlight = true } = options

    const widget: Widget = {
      id: TOKEN_PRICE_WIDGET_ID,
      kind: 'chart',
      title: `${symbol} Price Chart`,
      payload: { coin_id: coinId, symbol },
      sources: [{ label: 'CoinGecko', href: 'https://www.coingecko.com' }],
      density: 'full',
    }

    addWidget(widget)

    if (highlight) {
      setHighlightedWidgets([TOKEN_PRICE_WIDGET_ID])
    }

    return widget
  }, [addWidget, setHighlightedWidgets])

  // Open workspace with specific data
  const openTopCoins = useCallback(async () => {
    await loadTopCoins({ highlight: true })
    showWorkspace()
  }, [loadTopCoins, showWorkspace])

  const openTrendingTokens = useCallback(async () => {
    await loadTrendingTokens({ highlight: true })
    showWorkspace()
  }, [loadTrendingTokens, showWorkspace])

  // Auto-refresh trending tokens
  useEffect(() => {
    // Initial load
    loadTrendingTokens({ highlight: true }).catch(() => {})

    // Set up interval for refresh
    const interval = setInterval(() => {
      loadTrendingTokens().catch(() => {})
    }, TRENDING_REFRESH_INTERVAL)

    return () => clearInterval(interval)
  }, [loadTrendingTokens])

  return {
    // Data loading
    loadTopCoins,
    loadTrendingTokens,
    loadTokenChart,

    // Convenience actions
    openTopCoins,
    openTrendingTokens,

    // Utils
    TOKEN_PRICE_WIDGET_ID,
  }
}
