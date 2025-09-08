import React, { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDown,
  Send,
  Bot,
  User,
  Sparkles,
  Settings,
  Wand2,
  Wallet,
  BarChart3,
  Repeat,
  ArrowLeftRight,
  BookOpen,
  Star,
} from 'lucide-react'

// Local, minimal UI primitives (Tailwind styled)
function Button({
  children,
  onClick,
  className = '',
  variant = 'default',
  size = 'md',
  type = 'button',
}: React.PropsWithChildren<{
  onClick?: () => void
  className?: string
  variant?: 'default' | 'outline' | 'secondary'
  size?: 'sm' | 'md'
  type?: 'button' | 'submit'
}>) {
  const base =
    'inline-flex items-center justify-center rounded-xl transition shadow-sm border'
  const variants: Record<string, string> = {
    default: 'bg-primary-600 border-primary-500 text-white hover:opacity-95',
    outline: 'bg-transparent border-slate-300 text-slate-700 hover:bg-slate-50',
    secondary: 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100',
  }
  const sizes: Record<string, string> = {
    sm: 'text-xs px-3 py-1.5',
    md: 'text-sm px-4 py-2',
  }
  return (
    <button type={type} onClick={onClick} className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}>
      {children}
    </button>
  )
}

function Card({ children, className = '' }: React.PropsWithChildren<{ className?: string }>) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-slate-50 ${className}`}>{children}</div>
  )
}

function CardHeader({ children, className = '' }: React.PropsWithChildren<{ className?: string }>) {
  return <div className={`p-4 border-b border-slate-200 ${className}`}>{children}</div>
}

function CardTitle({ children, className = '' }: React.PropsWithChildren<{ className?: string }>) {
  return <div className={`font-medium text-slate-900 ${className}`}>{children}</div>
}

function CardContent({ children, className = '' }: React.PropsWithChildren<{ className?: string }>) {
  return <div className={`p-4 ${className}`}>{children}</div>
}

function Textarea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { className?: string },
) {
  const { className = '', ...rest } = props
  return (
    <textarea
      {...rest}
      className={`min-h-[56px] w-full flex-1 rounded-2xl border border-slate-300 bg-slate-50 p-3 text-sm text-slate-900 placeholder:text-slate-500 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-200 ${className}`}
    />
  )
}

function Badge({ children, className = '', variant = 'solid' }: React.PropsWithChildren<{ className?: string; variant?: 'solid' | 'outline' | 'secondary' }>) {
  const variants: Record<string, string> = {
    solid: 'bg-primary-600 text-white border-primary-500',
    outline: 'bg-transparent text-slate-700 border-slate-300',
    secondary: 'bg-slate-100 text-slate-700 border-slate-200',
  }
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${variants[variant]} ${className}`}>{children}</span>
  )
}

// -----------------------
// Minimal types
// -----------------------
export type Persona = 'friendly' | 'technical' | 'advisor' | 'teacher'

type ActionType = 'show_panel' | 'swap' | 'bridge' | 'explain' | 'subscribe' | 'simulate'

export type AgentAction = {
  id: string
  label: string
  type: ActionType
  params?: Record<string, any>
  gated?: 'pro' | 'token'
}

export type Panel = {
  id: string
  kind: 'chart' | 'table' | 'card' | 'governance' | 'portfolio'
  title: string
  payload?: any
}

export type AgentMessage = {
  id: string
  role: 'assistant' | 'user'
  text: string
  actions?: AgentAction[]
  panels?: string[]
  sources?: string[]
}

// -----------------------
// Mock data helpers
// -----------------------
const seedPanels: Panel[] = [
  {
    id: 'uniswap_tvl_chart',
    kind: 'chart',
    title: 'Uniswap TVL (7d)',
    payload: { series: [12.1, 12.3, 12.7, 12.5, 12.9, 13.4, 13.6] },
  },
  {
    id: 'portfolio_overview',
    kind: 'portfolio',
    title: 'Your Portfolio Snapshot',
    payload: { totalUsd: 18423, positions: [{ sym: 'ETH', usd: 9200 }, { sym: 'UNI', usd: 3100 }, { sym: 'USDC', usd: 6123 }] },
  },
]

