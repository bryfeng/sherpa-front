import axios from 'axios'

const BASE = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000'

export type RelayQuoteResponse = {
  success: boolean
  quote: any
}

export async function getRelayQuote(payload: Record<string, any>): Promise<any | null> {
  try {
    const { data } = await axios.post<RelayQuoteResponse>(`${BASE}/tools/relay/quote`, payload)
    return data?.quote ?? null
  } catch (error) {
    console.error('Relay quote failed', error)
    return null
  }
}

export async function getRelaySignature(requestId: string): Promise<any | null> {
  if (!requestId) return null
  try {
    const { data } = await axios.get(`${BASE}/tools/relay/requests/${requestId}/signature`)
    return data?.signature ?? null
  } catch (error) {
    console.error('Relay signature fetch failed', error)
    return null
  }
}
