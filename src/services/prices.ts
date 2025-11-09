import axios from 'axios'

const BASE = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000'

export type TopCoin = {
  id: string
  symbol: string
  name: string
  price_usd: number
  change_24h?: number
  market_cap?: number
}

export async function getTopPrices(limit: number = 5): Promise<TopCoin[]> {
  try {
    const { data } = await axios.get(`${BASE}/tools/prices/top`, { params: { limit, exclude_stable: true } })
    const arr = Array.isArray(data?.coins) ? data.coins : []
    return arr as TopCoin[]
  } catch {
    return []
  }
}

export type TokenChartPoint = {
  time: number
  price: number
}

export type TokenChartSeries = {
  prices: TokenChartPoint[]
  market_caps: { time: number; market_cap: number }[]
  total_volumes: { time: number; volume: number }[]
}

export type TokenCandle = {
  time: number
  open: number
  high: number
  low: number
  close: number
}

export type TokenChartMetadata = {
  symbol?: string | null
  name?: string | null
  image?: string | null
  contract_address?: string | null
  chain?: string | null
  decimals?: number | null
  platforms?: Record<string, string>
  market_cap_rank?: number | null
}

export type TokenChartStats = {
  open?: number
  close?: number
  latest?: number
  change_abs?: number
  change_pct?: number
  high?: number
  high_time?: number
  low?: number
  low_time?: number
  samples?: number
  range_start?: number
  range_end?: number
}

export type TokenChartResponse = {
  success: boolean
  metadata: TokenChartMetadata
  coin_id: string
  range: string
  vs_currency: string
  series: TokenChartSeries
  candles: TokenCandle[]
  stats: TokenChartStats
  sources?: Array<{ label?: string; href?: string }>
  interval?: string | null
  cached?: boolean
}

export type TokenChartParams = {
  coinId?: string
  symbol?: string
  address?: string
  chain?: string
  range?: '1d' | '7d' | '30d' | '90d' | '180d' | '365d' | 'max'
  vsCurrency?: string
  includeCandles?: boolean
}

export async function getTokenChart(params: TokenChartParams): Promise<TokenChartResponse | null> {
  const {
    coinId,
    address,
    symbol,
    chain = 'ethereum',
    range = '7d',
    vsCurrency = 'usd',
    includeCandles = true,
  } = params

  if (!coinId && !address && !symbol) return null

  try {
    const { data } = await axios.get<TokenChartResponse>(`${BASE}/tools/prices/token/chart`, {
      params: {
        coin_id: coinId,
        symbol,
        address,
        chain,
        range,
        vs_currency: vsCurrency,
        include_candles: includeCandles,
      },
    })
    if (!data?.success) return null
    return data
  } catch (error) {
    console.warn('Failed to fetch token chart', error)
    return null
  }
}
