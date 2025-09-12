import axios from 'axios'

const BASE = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000'

export type SwapQuoteReq = {
  token_in: string
  token_out: string
  amount_in: number
  chain?: string
  slippage_bps?: number
}

export type SwapQuoteRes = {
  success: boolean
  from_token: string
  to_token: string
  amount_in: number
  amount_out_est: number
  price_in_usd: number
  price_out_usd: number
  fee_est: number
  slippage_bps: number
  route: { kind?: string; note?: string }
  sources: Array<{ name?: string; url?: string } | string>
  warnings: string[]
}

export async function getSwapQuote(payload: SwapQuoteReq): Promise<SwapQuoteRes | null> {
  try {
    const { data } = await axios.post(`${BASE}/swap/quote`, payload)
    return data as SwapQuoteRes
  } catch {
    return null
  }
}

