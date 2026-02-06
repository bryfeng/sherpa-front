/**
 * Hook for fetching portfolio data across multiple chains based on user preferences.
 * Aggregates positions from all enabled chains into a unified view.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../../services/api'
import { useUserPreferences } from '../../hooks/useUserPreferences'
import type { PortfolioAPIResponse, PortfolioData, TokenHolding } from '../../types/portfolio'
import type { PortfolioPositionViewModel, PortfolioSummaryViewModel, WorkspaceHookResult, WorkspaceRequestStatus } from '../types'

interface UseMultiChainPortfolioOptions {
  walletAddress?: string
  auto?: boolean
}

function toNumber(value: number | string | undefined | null): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return 0
}

// Normalize chain names to canonical display names
// Maps various API/config names to consistent display names
const CHAIN_NAME_MAP: Record<string, string> = {
  eth: 'Ethereum',
  ethereum: 'Ethereum',
  mainnet: 'Ethereum',
  sol: 'Solana',
  solana: 'Solana',
  polygon: 'Polygon',
  matic: 'Polygon',
  arb: 'Arbitrum',
  arbitrum: 'Arbitrum',
  'arbitrum-one': 'Arbitrum',
  op: 'Optimism',
  optimism: 'Optimism',
  base: 'Base',
  avax: 'Avalanche',
  avalanche: 'Avalanche',
  bsc: 'BNB Chain',
  binance: 'BNB Chain',
  'bnb-chain': 'BNB Chain',
  fantom: 'Fantom',
  ftm: 'Fantom',
  gnosis: 'Gnosis',
  xdai: 'Gnosis',
  celo: 'Celo',
  moonbeam: 'Moonbeam',
  moonriver: 'Moonriver',
  zksync: 'zkSync',
  'zksync-era': 'zkSync',
  linea: 'Linea',
  scroll: 'Scroll',
  blast: 'Blast',
}

function normalizeChainName(chain: string): string {
  const key = chain.toLowerCase().trim()
  return CHAIN_NAME_MAP[key] || chain.charAt(0).toUpperCase() + chain.slice(1).toLowerCase()
}

// Deduplicate chains by their normalized name, keeping the first occurrence
// This prevents fetching the same chain twice if user has both "eth" and "ethereum" enabled
function deduplicateChains(chains: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const chain of chains) {
    const normalized = normalizeChainName(chain)
    if (!seen.has(normalized)) {
      seen.add(normalized)
      result.push(chain)
    }
  }
  return result
}

function formatUsd(value: number): string {
  if (!Number.isFinite(value)) return '—'
  const abs = Math.abs(value)
  const options: Intl.NumberFormatOptions = abs >= 1
    ? { maximumFractionDigits: 2, minimumFractionDigits: 2 }
    : { maximumFractionDigits: 4, minimumFractionDigits: 2 }
  return `$${value.toLocaleString(undefined, options)}`
}

function normaliseHolding(entry: TokenHolding, totalUsd: number, network: string): PortfolioPositionViewModel {
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
    network,
  }
}

interface ChainPortfolioResult {
  chain: string
  portfolio: PortfolioData
  sources?: PortfolioAPIResponse['sources']
}

function mergePortfolios(results: ChainPortfolioResult[]): PortfolioSummaryViewModel {
  // Calculate total USD across all chains
  let totalUsd = 0
  const allPositions: PortfolioPositionViewModel[] = []
  const allSources: PortfolioAPIResponse['sources'] = []

  for (const result of results) {
    totalUsd += toNumber(result.portfolio.total_value_usd)
  }

  // Now normalize all holdings with the combined total for accurate allocation percentages
  for (const result of results) {
    const safeTokens = Array.isArray(result.portfolio.tokens) ? result.portfolio.tokens : []
    const network = normalizeChainName(result.chain)

    for (const token of safeTokens) {
      allPositions.push(normaliseHolding(token, totalUsd, network))
    }

    if (Array.isArray(result.sources)) {
      allSources.push(...result.sources)
    }
  }

  // Sort by USD value descending
  allPositions.sort((a, b) => b.usd - a.usd)

  const fetchedAt = new Date().toISOString()

  return {
    totalUsd,
    totalUsdFormatted: formatUsd(totalUsd),
    tokenCount: allPositions.length,
    address: results[0]?.portfolio.address || '',
    fetchedAt,
    positions: allPositions.slice(0, 6),
    allPositions,
    topPositions: allPositions.slice(0, 3),
    sources: allSources.length > 0 ? allSources : undefined,
    raw: results[0]?.portfolio,
  }
}

export function useMultiChainPortfolio(options: UseMultiChainPortfolioOptions = {}): WorkspaceHookResult<PortfolioSummaryViewModel> & {
  lastUpdated: string | null
  enabledChains: string[]
} {
  const { walletAddress, auto = true } = options
  const { enabledChains, isLoading: prefsLoading } = useUserPreferences(walletAddress ?? null)

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
    if (!walletAddress || enabledChains.length === 0) {
      reset()
      return
    }

    const requestId = ++requestIdRef.current
    setIsFetching(true)
    setStatus((prev) => (prev === 'success' ? 'loading' : 'loading'))
    setError(null)

    try {
      // Deduplicate chains to avoid fetching the same chain twice (e.g., "eth" and "ethereum")
      const uniqueChains = deduplicateChains(enabledChains)

      // Fetch portfolio data for all enabled chains in parallel
      const fetchPromises = uniqueChains.map(async (chain): Promise<ChainPortfolioResult | null> => {
        try {
          const response = await api.portfolio(walletAddress, chain)
          if (!response?.success || !response.portfolio) {
            return null
          }
          return {
            chain,
            portfolio: response.portfolio,
            sources: response.sources,
          }
        } catch {
          // Individual chain failures shouldn't break the whole fetch
          return null
        }
      })

      const results = await Promise.all(fetchPromises)
      if (requestId !== requestIdRef.current) return

      // Filter out failed fetches
      const successfulResults = results.filter((r): r is ChainPortfolioResult => r !== null)

      if (successfulResults.length === 0) {
        throw new Error('Failed to fetch portfolio from any chain.')
      }

      // Merge all chain portfolios into one
      const summary = mergePortfolios(successfulResults)
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
  }, [walletAddress, enabledChains, reset])

  // Trigger fetch when wallet or enabled chains change
  useEffect(() => {
    if (!walletAddress) {
      reset()
      return
    }
    if (prefsLoading) return // Wait for preferences to load
    if (!auto) return
    refresh().catch(() => {})
  }, [walletAddress, enabledChains, prefsLoading, auto, refresh, reset])

  const result = useMemo<WorkspaceHookResult<PortfolioSummaryViewModel>>(
    () => ({ data, status, error, isFetching, refresh, reset }),
    [data, status, error, isFetching, refresh, reset],
  )

  return { ...result, lastUpdated: lastUpdatedRef.current, enabledChains }
}

export type { PortfolioSummaryViewModel } from '../types'
