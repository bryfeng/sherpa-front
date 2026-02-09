import type { PersonaId as Persona } from './persona'

// ============================================
// INLINE COMPONENTS (Perplexity-style)
// ============================================

export type InlineComponentKind =
  | 'portfolio-card'
  | 'swap-form'
  | 'price-chart'
  | 'token-list'
  | 'action-card'
  | 'relay-quote'

export type InlineComponentVariant = 'compact' | 'standard' | 'expanded'

export interface InlineComponent {
  id: string
  kind: InlineComponentKind
  payload: Record<string, any>
  variant?: InlineComponentVariant
  title?: string
  createdAt: number
}

// ============================================
// ACTIONS
// ============================================

export type ActionType = 'show_panel' | 'swap' | 'bridge' | 'explain' | 'subscribe' | 'simulate'

export type AgentAction = {
  id: string
  label: string
  type: ActionType
  params?: Record<string, any>
  gated?: 'pro' | 'token'
}

export type PanelSource = {
  id?: string
  name?: string
  title?: string
  url?: string
  href?: string
  description?: string
}

export type Panel = {
  id: string
  kind: 'chart' | 'table' | 'card' | 'portfolio' | 'prediction' | 'prices' | 'trending'
  title: string
  payload?: any
  sources?: PanelSource[]
  metadata?: Record<string, any>
}

export type AgentMessage = {
  id: string
  role: 'assistant' | 'user'
  text: string
  actions?: AgentAction[]
  panels?: string[]
  components?: InlineComponent[]  // Inline rich components
  sources?: any[]
  typing?: boolean      // Waiting for response (shows loading indicator)
  streaming?: boolean   // Actively receiving streamed content
  persona?: Persona
}
