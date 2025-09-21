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

  async listConversations(address: string) {
    const { data } = await axios.get(`${BASE}/conversations`, { params: { address } })
    return data as Array<{ conversation_id: string; title?: string | null; last_activity: string; message_count: number; archived: boolean }>
  },

  async createConversation(address: string, title?: string) {
    const { data } = await axios.post(`${BASE}/conversations`, { address, title })
    return data as { conversation_id: string; title?: string | null }
  },

  async updateConversation(conversation_id: string, payload: { title?: string; archived?: boolean }) {
    const { data } = await axios.patch(`${BASE}/conversations/${conversation_id}`, payload)
    return data as { conversation_id: string; title?: string | null; last_activity: string; message_count: number; archived: boolean }
  },

  async getConversation(conversation_id: string) {
    const { data } = await axios.get(`${BASE}/conversations/${conversation_id}`)
    return data as {
      conversation_id: string
      owner_address?: string | null
      title?: string | null
      archived: boolean
      created_at: string
      last_activity: string
      total_tokens: number
      message_count: number
      compressed_history?: string | null
      episodic_focus?: Record<string, any> | null
      portfolio_context?: Record<string, any> | null
      messages: Array<{ id: string; role: string; content: string; timestamp: string; metadata?: any; tokens?: number | null }>
    }
  },
}
