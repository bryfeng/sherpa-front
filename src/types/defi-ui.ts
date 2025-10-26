import type { PersonaId as Persona } from './persona'

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
  sources?: any[]
  typing?: boolean
  persona?: Persona
}
