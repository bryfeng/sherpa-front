import axios from 'axios'

const BASE = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000'

export type PolyMarket = { id: string; question: string; yesPrice: number; noPrice: number; url: string }

export async function getPolymarketMarkets(query = '', limit = 5): Promise<PolyMarket[]> {
  const { data } = await axios.get(`${BASE}/tools/polymarket/markets`, { params: { query, limit } })
  return data?.markets || []
}

