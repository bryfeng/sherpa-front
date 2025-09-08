import axios from 'axios'
import type { ChatRequest, ChatResponse } from '../types/chat'
import type { PortfolioAPIResponse } from '../types/portfolio'

const BASE = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000'

export const api = {
  async health() {
    const { data } = await axios.get(`${BASE}/healthz`)
    return data
  },

  async chat(payload: ChatRequest): Promise<ChatResponse> {
    const { data } = await axios.post(`${BASE}/chat`, payload)
    return data
  },

  async portfolio(address: string, chain = 'ethereum'): Promise<PortfolioAPIResponse> {
    const { data } = await axios.get(`${BASE}/tools/portfolio`, {
      params: { address, chain },
    })
    return data
  },
}
