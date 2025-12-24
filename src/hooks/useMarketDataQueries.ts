import { useQuery } from '@tanstack/react-query'
import { getTopPrices, getTokenChart, type TopCoin, type TokenChartResponse, type TokenChartParams } from '../services/prices'
import { getTrendingTokens, type TrendingToken } from '../services/trending'

// Query keys for cache management
export const marketDataKeys = {
  all: ['marketData'] as const,
  topPrices: (limit: number) => [...marketDataKeys.all, 'topPrices', limit] as const,
  trending: (limit: number) => [...marketDataKeys.all, 'trending', limit] as const,
  tokenChart: (params: TokenChartParams) => [...marketDataKeys.all, 'tokenChart', params] as const,
}

export interface UseTopPricesOptions {
  limit?: number
  enabled?: boolean
}

/**
 * Hook to fetch top cryptocurrency prices with automatic caching and refetching
 */
export function useTopPrices({ limit = 5, enabled = true }: UseTopPricesOptions = {}) {
  return useQuery<TopCoin[]>({
    queryKey: marketDataKeys.topPrices(limit),
    queryFn: () => getTopPrices(limit),
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 60 * 1000, // Auto-refresh every minute
    enabled,
  })
}

export interface UseTrendingTokensOptions {
  limit?: number
  enabled?: boolean
}

/**
 * Hook to fetch trending tokens with automatic caching and refetching
 */
export function useTrendingTokens({ limit = 10, enabled = true }: UseTrendingTokensOptions = {}) {
  return useQuery<TrendingToken[]>({
    queryKey: marketDataKeys.trending(limit),
    queryFn: () => getTrendingTokens(limit),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: 2 * 60 * 1000, // Auto-refresh every 2 minutes
    enabled,
  })
}

export interface UseTokenChartOptions extends TokenChartParams {
  enabled?: boolean
}

/**
 * Hook to fetch token chart data with automatic caching
 */
export function useTokenChart({ enabled = true, ...params }: UseTokenChartOptions) {
  const hasIdentifier = Boolean(params.coinId || params.address || params.symbol)

  return useQuery<TokenChartResponse | null>({
    queryKey: marketDataKeys.tokenChart(params),
    queryFn: () => getTokenChart(params),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    enabled: enabled && hasIdentifier,
  })
}
