export type PersonaId = 'friendly' | 'technical' | 'professional' | 'educational'

export interface Persona {
  id: PersonaId
  name: string
  display_name: string
  description: string
  icon: string
  color: string
  tone: string
  technical_depth: string
  use_emojis: boolean
}

export const personas: Persona[] = [
  {
    id: 'friendly',
    name: 'friendly',
    display_name: 'Friendly Crypto Guide',
    description: 'Approachable and encouraging crypto assistant',
    icon: '🌟',
    color: 'emerald',
    tone: 'warm and conversational',
    technical_depth: 'medium',
    use_emojis: true,
  },
  {
    id: 'technical',
    name: 'technical',
    display_name: 'Technical DeFi Analyst',
    description: 'Deep technical analysis and protocol insights',
    icon: '🔬',
    color: 'violet',
    tone: 'analytical and precise',
    technical_depth: 'high',
    use_emojis: false,
  },
  {
    id: 'professional',
    name: 'professional',
    display_name: 'Professional Portfolio Advisor',
    description: 'Formal financial guidance and risk management',
    icon: '💼',
    color: 'slate',
    tone: 'professional and authoritative',
    technical_depth: 'medium-high',
    use_emojis: false,
  },
  {
    id: 'educational',
    name: 'educational',
    display_name: 'Educational Crypto Teacher',
    description: 'Patient, step-by-step explanations',
    icon: '🎓',
    color: 'amber',
    tone: 'patient and encouraging',
    technical_depth: 'adaptive',
    use_emojis: true,
  },
]

