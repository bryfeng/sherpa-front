import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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
  Star,
  TrendingUp,
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
    <div className={`rounded-2xl border border-slate-200 bg-white ${className} sherpa-surface`}>{children}</div>
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
import type { PersonaId as Persona } from '../types/persona'

// Centralized style map for persona theming
const personaStyles: Record<Persona, { label: string; badge: string; text: string; dot: string; hover: string; border: string; ring: string }> = {
  friendly: {
    label: 'Friendly',
    badge: 'bg-emerald-100 text-emerald-700',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
    hover: 'hover:bg-emerald-50',
    border: 'border-emerald-300',
    ring: 'focus:ring-emerald-200',
  },
  technical: {
    label: 'Technical',
    badge: 'bg-violet-100 text-violet-700',
    text: 'text-violet-700',
    dot: 'bg-violet-500',
    hover: 'hover:bg-violet-50',
    border: 'border-violet-300',
    ring: 'focus:ring-violet-200',
  },
  professional: {
    label: 'Professional',
    badge: 'bg-slate-100 text-slate-700',
    text: 'text-slate-700',
    dot: 'bg-slate-500',
    hover: 'hover:bg-slate-50',
    border: 'border-slate-300',
    ring: 'focus:ring-slate-200',
  },
  educational: {
    label: 'Educational',
    badge: 'bg-amber-100 text-amber-700',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
    hover: 'hover:bg-amber-50',
    border: 'border-amber-300',
    ring: 'focus:ring-amber-200',
  },
}

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
  kind: 'chart' | 'table' | 'card' | 'portfolio' | 'prediction' | 'prices'
  title: string
  payload?: any
}

export type AgentMessage = {
  id: string
  role: 'assistant' | 'user'
  text: string
  actions?: AgentAction[]
  panels?: string[]
  sources?: any[]
  typing?: boolean
}

// -----------------------
// Mock data helpers
// -----------------------
const seedPanels: Panel[] = []

const seedIntro: AgentMessage[] = [
  {
    id: 'm1',
    role: 'assistant',
    text: 'Hey! I can analyze tokens, protocols, and your portfolio. What do you want to look at today?',
    actions: [
      { id: 'a1', label: 'Show my portfolio', type: 'show_panel', params: { panel_id: 'portfolio_overview' } },
      { id: 'a2', label: 'Top coins today', type: 'show_panel', params: { panel_id: 'top_coins' } },
    ],
  },
]

