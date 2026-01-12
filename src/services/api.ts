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

  /**
   * Get a swap quote from Relay
   * @param amount_in - Amount in token units (use this OR amount_usd)
   * @param amount_usd - Amount in USD to spend (converts to token amount automatically)
   */
  async swapQuote(params: {
    token_in: string
    token_out: string
    amount_in?: number
    amount_usd?: number
    chain?: string
    slippage_bps?: number
    wallet_address: string
  }): Promise<SwapQuoteResponse> {
    const { data } = await axios.post(`${BASE}/swap/quote`, params)
    return data as SwapQuoteResponse
  },

  /**
   * Get a bridge quote from Relay
   */
  async bridgeQuote(params: {
    user: string
    originChainId: number
    destinationChainId: number
    originCurrency: string
    destinationCurrency: string
    recipient: string
    amount: string
    tradeType?: string
    slippageTolerance?: string
  }): Promise<RelayQuoteResponse> {
    const { data } = await axios.post(`${BASE}/tools/relay/quote`, {
      ...params,
      tradeType: params.tradeType || 'EXACT_INPUT',
      referrer: 'sherpa.chat',
      useExternalLiquidity: true,
      useDepositAddress: false,
      topupGas: false,
    })
    return data as RelayQuoteResponse
  },
}

// ============================================
// TYPES
// ============================================

export interface SwapQuoteResponse {
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
    kind: string
    request_id?: string
    steps?: any[]
    transactions?: any[]
    tx_ready?: boolean
    primary_tx?: TransactionData
    tx?: TransactionData
  }
  sources: Array<{ name: string; logo?: string }>
  warnings: string[]
}

export interface TransactionData {
  to: string
  data: string
  value?: string
  chainId?: number
  gasLimit?: string
}

export interface RelayQuoteResponse {
  success: boolean
  quote: {
    steps?: Array<{
      id: string
      action: string
      items?: Array<{
        data?: TransactionData
      }>
    }>
    details?: {
      currencyIn?: any
      currencyOut?: any
    }
    fees?: any
    requestId?: string
  }
}
