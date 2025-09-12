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