function uid(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`
}

// Backend services
import { api } from '../services/api'
import { transformBackendPanels } from '../services/panels'
import { SimulateModal } from '../components/modals/SimulateModal'
import { SwapModal } from '../components/modals/SwapModal'
import { BridgeModal } from '../components/modals/BridgeModal'
import { getPolymarketMarkets } from '../services/predictions'
import type { TVLPoint } from '../services/defi'
import { getUniswapTVL } from '../services/defi'
import { getSwapQuote } from '../services/quotes'
import { getTopPrices } from '../services/prices'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'

function PersonaBadge({ p }: { p: Persona }) {
  const s = personaStyles[p]
  return <Badge className={`rounded-full ${s.badge}`}>{s.label}</Badge>
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
      <div className={`max-w-[72%] rounded-2xl p-4 shadow-sm ${isUser ? 'bg-primary-600 text-white' : 'bg-white border border-slate-200 text-slate-800 sherpa-surface'}`}>
        {m.typing ? (
          <div className="text-sm text-slate-500 flex items-center gap-2">
            <span>Thinking</span>
            <span className="inline-flex gap-1">
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.2s]"></span>
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.1s]"></span>
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
            </span>
          </div>
        ) : (
          <div className="text-sm leading-relaxed">
            {isUser ? (
              <span className="whitespace-pre-wrap">{m.text}</span>
            ) : (
              <MarkdownRenderer text={m.text} />
            )}
          </div>
        )}
        {m.actions && m.actions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {m.actions.map((a) => (
              <Button key={a.id} size="sm" variant={isUser ? 'secondary' : 'default'} onClick={() => onAction(a)} className="rounded-full">
                {a.label}
              </Button>
            ))}
          </div>
        )}
        {m.sources && m.sources.length > 0 && (
          <div className="mt-2 text-xs text-slate-500 flex flex-wrap items-center gap-2">
            <span className="text-slate-600">Sources:</span>
            {m.sources.map((s: any, i: number) => (
              <SourceBadge key={i} src={s} />
            ))}
          </div>
        )}
      </div>
      {isUser && (
        <div className="h-8 w-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
          <User className="h-4 w-4 text-slate-700" />
        </div>
      )}
    </div>
  )
}

function SourceBadge({ src }: { src: any }) {
  let label = ''
  let href: string | undefined
  if (typeof src === 'string') {
    href = src.startsWith('http') ? src : undefined
    label = href ? new URL(src).hostname.replace(/^www\./, '') : src
  } else if (src && typeof src === 'object') {
    href = (src.url || src.href || src.link) as string | undefined
    const name = (src.title || src.name || src.id || href) as string | undefined
    label = name ? String(name) : href ? new URL(href).hostname.replace(/^www\./, '') : 'source'
  }
  return href ? (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-slate-300 px-2 py-0.5 hover:bg-slate-50 text-slate-700">
      <span className="truncate max-w-[140px]">{label}</span>
    </a>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-300 px-2 py-0.5 text-slate-700">
      <span className="truncate max-w-[160px]">{label || 'source'}</span>
    </span>
  )
}

function MarkdownRenderer({ text }: { text: string }) {
  // Minimal markdown support: headings (#, ##, ###), bold **text**, and bullet lists (- )
  const lines = text.split(/\n/)
  const elements: React.ReactNode[] = []
  let listBuffer: string[] = []

  function flushList() {
    if (listBuffer.length === 0) return
    elements.push(
      <ul key={`ul-${elements.length}`} className="list-disc pl-5 space-y-1">
        {listBuffer.map((item, idx) => (
          <li key={idx} dangerouslySetInnerHTML={{ __html: applyInline(item) }} />
        ))}
      </ul>,
    )
    listBuffer = []
  }

  function applyInline(s: string) {
    // bold
    return s.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  }

  for (const raw of lines) {
    const line = raw.trimEnd()
    if (line.startsWith('- ')) {
      listBuffer.push(line.slice(2))
      continue
    }
    flushList()
    if (line.startsWith('### ')) {
      elements.push(<h3 key={`h3-${elements.length}`} className="font-semibold text-slate-900 mt-2">{line.slice(4)}</h3>)
    } else if (line.startsWith('## ')) {
      elements.push(<h2 key={`h2-${elements.length}`} className="font-semibold text-slate-900 mt-3">{line.slice(3)}</h2>)
    } else if (line.startsWith('# ')) {
      elements.push(<h1 key={`h1-${elements.length}`} className="font-semibold text-slate-900 mt-4">{line.slice(2)}</h1>)
    } else if (line.length === 0) {
      elements.push(<div key={`sp-${elements.length}`} className="h-2" />)
    } else {
      elements.push(<p key={`p-${elements.length}`} className="text-slate-800" dangerouslySetInnerHTML={{ __html: applyInline(line) }} />)
    }
  }
  flushList()
  return <div className="space-y-1">{elements}</div>
}

// -----------------------
// Chart helpers
// -----------------------
function ChartPanel({ p }: { p: Panel }) {
  const [range, setRange] = React.useState<'7d' | '30d'>('7d')
  const [points, setPoints] = React.useState<TVLPoint[]>(normalizeChartPoints(p.payload))
  const unit = p.payload?.unit
  const source = p.payload?.source
  const current: TVLPoint | undefined = p.payload?.current

  React.useEffect(() => {
    setPoints(normalizeChartPoints(p.payload))
  }, [p.payload])

  const loadingRef = React.useRef(false)
  async function load(next: '7d' | '30d') {
    if (loadingRef.current) return
    loadingRef.current = true
    try {
      const data = await getUniswapTVL(next)
      if (data) setPoints(data)
    } finally {
      loadingRef.current = false
    }
  }

  const hasSeries = Array.isArray(points) && points.length >= 2
  if (!hasSeries && current) {
    return (
      <div className="w-full">
        <div className="flex items-center justify-between mb-1 text-xs text-slate-500">
          <span>Latest</span>
          <a href={source?.url || 'https://defillama.com'} target="_blank" rel="noreferrer" className="text-slate-500 hover:text-slate-700 hover:underline">Source: {source?.name || 'DefiLlama'}</a>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500">TVL</div>
            <div className="text-2xl font-semibold text-slate-900">{formatCompact(current.tvl, unit)}</div>
          </div>
          <div className="text-xs text-slate-500">{new Date(current.time).toLocaleDateString()}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-end mb-2">
        <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden">
          {(['7d', '30d'] as const).map((r) => (
            <button
              key={r}
              onClick={() => {
                setRange(r)
                // Only fetch for this known TVL chart
                if (p.id === 'uniswap_tvl_chart') void load(r)
              }}
              className={`px-2 py-1 text-xs ${
                range === r
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-50'
              }`}
              aria-pressed={range === r}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      <div className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ top: 10, right: 12, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id={`tvlGradient-${p.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis dataKey="time" tickFormatter={(v) => formatDateShort(v)} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis dataKey="tvl" tickFormatter={(v) => formatCompact(v, unit)} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <Tooltip
              formatter={(value: any) => [formatCompact(Number(value), unit, false), 'TVL']}
              labelFormatter={(label: any) => new Date(label).toLocaleDateString()}
              contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid #e2e8f0' }}
            />
            <Area type="monotone" dataKey="tvl" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill={`url(#tvlGradient-${p.id})`} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
        <span>{range === '7d' ? '7-day' : '30-day'}</span>
        <a
          href={source?.url || 'https://defillama.com'}
          target="_blank"
          rel="noreferrer"
          className="text-slate-500 hover:text-slate-700 hover:underline"
          title="Open DefiLlama"
        >
          Source: {source?.name || 'DefiLlama'}
        </a>
      </div>
    </div>
  )
}
function normalizeChartPoints(payload: any): TVLPoint[] {
  if (!payload) return []
  if (Array.isArray(payload.points)) return payload.points as TVLPoint[]
  if (Array.isArray(payload.series)) {
    const vals: number[] = payload.series
    const now = Date.now()
    const step = 24 * 60 * 60 * 1000
    const start = now - (vals.length - 1) * step
    return vals.map((v, i) => ({ time: start + i * step, tvl: v }))
  }
  if (Array.isArray(payload.timestamps) && Array.isArray(payload.tvl) && payload.timestamps.length === payload.tvl.length) {
    return (payload.tvl as number[]).map((v: number, i: number) => ({ time: payload.timestamps[i], tvl: v }))
  }
  return []
}

