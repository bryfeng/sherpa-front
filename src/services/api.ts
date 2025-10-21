import axios from 'axios'
import type { ChatRequest, ChatResponse } from '../types/chat'
import type { EntitlementResponse } from '../types/entitlement'
import type { PortfolioAPIResponse } from '../types/portfolio'
import type { LLMProvidersResponse } from '../types/llm'

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

  async llmProviders(): Promise<LLMProvidersResponse> {
    const { data } = await axios.get(`${BASE}/llm/providers`)
    return data as LLMProvidersResponse
  },

  async chatStream(
    payload: ChatRequest,
    onDelta: (chunk: string) => void,
  ): Promise<ChatResponse | null> {
    const controller = new AbortController()
    let finalResponse: ChatResponse | null = null
    let done = false

    try {
      const response = await fetch(`${BASE}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })

      if (!response.ok || !response.body) {
        throw new Error(`Streaming request failed with status ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (!done) {
        const { value, done: readerDone } = await reader.read()
        if (readerDone) break
        buffer += decoder.decode(value, { stream: true })

        const parts = buffer.split('\n\n')
        buffer = parts.pop() ?? ''

        for (const part of parts) {
          if (!part.trim()) continue
          const lines = part.split('\n')
          let dataStr = ''
          for (const line of lines) {
            if (line.startsWith('data:')) {
              dataStr += line.slice(5).trim()
            }
          }

          if (!dataStr) continue
          if (dataStr === '[DONE]') {
            done = true
            break
          }

          let payloadJson: any
          try {
            payloadJson = JSON.parse(dataStr)
          } catch (error) {
            console.warn('Failed to parse streaming payload', error)
            continue
          }

          if (payloadJson?.type === 'delta') {
            if (typeof payloadJson.delta === 'string') {
              onDelta(payloadJson.delta)
            }
          } else if (payloadJson?.type === 'final') {
            if (payloadJson.response) {
              finalResponse = payloadJson.response as ChatResponse
            }
          } else if (payloadJson?.type === 'error') {
            throw new Error(payloadJson.message || 'Streaming error')
          }
        }
      }

      // Flush any remaining buffered data
      if (buffer.trim()) {
        try {
          const payloadJson = JSON.parse(buffer.replace(/^data:\s*/, ''))
          if (payloadJson?.type === 'final' && payloadJson.response) {
            finalResponse = payloadJson.response as ChatResponse
          }
        } catch {
          // ignore trailing buffer noise
        }
      }

      return finalResponse
    } finally {
      controller.abort()
    }
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

  async entitlement(address: string, chain?: string): Promise<EntitlementResponse> {
    const { data } = await axios.get(`${BASE}/entitlement`, {
      params: { address, chain },
    })
    return data as EntitlementResponse
  },
}
