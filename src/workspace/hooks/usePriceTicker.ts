import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getTopPrices, type TopCoin } from '../../services/prices'
import type { WorkspaceHookResult, WorkspaceRequestStatus } from '../types'

interface UsePriceTickerOptions {
  limit?: number
  auto?: boolean
  refreshInterval?: number
}

const DEFAULT_OPTIONS: Required<UsePriceTickerOptions> = {
  limit: 5,
  auto: true,
  refreshInterval: 60000, // 60 seconds
}

export interface PriceTickerViewModel {
  coins: Array<{
    id: string
    symbol: string
    name: string
    price: number
    priceFormatted: string
    change24h: number | null
    changeFormatted: string
    isPositive: boolean
  }>
  fetchedAt: string
}

function formatPrice(value: number): string {
  if (!Number.isFinite(value)) return '—'
  const abs = Math.abs(value)
  const options: Intl.NumberFormatOptions = abs >= 1
    ? { maximumFractionDigits: 2, minimumFractionDigits: 2 }
    : { maximumFractionDigits: 6, minimumFractionDigits: 2 }
  return `$${value.toLocaleString(undefined, options)}`
}

function formatChange(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—'
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

function buildViewModel(coins: TopCoin[]): PriceTickerViewModel {
  return {
    coins: coins.map((coin) => ({
      id: coin.id,
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
      price: coin.price_usd,
      priceFormatted: formatPrice(coin.price_usd),
      change24h: coin.change_24h ?? null,
      changeFormatted: formatChange(coin.change_24h),
      isPositive: (coin.change_24h ?? 0) >= 0,
    })),
    fetchedAt: new Date().toISOString(),
  }
}

export function usePriceTicker(
  options: UsePriceTickerOptions = {}
): WorkspaceHookResult<PriceTickerViewModel> & { lastUpdated: string | null } {
  const { limit, auto, refreshInterval } = { ...DEFAULT_OPTIONS, ...options }
  const [data, setData] = useState<PriceTickerViewModel | null>(null)
  const [status, setStatus] = useState<WorkspaceRequestStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [isFetching, setIsFetching] = useState(false)
  const lastUpdatedRef = useRef<string | null>(null)
  const requestIdRef = useRef(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const reset = useCallback(() => {
    setData(null)
    setStatus('idle')
    setError(null)
    setIsFetching(false)
    lastUpdatedRef.current = null
  }, [])

  const refresh = useCallback(async () => {
    const requestId = ++requestIdRef.current
    setIsFetching(true)
    setStatus((prev) => (prev === 'success' ? 'loading' : 'loading'))
    setError(null)

    try {
      const coins = await getTopPrices(limit)
      if (requestId !== requestIdRef.current) return

      if (!coins || coins.length === 0) {
        throw new Error('No price data available')
      }

      const viewModel = buildViewModel(coins)
      setData(viewModel)
      lastUpdatedRef.current = viewModel.fetchedAt
      setStatus('success')
      setError(null)
    } catch (err: any) {
      if (requestId !== requestIdRef.current) return
      const message = err?.message || 'Failed to load prices'
      setError(message)
      setStatus('error')
    } finally {
      if (requestId === requestIdRef.current) {
        setIsFetching(false)
      }
    }
  }, [limit])

  // Initial fetch and auto-refresh
  useEffect(() => {
    if (!auto) return

    refresh().catch(() => {})

    // Set up auto-refresh interval
    if (refreshInterval > 0) {
      intervalRef.current = setInterval(() => {
        refresh().catch(() => {})
      }, refreshInterval)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [auto, refresh, refreshInterval])

  const result = useMemo<WorkspaceHookResult<PriceTickerViewModel>>(
    () => ({ data, status, error, isFetching, refresh, reset }),
    [data, status, error, isFetching, refresh, reset]
  )

  return { ...result, lastUpdated: lastUpdatedRef.current }
}
