import axios from 'axios'

const BASE = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000'

export type TrendingToken = {
  id: string
  symbol: string
  name: string
  price_usd: number | null
  change_1h?: number | null
  change_24h?: number | null
  volume_24h?: number | null
  market_cap?: number | null
  platform?: string | null
  contract_address?: string | null
  chain_id?: number | null
}

export async function getTrendingTokens(limit: number = 10): Promise<TrendingToken[]> {
  try {
    const { data } = await axios.get(`${BASE}/tools/prices/trending`, { params: { limit } })
    if (!data?.success || !Array.isArray(data.tokens)) return []
    return data.tokens as TrendingToken[]
  } catch {
    return []
  }
}