const seedIntro: AgentMessage[] = [
  {
    id: 'm1',
    role: 'assistant',
    text: 'Hey! I can analyze tokens, protocols, and your portfolio. What do you want to look at today?',
    actions: [
      { id: 'a1', label: 'Show my portfolio', type: 'show_panel', params: { panel_id: 'portfolio_overview' } },
      { id: 'a2', label: 'Uniswap this week', type: 'show_panel', params: { panel_id: 'uniswap_tvl_chart' } },
    ],
  },
]

function uid(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`
}

// Backend services
import { api } from '../services/api'
import { transformBackendPanels } from '../services/panels'

function PersonaBadge({ p }: { p: Persona }) {
  const map = {
    friendly: { label: 'Friendly', color: 'bg-emerald-100 text-emerald-700' },
    technical: { label: 'Technical', color: 'bg-sky-100 text-sky-700' },
    advisor: { label: 'Advisor', color: 'bg-fuchsia-100 text-fuchsia-700' },
    teacher: { label: 'Teacher', color: 'bg-amber-100 text-amber-700' },
  } as const
  return <Badge className={`rounded-full ${map[p].color}`}>{map[p].label}</Badge>
}

function MessageBubble({ m, onAction }: { m: AgentMessage; onAction: (a: AgentAction) => void }) {
  const isUser = m.role === 'user'
  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="h-8 w-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
          <Bot className="h-4 w-4 text-slate-700" />
        </div>
      )}
      <div className={`max-w-[72%] rounded-2xl p-4 shadow-sm ${isUser ? 'bg-primary-600 text-white' : 'bg-white border border-slate-200 text-slate-800'}`}>
        <div className="text-sm leading-relaxed whitespace-pre-wrap">{m.text}</div>
        {m.actions && m.actions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {m.actions.map((a) => (
              <Button key={a.id} size="sm" variant={isUser ? 'secondary' : 'default'} onClick={() => onAction(a)} className="rounded-full">
                {a.label}
              </Button>
            ))}
          </div>
        )}
        {m.sources && <div className="mt-2 text-xs text-slate-500">Sources: {m.sources.join(', ')}</div>}
      </div>
      {isUser && (
        <div className="h-8 w-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
          <User className="h-4 w-4 text-slate-700" />
        </div>
      )}
    </div>
  )
}

function RightPanel({ panels, highlight }: { panels: Panel[]; highlight?: string[] }) {
  const ordered = useMemo(() => {
    if (!highlight || highlight.length === 0) return panels
    const map = new Map(panels.map((p) => [p.id, p] as const))
    return [
      ...(highlight.map((id) => map.get(id)).filter(Boolean) as Panel[]),
      ...panels.filter((p) => !highlight.includes(p.id)),
    ]
  }, [panels, highlight])

  return (
    <div className="space-y-3">
      {ordered.map((p) => (
        <Card key={p.id} className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              {p.kind === 'chart' && <BarChart3 className="h-4 w-4" />}
              {p.kind === 'portfolio' && <Wallet className="h-4 w-4" />}
              {p.kind === 'governance' && <BookOpen className="h-4 w-4" />}
              {p.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {p.kind === 'chart' && (
              <div className="h-40 w-full rounded-xl bg-slate-50 border border-slate-200 flex items-end gap-1 p-3">
                {p.payload?.series?.map((v: number, i: number) => (
                  <div key={i} className="flex-1 bg-primary-600/80 rounded-t" style={{ height: `${(v / Math.max(...p.payload.series)) * 100}%` }} />
                ))}
              </div>
            )}
            {p.kind === 'portfolio' && (
              <div className="space-y-3 text-sm">
                <div className="font-semibold text-slate-900">Total: ${p.payload.totalUsd.toLocaleString()}</div>
                <div className="grid grid-cols-3 gap-3">
                  {p.payload.positions.map((pos: any) => (
                    <div key={pos.sym} className="rounded-xl border border-slate-200 bg-white p-3">
                      <div className="text-xs text-slate-700 tracking-wide">{pos.sym}</div>
                      <div className="text-sm font-semibold text-slate-900">${pos.usd.toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* governance panel de-scoped */}
            {p.kind === 'card' && <div className="text-sm text-slate-400">{JSON.stringify(p.payload)}</div>}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function PersonaDropdown({ persona, setPersona }: { persona: Persona; setPersona: (p: Persona) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <Button variant="outline" className="rounded-full" onClick={() => setOpen((v) => !v)}>
        <Sparkles className="h-4 w-4 mr-2" />Persona <ChevronDown className="h-4 w-4 ml-2" />
      </Button>
      {open && (
        <div className="absolute z-20 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
          <div className="px-2 py-1 text-xs text-slate-600">Choose persona</div>
          {(['friendly', 'technical', 'advisor', 'teacher'] as Persona[]).map((p) => (
            <button
              key={p}
              onClick={() => {
                setPersona(p)
                setOpen(false)
              }}
              className="w-full text-left px-2 py-2 rounded-lg hover:bg-slate-50 flex items-center gap-2"
            >
              <PersonaBadge p={p} /> <span className="capitalize">{p}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function DeFiChatAdaptiveUI({ persona, setPersona, walletAddress }: { persona: Persona; setPersona: (p: Persona) => void; walletAddress?: string }) {
  const [messages, setMessages] = useState<AgentMessage[]>(seedIntro)
  const [panels, setPanels] = useState<Panel[]>(seedPanels)
  const [highlight, setHighlight] = useState<string[] | undefined>(undefined)
  const [input, setInput] = useState('')
  const [pro, setPro] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Load TVL chart from backend DefiLlama tool (if available)
  useEffect(() => {
    import('../services/defi').then(({ getUniswapTVL }) =>
      getUniswapTVL('7d')
        .then((series) => {
          if (!series) return
          setPanels((prev) => prev.map((p) => (p.id === 'uniswap_tvl_chart' ? { ...p, payload: { series } } : p)))
        })
        .catch(() => {})
    )
  }, [])

  // Load portfolio panel when wallet address is available
  useEffect(() => {
    if (!walletAddress) return
    api
      .portfolio(walletAddress)
      .then((res) => {
        if (res.success && res.portfolio) {
          const data = res.portfolio
          const totalUsd = Number(data.total_value_usd || 0)
          const positions = (data.tokens || []).slice(0, 6).map((t: any) => ({ sym: t.symbol || t.name || 'TOK', usd: Number(t.value_usd || 0) }))
          const panel: Panel = { id: 'portfolio_overview', kind: 'portfolio', title: 'Your Portfolio Snapshot', payload: { totalUsd, positions } }
          setPanels((prev) => {
            const others = prev.filter((p) => p.id !== 'portfolio_overview')
            return [panel, ...others]
          })
        }
      })
      .catch(() => {})
  }, [walletAddress])

  const send = async () => {
    const q = input.trim()
    if (!q) return
    const userMsg: AgentMessage = { id: uid('msg'), role: 'user', text: q }
    setMessages((m) => [...m, userMsg])
    setInput('')
    try {
      const payload = {
        messages: [{ role: 'user', content: q }],
        address: walletAddress,
        chain: 'ethereum',
      }
      const res = await api.chat(payload)
      const newPanels = transformBackendPanels(res.panels)
      if (newPanels.length) {
        setPanels((prev) => mergePanelsLocal(prev, newPanels))
        setHighlight(newPanels.map((p) => p.id))
      }
      const assistantMsg: AgentMessage = { id: uid('msg'), role: 'assistant', text: res.reply || 'Done.', sources: (res.sources || []).map(String) }
      setMessages((m) => [...m, assistantMsg])
    } catch (e: any) {
      setMessages((m) => [...m, { id: uid('msg'), role: 'assistant', text: `Sorry, I hit an error contacting the API. ${e?.message || ''}` }])
    } finally {
      setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 0)
    }
  }

  function mergePanelsLocal(current: Panel[], incoming: Panel[]): Panel[] {
    const byId = new Map(current.map((p) => [p.id, p] as const))
    for (const p of incoming) byId.set(p.id, { ...(byId.get(p.id) || {} as any), ...p })
    return Array.from(byId.values())
  }

  const handleAction = (a: AgentAction) => {
    if (a.gated === 'pro' && !pro) {
      setMessages((m) => [
        ...m,
        {
          id: uid('msg'),
          role: 'assistant',
          text: 'This is a Pro feature. Subscribe to unlock deeper dives.',
          actions: [{ id: uid('act'), label: 'Subscribe Pro ($12/mo)', type: 'subscribe' }],
        },
      ])
      return
    }

    switch (a.type) {
      case 'show_panel': {
        setHighlight([a.params?.panel_id])
        setMessages((m) => [...m, { id: uid('msg'), role: 'assistant', text: `Opened panel: ${a.params?.panel_id}` }])
        break
      }
      case 'simulate': {
        const pct = a.params?.pct ?? 25
        setMessages((m) => [
          ...m,
          {
            id: uid('msg'),
            role: 'assistant',
            text: `Simulated swap: ${pct}% ETH → USDC. Est. fee $2.14. Proceed?`,
            actions: [
              { id: uid('act'), label: 'Proceed swap', type: 'swap', params: a.params },
              { id: uid('act'), label: 'Adjust amount', type: 'swap', params: a.params },
            ],
          },
        ])
        break
      }
      case 'swap': {
        setMessages((m) => [
          ...m,
          {
            id: uid('msg'),
            role: 'assistant',
            text: 'Swap flow opened. Connect your wallet to continue.',
            actions: [{ id: uid('act'), label: 'Connect Wallet', type: 'bridge' }],
          },
        ])
        break
      }
      case 'bridge': {
        setMessages((m) => [
          ...m,
          {
            id: uid('msg'),
            role: 'assistant',
            text: 'Bridge flow opened. Select networks and amount.',
            actions: [{ id: uid('act'), label: 'Start Bridge', type: 'bridge' }],
          },
        ])
        break
      }
      case 'explain': {
        setMessages((m) => [
          ...m,
          { id: uid('msg'), role: 'assistant', text: 'Here’s a concise explanation with pros/cons and a quick checklist…' },
        ])
        break
      }
      case 'subscribe': {
        setPro(true)
        setMessages((m) => [
          ...m,
          {
            id: uid('msg'),
            role: 'assistant',
            text: 'Pro activated. You now have access to deep dives and fee rebates.',
          },
        ])
        break
      }
    }

    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 0)
  }

  return (
    <div className="h-[calc(100vh-64px)] w-full grid grid-cols-12 gap-4 p-4">
      {/* Left rail */}
      <div className="col-span-2 hidden xl:flex flex-col gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Session</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <PersonaBadge p={persona} />
              <span className="text-xs text-slate-400">Current persona</span>
            </div>
            <PersonaDropdown persona={persona} setPersona={setPersona} />
            <Button variant="outline" className="w-full">
              <Settings className="h-4 w-4 mr-2" />Settings
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Shortcuts</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button variant="secondary" className="justify-start">
              <BarChart3 className="h-4 w-4 mr-2" />Market Overview
            </Button>
            <Button variant="secondary" className="justify-start">
              <Repeat className="h-4 w-4 mr-2" />Bridging
            </Button>
            <Button variant="secondary" className="justify-start">
              <ArrowLeftRight className="h-4 w-4 mr-2" />Swaps
            </Button>
            <Button variant="secondary" className="justify-start">
              <Wand2 className="h-4 w-4 mr-2" />Explain DeFi
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Center chat */}
      <div className="col-span-12 xl:col-span-7 flex flex-col">
        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pr-2">
          <AnimatePresence>
            {messages.map((m) => (
              <motion.div key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
                <MessageBubble m={m} onAction={handleAction} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        <div className="mt-3">
          <div className="w-full flex items-center">
            <div className="w-full flex items-center gap-2 border border-slate-300 bg-white rounded-2xl p-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    send()
                  }
                }}
                placeholder="Ask about a token, protocol, or action…"
                aria-label="Chat message"
                className="border-0 bg-transparent p-2 min-h-[44px] focus:ring-0 focus:border-0"
              />
              <Button onClick={send} className="h-10 rounded-xl px-4">
                <Send className="h-4 w-4 mr-2" />Send
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <Badge variant="outline" className="rounded-full">{pro ? 'Pro' : 'Free'}</Badge>
              <span>Adaptive CTAs are generated by the agent.</span>
            </div>
            {!pro && (
              <Button size="sm" variant="outline" onClick={() => setPro(true)} className="rounded-full">
                <Star className="h-3 w-3 mr-1" />Upgrade to Pro
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="col-span-12 xl:col-span-3">
        <RightPanel panels={panels} highlight={highlight} />
      </div>
    </div>
  )
}
