import axios from 'axios'

const BASE = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000'

export type BungeeQuote = {
  quote: any
}

export async function getBungeeQuote(params: {
  fromChainId: number
  toChainId: number
  fromTokenAddress: string
  toTokenAddress: string
  amount: string
  userAddress?: string
  slippage?: number
}): Promise<any | null> {
  try {
    const { data } = await axios.get(`${BASE}/tools/bungee/quote`, { params })
    return data?.quote ?? null
  } catch {
    return null
  }
}

