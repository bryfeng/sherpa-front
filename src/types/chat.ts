export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  persona?: string
  style?: string
  timestamp: string
  panels?: Record<string, any>
  sources?: string[]
  processing_time?: number
}

export interface ChatRequest {
  messages: Array<{ role: string; content: string }>
  address?: string
  chain?: string
  conversation_id?: string
  llm_provider?: string
  llm_model?: string
}

export interface ChatResponse {
  reply: string
  panels: Record<string, any>
  sources: any[]
  conversation_id?: string
}
