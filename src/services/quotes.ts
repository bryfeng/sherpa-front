import axios from 'axios'

const BASE = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000'

export type SwapQuoteReq = {
  token_in: string
  token_out: string
  amount_in: number
  chain?: string
  slippage_bps?: number
  wallet_address?: string | null
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
  route: {
    kind?: string
    request_id?: string
    steps?: Array<Record<string, any>>
    transactions?: Array<Record<string, any>>
    fees?: Record<string, any>
    details?: Record<string, any>
    expires_at?: string | number | null
    slippage_bps?: number
    relay_payload?: Record<string, any>
    tx_ready?: boolean
    primary_tx?: Record<string, any>
    [key: string]: any
  }
  sources: Array<{ name?: string; url?: string; [key: string]: any } | string>
  warnings: string[]
  wallet?: { address?: string | null; [key: string]: any }
  chain_id?: number
  quote_type?: string
}

export async function getSwapQuote(payload: SwapQuoteReq): Promise<SwapQuoteRes | null> {
  try {
    const { data } = await axios.post(`${BASE}/swap/quote`, payload)
    return data as SwapQuoteRes
  } catch {
    return null
  }
}
