import axios from 'axios'
import type {
  PolymarketMarket,
  PolymarketMarketDetail,
  PolymarketAnalysis,
  PolymarketLeaderboardEntry,
  PolymarketPortfolio,
} from '../types/polymarket'

const BASE = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000'

export async function getPolymarketMarkets(
  params: { query?: string; category?: string; limit?: number } = {}
): Promise<PolymarketMarket[]> {
  const { data } = await axios.get(`${BASE}/polymarket/markets`, { params })
  return data ?? []
}

export async function getTrendingMarkets(limit = 20): Promise<PolymarketMarket[]> {
  const { data } = await axios.get(`${BASE}/polymarket/trending`, { params: { limit } })
  return data ?? []
}

export async function getClosingSoonMarkets(hours = 24, limit = 20): Promise<PolymarketMarket[]> {
  const { data } = await axios.get(`${BASE}/polymarket/closing-soon`, { params: { hours, limit } })
  return data ?? []
}

export async function getPolymarketMarketDetail(marketId: string): Promise<PolymarketMarketDetail> {
  const { data } = await axios.get(`${BASE}/polymarket/markets/${marketId}`)
  return data
}

export async function analyzeMarket(marketId: string): Promise<PolymarketAnalysis> {
  const { data } = await axios.get(`${BASE}/polymarket/analyze/${marketId}`)
  return data
}

export async function getPolymarketLeaderboard(
  params: { sortBy?: string; limit?: number; minTrades?: number } = {}
): Promise<PolymarketLeaderboardEntry[]> {
  const { sortBy = 'total_pnl', limit = 50, minTrades = 10 } = params
  const { data } = await axios.get(`${BASE}/polymarket/traders/leaderboard`, {
    params: { sort_by: sortBy, limit, minTrades },
  })
  return data ?? []
}

export async function getPolymarketPortfolio(address: string): Promise<PolymarketPortfolio> {
  const { data } = await axios.get(`${BASE}/polymarket/portfolio/${address}`)
  return data
}
