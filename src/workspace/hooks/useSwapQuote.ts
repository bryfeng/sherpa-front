import { useCallback, useEffect, useRef, useState } from 'react'
import { getSwapQuote, type SwapQuoteReq, type SwapQuoteRes } from '../../services/quotes'
import type { WorkspaceHookResult, WorkspaceRequestStatus } from '../types'

interface UseSwapQuoteOptions {
  /** Debounce delay in ms before fetching quote */
  debounceMs?: number
}

export interface SwapQuoteViewModel {
  fromToken: string
  toToken: string
  amountIn: number
  amountOut: number
  amountInFormatted: string
  amountOutFormatted: string
  priceInUsd: number
  priceOutUsd: number
  valueInUsd: string
  valueOutUsd: string
  rate: number
  rateFormatted: string
  feeEstimate: number
  feeFormatted: string
  slippageBps: number
  slippageFormatted: string
  sources: string[]
  warnings: string[]
  hasRoute: boolean
  txReady: boolean
  expiresAt: Date | null
}

const DEFAULT_OPTIONS: Required<UseSwapQuoteOptions> = {
  debounceMs: 500,
}

function formatTokenAmount(value: number, decimals = 6): string {
  if (!Number.isFinite(value)) return '0'
  if (value === 0) return '0'
  if (value < 0.000001) return '<0.000001'
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: decimals,
  })
}

function formatUsd(value: number): string {
  if (!Number.isFinite(value)) return '$0.00'
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function buildViewModel(quote: SwapQuoteRes): SwapQuoteViewModel {
  const rate = quote.amount_out_est / quote.amount_in
  const valueIn = quote.amount_in * quote.price_in_usd
  const valueOut = quote.amount_out_est * quote.price_out_usd

  return {
    fromToken: quote.from_token,
    toToken: quote.to_token,
    amountIn: quote.amount_in,
    amountOut: quote.amount_out_est,
    amountInFormatted: formatTokenAmount(quote.amount_in),
    amountOutFormatted: formatTokenAmount(quote.amount_out_est),
    priceInUsd: quote.price_in_usd,
    priceOutUsd: quote.price_out_usd,
    valueInUsd: formatUsd(valueIn),
    valueOutUsd: formatUsd(valueOut),
    rate,
    rateFormatted: `1 ${quote.from_token} = ${formatTokenAmount(rate)} ${quote.to_token}`,
    feeEstimate: quote.fee_est,
    feeFormatted: formatUsd(quote.fee_est),
    slippageBps: quote.slippage_bps,
    slippageFormatted: `${(quote.slippage_bps / 100).toFixed(2)}%`,
    sources: quote.sources.map((s) => (typeof s === 'string' ? s : s.name || 'Unknown')),
    warnings: quote.warnings || [],
    hasRoute: Boolean(quote.route && Object.keys(quote.route).length > 0),
    txReady: Boolean(quote.route?.tx_ready),
    expiresAt: quote.route?.expires_at
      ? new Date(typeof quote.route.expires_at === 'number' ? quote.route.expires_at * 1000 : quote.route.expires_at)
      : null,
  }
}

export function useSwapQuote(
  options: UseSwapQuoteOptions = {}
): WorkspaceHookResult<SwapQuoteViewModel> & {
  fetchQuote: (params: SwapQuoteReq) => Promise<void>
  lastRequest: SwapQuoteReq | null
} {
  const { debounceMs } = { ...DEFAULT_OPTIONS, ...options }

  const [data, setData] = useState<SwapQuoteViewModel | null>(null)
  const [status, setStatus] = useState<WorkspaceRequestStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [isFetching, setIsFetching] = useState(false)
  const [lastRequest, setLastRequest] = useState<SwapQuoteReq | null>(null)

  const requestIdRef = useRef(0)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const reset = useCallback(() => {
    setData(null)
    setStatus('idle')
    setError(null)
    setIsFetching(false)
    setLastRequest(null)
  }, [])

  const fetchQuote = useCallback(async (params: SwapQuoteReq) => {
    // Clear previous debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Validate inputs
    if (!params.token_in || !params.token_out || !params.amount_in || params.amount_in <= 0) {
      setData(null)
      setStatus('idle')
      return
    }

    setLastRequest(params)
    setIsFetching(true)

    // Debounce the actual API call
    debounceTimerRef.current = setTimeout(async () => {
      const requestId = ++requestIdRef.current
      setStatus('loading')
      setError(null)

      try {
        const quote = await getSwapQuote(params)

        if (requestId !== requestIdRef.current) return

        if (!quote || !quote.success) {
          throw new Error('Failed to get swap quote')
        }

        const viewModel = buildViewModel(quote)
        setData(viewModel)
        setStatus('success')
        setError(null)
      } catch (err: any) {
        if (requestId !== requestIdRef.current) return
        const message = err?.message || 'Failed to get quote'
        setError(message)
        setStatus('error')
        setData(null)
      } finally {
        if (requestId === requestIdRef.current) {
          setIsFetching(false)
        }
      }
    }, debounceMs)
  }, [debounceMs])

  const refresh = useCallback(async () => {
    if (lastRequest) {
      await fetchQuote(lastRequest)
    }
  }, [lastRequest, fetchQuote])

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  return {
    data,
    status,
    error,
    isFetching,
    refresh,
    reset,
    fetchQuote,
    lastRequest,
  }
}

// Common token list for quick selection
export const COMMON_TOKENS = [
  { symbol: 'ETH', name: 'Ethereum', address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' },
  { symbol: 'USDC', name: 'USD Coin', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' },
  { symbol: 'USDT', name: 'Tether', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7' },
  { symbol: 'WBTC', name: 'Wrapped Bitcoin', address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599' },
  { symbol: 'DAI', name: 'Dai', address: '0x6B175474E89094C44Da98b954EesaDfF9B63B2C5e' },
  { symbol: 'WETH', name: 'Wrapped Ether', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' },
  { symbol: 'UNI', name: 'Uniswap', address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984' },
  { symbol: 'LINK', name: 'Chainlink', address: '0x514910771AF9Ca656af840dff83E8264EcF986CA' },
] as const

export type CommonToken = typeof COMMON_TOKENS[number]
