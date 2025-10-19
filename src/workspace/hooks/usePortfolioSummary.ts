import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../../services/api'
import type { PortfolioAPIResponse, PortfolioData, TokenHolding } from '../../types/portfolio'
import type { PortfolioPositionViewModel, PortfolioSummaryViewModel, WorkspaceHookResult, WorkspaceRequestStatus } from '../types'

interface UsePortfolioSummaryOptions {
  walletAddress?: string
  chain?: string
  auto?: boolean
}

const DEFAULT_OPTIONS: Required<Pick<UsePortfolioSummaryOptions, 'chain' | 'auto'>> = {
  chain: 'ethereum',
  auto: true,
}

function toNumber(value: number | string | undefined | null): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return 0
}

function formatUsd(value: number): string {
  if (!Number.isFinite(value)) return '—'
  const abs = Math.abs(value)
  const options: Intl.NumberFormatOptions = abs >= 1
    ? { maximumFractionDigits: 2, minimumFractionDigits: 2 }
    : { maximumFractionDigits: 4, minimumFractionDigits: 2 }
  return `$${value.toLocaleString(undefined, options)}`
}

function normaliseHolding(entry: TokenHolding, totalUsd: number): PortfolioPositionViewModel {
  const usd = toNumber(entry.value_usd)
  const allocationPercent = totalUsd > 0 ? (usd / totalUsd) * 100 : 0
  return {
    symbol: entry.symbol || entry.name || 'TOK',
    sym: entry.symbol || entry.name || 'TOK',
    name: entry.name || entry.symbol || 'Token',
    usd,
    usdFormatted: formatUsd(usd),
    allocationPercent,
    balanceFormatted: entry.balance_formatted,
    address: entry.address,
  }
}

function buildSummary(portfolio: PortfolioData, sources: PortfolioAPIResponse['sources']): PortfolioSummaryViewModel {
  const totalUsd = toNumber(portfolio.total_value_usd)
  const safeTokens = Array.isArray(portfolio.tokens) ? portfolio.tokens : []
  const sorted = safeTokens
    .map((token) => normaliseHolding(token, totalUsd))
    .sort((a, b) => b.usd - a.usd)
  const fetchedAt = new Date().toISOString()

  return {
    totalUsd,
    totalUsdFormatted: formatUsd(totalUsd),
    tokenCount: portfolio.token_count ?? sorted.length,
    address: portfolio.address,
    fetchedAt,
    positions: sorted.slice(0, 6),
    allPositions: sorted,
    topPositions: sorted.slice(0, 3),
    sources: Array.isArray(sources) ? sources : undefined,
    raw: portfolio,
  }
}

export function usePortfolioSummary(options: UsePortfolioSummaryOptions = {}): WorkspaceHookResult<PortfolioSummaryViewModel> & {
  lastUpdated: string | null
} {
  const { walletAddress, chain, auto } = { ...DEFAULT_OPTIONS, ...options }
  const [data, setData] = useState<PortfolioSummaryViewModel | null>(null)
  const [status, setStatus] = useState<WorkspaceRequestStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [isFetching, setIsFetching] = useState(false)
  const lastUpdatedRef = useRef<string | null>(null)
  const requestIdRef = useRef(0)

  const reset = useCallback(() => {
    setData(null)
    setStatus('idle')
    setError(null)
    setIsFetching(false)
    lastUpdatedRef.current = null
  }, [])

  const refresh = useCallback(async () => {
    if (!walletAddress) {
      reset()
      return
    }

    const requestId = ++requestIdRef.current
    setIsFetching(true)
    setStatus((prev) => (prev === 'success' ? 'loading' : 'loading'))
    setError(null)

    try {
      const response = await api.portfolio(walletAddress, chain)
      if (!response?.success || !response.portfolio) {
        const message = response?.error || 'Portfolio data unavailable.'
        throw new Error(message)
      }
      if (requestId !== requestIdRef.current) return
      const summary = buildSummary(response.portfolio, response.sources)
      setData(summary)
      lastUpdatedRef.current = summary.fetchedAt
      setStatus('success')
      setError(null)
    } catch (err: any) {
      if (requestId !== requestIdRef.current) return
      const message = err?.message || 'Failed to load portfolio.'
      setError(message)
      setStatus('error')
    } finally {
      if (requestId === requestIdRef.current) {
        setIsFetching(false)
      }
    }
  }, [walletAddress, chain, reset])

  useEffect(() => {
    if (!walletAddress) {
      reset()
      return
    }
    if (!auto) return
    refresh().catch(() => {})
  }, [walletAddress, chain, auto, refresh, reset])

  const result = useMemo<WorkspaceHookResult<PortfolioSummaryViewModel>>(
    () => ({ data, status, error, isFetching, refresh, reset }),
    [data, status, error, isFetching, refresh, reset],
  )

  return { ...result, lastUpdated: lastUpdatedRef.current }
}

export type { PortfolioSummaryViewModel } from '../types'