function formatDateShort(ts: number): string {
  try {
    return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  } catch {
    return ''
  }
}

function formatCompact(v: number, unit?: string, withUnit: boolean = true): string {
  if (!Number.isFinite(v)) return ''
  const abs = Math.abs(v)
  let num = v
  let suffix = ''
  if (abs >= 1_000_000_000) {
    num = v / 1_000_000_000
    suffix = 'B'
  } else if (abs >= 1_000_000) {
    num = v / 1_000_000
    suffix = 'M'
  } else if (abs >= 1_000) {
    num = v / 1_000
    suffix = 'K'
  }
  const base = num.toFixed(num < 10 ? 2 : 1)
  const u = unit ? ` ${unit}` : ''
  return withUnit ? `${base}${suffix}${u}` : `${base}${suffix}`
}

function RightPanel({ panels, highlight, walletAddress }: { panels: Panel[]; highlight?: string[]; walletAddress?: string }) {
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
              {p.kind === 'prediction' && <TrendingUp className="h-4 w-4" />}
              {p.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {p.kind === 'chart' && <ChartPanel p={p} />}
            {p.kind === 'portfolio' && (
              <PortfolioOverview payload={p.payload} walletAddress={walletAddress} />
            )}
            {/* governance panel de-scoped */}
            {p.kind === 'card' && <div className="text-sm text-slate-400">{JSON.stringify(p.payload)}</div>}
            {p.kind === 'prices' && <TopCoinsPanel payload={p.payload} />}
            {p.kind === 'prediction' && (
              <div className="space-y-2">
                {(p.payload?.markets || []).map((m: any) => (
                  <div key={m.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3">
                    <div className="text-sm text-slate-900">{m.question}</div>
                    <div className="flex items-center gap-3 text-xs text-slate-600">
                      <span>Yes {Math.round((m.yesPrice || 0) * 100)}%</span>
                      <span>No {Math.round((m.noPrice || 0) * 100)}%</span>
                      <a href={m.url} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline">Open</a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function TopCoinsPanel({ payload }: { payload: any }) {
  const coins = Array.isArray(payload?.coins) ? payload.coins : []
  if (!coins.length) return <div className="text-sm text-slate-500">No data available.</div>
  return (
    <div className="space-y-2">
      {coins.map((c: any) => (
        <div key={c.id || c.symbol} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex items-baseline gap-2">
            <div className="text-sm font-medium text-slate-900">{c.name}</div>
            <div className="text-xs text-slate-500">{String(c.symbol || '').toUpperCase()}</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm font-semibold text-slate-900">${Number(c.price_usd || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
            {typeof c.change_24h === 'number' && (
              <div className={`text-xs ${c.change_24h >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{c.change_24h.toFixed(2)}%</div>
            )}
          </div>
        </div>
      ))}
      <div className="text-[11px] text-slate-500">Source: CoinGecko</div>
    </div>
  )
}

function PredictionsShortcut({ onLoad }: { onLoad: (panel: Panel) => void }) {
  const [loading, setLoading] = useState(false)
  return (
    <Button
      variant="secondary"
      className="justify-start"
      onClick={async () => {
        if (loading) return
        setLoading(true)
        try {
          const markets = await getPolymarketMarkets('', 5)
          const panel: Panel = { id: 'polymarket_markets', kind: 'prediction', title: 'Prediction Markets', payload: { markets } }
          onLoad(panel)
        } finally {
          setLoading(false)
        }
      }}
    >
      <TrendingUp className="h-4 w-4 mr-2" />{loading ? 'Loading…' : 'Prediction Markets'}
    </Button>
  )
}

function PersonaDropdown({ persona, setPersona }: { persona: Persona; setPersona: (p: Persona) => void }) {
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 224 })
  const wrapRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    function updatePosition() {
      const r = wrapRef.current?.getBoundingClientRect()
      if (!r) return
      setCoords({ top: r.bottom + window.scrollY + 8, left: r.left + window.scrollX, width: Math.max(224, r.width) })
    }
    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="relative" ref={wrapRef}>
      <Button
        variant="outline"
        className={`rounded-full bg-white text-slate-900 ${personaStyles[persona].border} ${personaStyles[persona].hover} focus:ring-2 ${personaStyles[persona].ring}`}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Choose persona"
      >
        <Sparkles className="h-4 w-4 mr-2 text-slate-700" />
        <span className={`inline-flex h-2.5 w-2.5 rounded-full mr-2 ${personaStyles[persona].dot}`} />
        <span className={`capitalize font-medium ${personaStyles[persona].text}`}>{persona}</span>
        <ChevronDown className="h-4 w-4 ml-2 text-slate-600" />
      </Button>
      {open &&
        createPortal(
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
            <div
              className="fixed z-50 rounded-xl border border-slate-200 bg-white p-2 shadow-2xl ring-1 ring-black/5"
              style={{ top: `${coords.top}px`, left: `${coords.left}px`, width: `${coords.width}px` }}
              role="menu"
            >
              <div className="px-2 py-1 text-[11px] uppercase tracking-wide text-slate-500">Choose persona</div>
              {(['friendly', 'technical', 'professional', 'educational'] as Persona[]).map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    setPersona(p)
                    setOpen(false)
                  }}
                  className={`w-full text-left px-2 py-2 rounded-lg flex items-center gap-2 ${personaStyles[p].hover}`}
                  role="menuitem"
                >
                  <span className={`inline-flex h-2.5 w-2.5 rounded-full ${personaStyles[p].dot}`} />
                  <span className={`capitalize font-medium ${personaStyles[p].text}`}>{p}</span>
                  {persona === p && <span className={`ml-auto text-xs ${personaStyles[p].text}`}>Current</span>}
                </button>
              ))}
            </div>
          </>,
          document.body,
        )}
    </div>
  )
}

type WalletStatus = 'connecting' | 'reconnecting' | 'connected' | 'disconnected' | undefined

export default function DeFiChatAdaptiveUI({ persona, setPersona, walletAddress, walletStatus }: { persona: Persona; setPersona: (p: Persona) => void; walletAddress?: string; walletStatus?: WalletStatus }) {
  const [messages, setMessages] = useState<AgentMessage[]>(seedIntro)
  const [panels, setPanels] = useState<Panel[]>(seedPanels)
  const [highlight, setHighlight] = useState<string[] | undefined>(undefined)
  const [input, setInput] = useState('')
  const [pro, setPro] = useState(false)
  const [conversationId, setConversationId] = useState<string | undefined>(() => {
    try {
      const stored = localStorage.getItem('sherpa.conversation_id')
      return stored || undefined
    } catch {
      return undefined
    }
  })
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showSim, setShowSim] = useState<{ from?: string; to?: string } | null>(null)
  const [showSwap, setShowSwap] = useState<{ from?: string; to?: string } | null>(null)
  const [showBridge, setShowBridge] = useState<boolean>(false)

  async function loadPortfolioPanel(addr: string) {
    try {
      const res = await api.portfolio(addr)
      if (res.success && res.portfolio) {
        const data = res.portfolio
        const totalUsd = Number(data.total_value_usd || 0)
        const sorted = (data.tokens || [])
          .filter((t: any) => Number(t.value_usd || 0) > 0)
          .sort((a: any, b: any) => Number(b.value_usd || 0) - Number(a.value_usd || 0))
        const allPositions = sorted.map((t: any) => ({ sym: t.symbol || t.name || 'TOK', usd: Number(t.value_usd || 0) }))
        const positions = allPositions.slice(0, 6)
        const panel: Panel = { id: 'portfolio_overview', kind: 'portfolio', title: 'Your Portfolio Snapshot', payload: { totalUsd, positions, allPositions } }
        setPanels((prev) => {
          const others = prev.filter((p) => p.id !== 'portfolio_overview')
          return [panel, ...others]
        })
        setHighlight(['portfolio_overview'])
      }
    } catch {}
  }

  // Uniswap TVL removed in favor of a simple Top Coins panel

  async function loadTopCoinsPanel() {
    const coins = await getTopPrices(5)
    const panel: Panel = {
      id: 'top_coins',
      kind: 'prices',
      title: 'Top Coins (excl. stablecoins)',
      payload: { coins },
    }
    setPanels((prev) => {
      const others = prev.filter((p) => p.id !== 'top_coins')
      return [panel, ...others]
    })
    setHighlight(['top_coins'])
  }

  // Load portfolio panel when wallet address is available
  useEffect(() => {
    if (!walletAddress) {
      // Remove portfolio panel when wallet disconnects
      setPanels((prev) => prev.filter((p) => p.id !== 'portfolio_overview'))
      return
    }
    loadPortfolioPanel(walletAddress).catch(() => {})
  }, [walletAddress])

  const send = async () => {
    const q = input.trim()
    if (!q) return
    const userMsg: AgentMessage = { id: uid('msg'), role: 'user', text: q }
    const typingId = uid('msg')
    setMessages((m) => [...m, userMsg, { id: typingId, role: 'assistant', text: '', typing: true }])
    setInput('')
    try {
      const payload = {
        messages: [{ role: 'user', content: q }],
        address: walletAddress,
        chain: 'ethereum',
        conversation_id: conversationId,
      }
      const res = await api.chat(payload)
      if (res?.conversation_id && res.conversation_id !== conversationId) {
        setConversationId(res.conversation_id)
        try { localStorage.setItem('sherpa.conversation_id', res.conversation_id) } catch {}
      }
      const newPanels = transformBackendPanels(res.panels)
      if (newPanels.length) {
        setPanels((prev) => mergePanelsLocal(prev, newPanels))
        setHighlight(newPanels.map((p) => p.id))
      }
      const assistantMsg: AgentMessage = { id: uid('msg'), role: 'assistant', text: res.reply || 'Done.', sources: (res.sources || []) as any }
      setMessages((m) => m.filter((mm) => mm.id !== typingId).concat(assistantMsg))
    } catch (e: any) {
      setMessages((m) => m.filter((mm) => !(mm as any).typing).concat({ id: uid('msg'), role: 'assistant', text: `Sorry, I hit an error contacting the API. ${e?.message || ''}` }))
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
        if (a.params?.panel_id === 'portfolio_overview' && !walletAddress) {
          setMessages((m) => [...m, { id: uid('msg'), role: 'assistant', text: 'Please connect your wallet to view your portfolio.' }])
          break
        }
        if (a.params?.panel_id === 'top_coins') {
          loadTopCoinsPanel().catch(() => {})
          break
        }
        if (a.params?.panel_id === 'portfolio_overview' && walletAddress) {
          loadPortfolioPanel(walletAddress).catch(() => {})
        }
        setHighlight(a.params?.panel_id ? [a.params?.panel_id] : undefined)
        if (a.params?.panel_id) setMessages((m) => [...m, { id: uid('msg'), role: 'assistant', text: `Opened: ${a.params?.panel_id}` }])
        break
      }
      case 'simulate': {
        setShowSim({ from: a.params?.from, to: a.params?.to })
        break
      }
      case 'swap': {
        setShowSwap({ from: a.params?.from, to: a.params?.to })
        break
      }
      case 'bridge': {
        setShowBridge(true)
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
    <div className="h-[calc(100vh-64px)] w-full grid grid-cols-12 gap-4 p-4 overflow-hidden">
      {/* Left rail */}
      <div className="col-span-2 hidden xl:flex flex-col gap-3 min-h-0 overflow-y-auto pr-2">
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
            <Button variant="secondary" className="justify-start" onClick={() => loadTopCoinsPanel()}>
              <BarChart3 className="h-4 w-4 mr-2" />Top Coins
            </Button>
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
      <div className="col-span-12 xl:col-span-7 flex flex-col min-h-0">
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
            <div className="w-full flex items-center gap-2 border border-slate-300 bg-white rounded-2xl p-2 sherpa-surface">
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
      <div className="col-span-12 xl:col-span-3 flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto pr-2">
          <RightPanel panels={panels} highlight={highlight} walletAddress={walletAddress} />
        </div>
      </div>

      {/* Modals */}
      {showSim && (
        <SimulateModal
          from={showSim.from}
          to={showSim.to}
          onClose={() => setShowSim(null)}
          onConfirm={async (pct, amount) => {
            const fromSym = showSim.from || 'ETH'
            const toSym = showSim.to || 'USDC'
            const amt = amount && amount > 0 ? amount : 1 // Fallback to 1 unit for MVP
            setShowSim(null)
            const quote = await getSwapQuote({ token_in: fromSym, token_out: toSym, amount_in: amt, slippage_bps: 50 })
            const feeStr = quote ? `$${quote.fee_est.toFixed(2)} est. fee` : 'fee est. unavailable'
            const outStr = quote ? `${quote.amount_out_est.toFixed(6)} ${toSym}` : '—'
            const slipStr = quote ? `${quote.slippage_bps} bps slippage reserve` : ''
            const basis = amount && amount > 0 ? '' : ' (based on 1 unit)'
            const warn = quote && quote.warnings?.length ? `\nNote: ${quote.warnings.join('; ')}` : ''
            const txt = `Simulated swap: ${amt} ${fromSym} → ~${outStr}.${basis}\n${feeStr}; ${slipStr}.${warn}`
            setMessages((m) => [
              ...m,
              { id: uid('msg'), role: 'assistant', text: txt, actions: [{ id: uid('act'), label: 'Proceed swap', type: 'swap', params: { from: fromSym, to: toSym, amount: amt } }] },
            ])
          }}
        />
      )}
      {showSwap && (
        <SwapModal
          from={showSwap.from}
          to={showSwap.to}
          onClose={() => setShowSwap(null)}
          onConfirm={(params) => {
            setShowSwap(null)
            setMessages((m) => [...m, { id: uid('msg'), role: 'assistant', text: `Opening wallet to swap ${params.amount ?? ''} ${params.from} → ${params.to}.` }])
          }}
        />
      )}
      {showBridge && (
        <BridgeModal
          onClose={() => setShowBridge(false)}
          onConfirm={(params) => {
            setShowBridge(false)
            setMessages((m) => [...m, { id: uid('msg'), role: 'assistant', text: `Bridge setup: ${params.fromChain} → ${params.toChain}${params.amount ? `, amount ${params.amount}` : ''}.` }])
          }}
        />
      )}
      {/* No overlay for Top Coins; rendered as a right-panel card */}
    </div>
  )
}

function PortfolioOverview({ payload, walletAddress }: { payload: any; walletAddress?: string }) {
  const [expanded, setExpanded] = React.useState(false)
  const [hideDust, setHideDust] = React.useState(true)
  const total = Number(payload?.totalUsd ?? 0)
  const basePositions = Array.isArray(payload?.allPositions) ? payload.allPositions : Array.isArray(payload?.positions) ? payload.positions : []
  const hasData = (Number.isFinite(total) && total > 0) || basePositions.length > 0

  if (!hasData) {
    if (!walletAddress) return <div className="text-sm text-slate-500">Connect your wallet to load portfolio data.</div>
    return <div className="text-sm text-slate-500">Loading portfolio…</div>
  }

  const threshold = 1 // USD
  const full = hideDust ? basePositions.filter((p: any) => Number(p.usd || 0) >= threshold) : basePositions
  const collapsedCount = 10
  const shown = expanded ? full : full.slice(0, collapsedCount)

  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="font-semibold text-slate-900">Total: ${Number.isFinite(total) ? total.toLocaleString() : '—'}</div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setHideDust((v) => !v)}
            className={`px-2 py-1 rounded-lg border text-xs ${hideDust ? 'bg-slate-100 border-slate-200 text-slate-700' : 'bg-white border-slate-200 text-slate-700'} sherpa-surface`}
            title="Hide tokens under $1"
          >
            {hideDust ? 'Dust hidden' : 'Show dust'}
          </button>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="px-2 py-1 rounded-lg border border-slate-200 text-xs text-slate-700 bg-white sherpa-surface"
          >
            {expanded ? 'Show top 6' : `Show all (${full.length})`}
          </button>
        </div>
      </div>
      <div className="space-y-2">
        {shown.map((pos: any, idx: number) => {
          const usd = Number(pos.usd || 0)
          const pct = total > 0 ? Math.max(0, Math.min(100, (usd / total) * 100)) : 0
          return (
            <div key={(pos.sym || 'TOK') + String(idx) + String(pos.usd)} className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-slate-900">{pos.sym}</div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-600">{pct.toFixed(1)}%</span>
                  <span className="text-sm font-semibold text-slate-900">${usd.toLocaleString()}</span>
                </div>
              </div>
              <div className="mt-2 h-1.5 w-full rounded bg-slate-100">
                <div className="h-1.5 rounded bg-primary-600" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )
        })}
      </div>
      {!expanded && full.length > collapsedCount && (
        <div className="text-xs text-slate-500">Showing top {collapsedCount} of {full.length}</div>
      )}
    </div>
  )
}
