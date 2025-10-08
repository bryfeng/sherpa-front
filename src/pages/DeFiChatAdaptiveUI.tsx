/* eslint-disable react/prop-types */
import React, { useEffect, useMemo, useRef, useState, useId } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  ChevronDown,
  ChevronRight,
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
  Maximize2,
  Minimize2,
  GripVertical,
  ChevronUp,
  X,
  ExternalLink,
  MessageSquarePlus,
} from 'lucide-react'

// Local, minimal UI primitives (Tailwind styled)
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'outline' | 'secondary'
  size?: 'sm' | 'md'
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(props, ref) {
  const { children, className = '', variant = 'default', size = 'md', type = 'button', ...rest } = props
  const base = 'inline-flex items-center justify-center rounded-xl transition shadow-sm border'
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
    <button ref={ref} type={type} className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...rest}>
      {children}
    </button>
  )
})

Button.displayName = 'Button'

function Card(
  { children, className = '', ...rest }:
  React.PropsWithChildren<{ className?: string } & React.HTMLAttributes<HTMLDivElement>>,
) {
  return (
    <div {...rest} className={`rounded-2xl border border-slate-200 bg-white ${className} sherpa-surface`}>{children}</div>
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

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement> & { className?: string }>(
  function Textarea(props, ref) {
    const { className = '', ...rest } = props
    return (
      <textarea
        {...rest}
        ref={ref}
        className={`min-h-[56px] w-full flex-1 rounded-2xl border border-slate-300 bg-slate-50 p-3 text-sm text-slate-900 placeholder:text-slate-500 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-200 ${className}`}
      />
    )
  },
)

Textarea.displayName = 'Textarea'

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

const personaOrder: Persona[] = ['friendly', 'technical', 'professional', 'educational']

const WETH_ABI = [
  { type: 'function', name: 'deposit', stateMutability: 'payable', inputs: [] },
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
]

type ActionType = 'show_panel' | 'swap' | 'bridge' | 'explain' | 'subscribe' | 'simulate'

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
      { id: 'a3', label: 'Trending tokens', type: 'show_panel', params: { panel_id: 'trending_tokens' } },
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
import { RelayQuoteModal } from '../components/modals/RelayQuoteModal'
import type { TVLPoint } from '../services/defi'
import { getUniswapTVL } from '../services/defi'
import { getSwapQuote } from '../services/quotes'
import { getTopPrices } from '../services/prices'
import { getTrendingTokens, type TrendingToken } from '../services/trending'
import { truncateAddress } from '../services/wallet'
import { formatRelativeTime } from '../utils/time'
import { usePublicClient, useSwitchChain, useWalletClient } from 'wagmi'
import { erc20Abi } from 'viem'
import type { EntitlementSnapshot } from '../types/entitlement'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { TrendingTokensBanner, TrendingTokensList } from '../components/widgets/TrendingTokensWidget'

function PersonaBadge({ p }: { p: Persona }) {
  const s = personaStyles[p]
  return <Badge className={`rounded-full ${s.badge}`}>{s.label}</Badge>
}

function MessageBubble({ m, onAction }: { m: AgentMessage; onAction: (a: AgentAction) => void }) {
  const isUser = m.role === 'user'
  const actions = m.actions || []
  const actionRefs = useRef<Array<HTMLButtonElement | null>>([])

  useEffect(() => {
    actionRefs.current = actionRefs.current.slice(0, actions.length)
  }, [actions.length])

  const focusAction = (index: number) => {
    if (!actions.length) return
    const normalized = (index + actions.length) % actions.length
    const el = actionRefs.current[normalized]
    el?.focus()
  }

  const handleActionKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault()
        focusAction(index + 1)
        break
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault()
        focusAction(index - 1)
        break
      case 'Home':
        event.preventDefault()
        focusAction(0)
        break
      case 'End':
        event.preventDefault()
        focusAction(actions.length - 1)
        break
      default:
        break
    }
  }

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
        {actions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Assistant suggestions">
            {actions.map((a, index) => (
              <Button
                key={a.id}
                ref={(el) => {
                  actionRefs.current[index] = el
                }}
                size="sm"
                variant={isUser ? 'secondary' : 'default'}
                onClick={() => onAction(a)}
                onKeyDown={(event) => handleActionKeyDown(event, index)}
                className="rounded-full"
              >
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
  let title: string | undefined
  if (typeof src === 'string') {
    href = src.startsWith('http') ? src : undefined
    if (href) {
      try {
        const url = new URL(src)
        label = url.hostname.replace(/^www\./, '')
        title = src
      } catch {
        label = src
      }
    } else {
      label = src
    }
  } else if (src && typeof src === 'object') {
    href = (src.url || src.href || src.link) as string | undefined
    title = (src.description || src.summary) as string | undefined
    const name = (src.title || src.name || src.id || src.label || href) as string | undefined
    if (name) label = String(name)
    else if (href) {
      try {
        const url = new URL(href)
        label = url.hostname.replace(/^www\./, '')
      } catch {
        label = href
      }
    } else {
      label = 'source'
    }
  }
  return href ? (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      title={title || `Open ${label}`}
      className="inline-flex items-center gap-1 rounded-full border border-slate-300 px-2 py-0.5 hover:bg-slate-50 text-slate-700"
    >
      <span className="truncate max-w-[140px]">{label}</span>
      <ExternalLink className="h-3 w-3 shrink-0 text-slate-500" aria-hidden="true" />
    </a>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-300 px-2 py-0.5 text-slate-700">
      <span className="truncate max-w-[160px]">{label || 'source'}</span>
    </span>
  )
}

function PanelSources({ sources }: { sources?: PanelSource[] }) {
  if (!sources || sources.length === 0) return null
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
      <span className="text-slate-600">Sources:</span>
      {sources.map((s, idx) => (
        <SourceBadge key={String(s?.id || s?.url || s?.href || s?.name || idx)} src={s} />
      ))}
    </div>
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

  const lastPoint = hasSeries ? points[points.length - 1] : undefined

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
        <span>{range === '7d' ? '7-day window' : '30-day window'}</span>
        {lastPoint && <span>{new Date(lastPoint.time).toLocaleDateString()}</span>}
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

function RightPanel({
  panels,
  highlight,
  walletAddress,
  panelUI,
  onToggleCollapse,
  onExpand,
  onReorder,
  onBridge,
  onSwap,
  walletReady,
  onRefreshBridgeQuote,
  onRefreshSwapQuote,
  onInsertQuickPrompt,
}: {
  panels: Panel[]
  highlight?: string[]
  walletAddress?: string
  panelUI: Record<string, { collapsed?: boolean }>
  onToggleCollapse: (id: string) => void
  onExpand: (id: string) => void
  onReorder: (dragId: string, dropId: string) => void
  onBridge?: (panel: Panel) => Promise<string | void>
  onSwap?: (panel: Panel) => Promise<string | void>
  walletReady?: boolean
  onRefreshBridgeQuote?: () => Promise<void>
  onRefreshSwapQuote?: () => Promise<void>
  onInsertQuickPrompt?: (prompt: string) => void
}) {
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
      {ordered.map((p) => {
        const isBanner = p.metadata?.layout === 'banner'
        const isTrendingBanner = isBanner && p.kind === 'trending'

        if (isTrendingBanner) {
          const tokens = Array.isArray(p.payload?.tokens) ? p.payload.tokens : []
          const fetchedAt = typeof p.payload?.fetchedAt === 'string' ? p.payload.fetchedAt : undefined
          return (
            <div
              key={p.id}
              className="rounded-2xl"
              draggable
              onDragStart={(e: React.DragEvent<HTMLDivElement>) => {
                e.dataTransfer.effectAllowed = 'move'
                e.dataTransfer.setData('text/x-panel-id', p.id)
              }}
              onDragOver={(e: React.DragEvent<HTMLDivElement>) => {
                if (e.dataTransfer.types.includes('text/x-panel-id')) {
                  e.preventDefault()
                  e.dataTransfer.dropEffect = 'move'
                }
              }}
              onDrop={(e: React.DragEvent<HTMLDivElement>) => {
                const dragId = e.dataTransfer.getData('text/x-panel-id')
                if (dragId) onReorder(dragId, p.id)
              }}
            >
              <TrendingTokensBanner
                tokens={tokens}
                fetchedAt={fetchedAt}
                onInsertQuickPrompt={onInsertQuickPrompt}
                onViewAll={() => onExpand(p.id)}
              />
            </div>
          )
        }

        return (
          <Card
            key={p.id}
            className="rounded-2xl"
            draggable
            onDragStart={(e: React.DragEvent<HTMLDivElement>) => {
              e.dataTransfer.effectAllowed = 'move'
              e.dataTransfer.setData('text/x-panel-id', p.id)
            }}
            onDragOver={(e: React.DragEvent<HTMLDivElement>) => {
              if (e.dataTransfer.types.includes('text/x-panel-id')) {
                e.preventDefault()
                e.dataTransfer.dropEffect = 'move'
              }
            }}
            onDrop={(e: React.DragEvent<HTMLDivElement>) => {
              const dragId = e.dataTransfer.getData('text/x-panel-id')
              if (dragId) onReorder(dragId, p.id)
            }}
          >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              {p.kind === 'chart' && <BarChart3 className="h-4 w-4" />}
              {p.kind === 'portfolio' && <Wallet className="h-4 w-4" />}
              {p.kind === 'trending' && <Star className="h-4 w-4" />}
              {p.kind === 'prediction' && <TrendingUp className="h-4 w-4" />}
              {p.title}
            </CardTitle>
            <div className="ml-auto flex items-center gap-1">
              <button className="h-8 w-8 rounded-lg hover:bg-slate-100 text-slate-600" title="Reorder">
                <GripVertical className="h-4 w-4 mx-auto" />
              </button>
              <button onClick={() => onToggleCollapse(p.id)} className="h-8 w-8 rounded-lg hover:bg-slate-100 text-slate-600" title={panelUI[p.id]?.collapsed ? 'Expand' : 'Minimize'}>
                {panelUI[p.id]?.collapsed ? <ChevronDown className="h-4 w-4 mx-auto" /> : <ChevronUp className="h-4 w-4 mx-auto" />}
              </button>
              <button onClick={() => onExpand(p.id)} className="h-8 w-8 rounded-lg hover:bg-slate-100 text-slate-600" title="Expand">
                <Maximize2 className="h-4 w-4 mx-auto" />
              </button>
            </div>
          </CardHeader>
          {!panelUI[p.id]?.collapsed && (
            <CardContent>
              {p.kind === 'chart' && <ChartPanel p={p} />}
              {p.kind === 'portfolio' && (
                <PortfolioOverview payload={p.payload} walletAddress={walletAddress} />
              )}
              {p.kind === 'card' && (
                (() => {
                  const quoteType = typeof p.payload?.quote_type === 'string' ? p.payload.quote_type : undefined
                  const isSwapPanel = quoteType === 'swap' || p.id === 'relay_swap_quote'
                  const isBridgePanel = quoteType === 'bridge' || p.id === 'relay_bridge_quote'
                  if (isSwapPanel || isBridgePanel) {
                    const executeFn = isSwapPanel ? onSwap : onBridge
                    const refreshFn = isSwapPanel ? onRefreshSwapQuote : onRefreshBridgeQuote
                    return (
                      <RelayQuotePanel
                        panel={p}
                        walletAddress={walletAddress}
                        walletReady={walletReady}
                        onExecuteQuote={executeFn}
                        onRefreshQuote={refreshFn}
                        onInsertQuickPrompt={onInsertQuickPrompt}
                      />
                    )
                  }
                  return <div className="text-sm text-slate-400">{JSON.stringify(p.payload)}</div>
                })()
              )}
              {p.kind === 'prices' && <TopCoinsPanel payload={p.payload} />}
              {p.kind === 'trending' && (
                <TrendingTokensList
                  tokens={Array.isArray(p.payload?.tokens) ? p.payload.tokens : []}
                  fetchedAt={typeof p.payload?.fetchedAt === 'string' ? p.payload.fetchedAt : undefined}
                  error={typeof p.payload?.error === 'string' ? p.payload.error : undefined}
                  onInsertQuickPrompt={onInsertQuickPrompt}
                />
              )}
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
              <PanelSources sources={p.sources} />
            </CardContent>
          )}
        </Card>
        )
      })}
    </div>
  )
}

type RelayQuotePanelProps = {
  panel: Panel
  walletAddress?: string
  walletReady?: boolean
  onExecuteQuote?: (panel: Panel) => Promise<string | void>
  onRefreshQuote?: () => Promise<void>
  onInsertQuickPrompt?: (prompt: string) => void
}

function RelayQuotePanel({ panel, walletAddress, walletReady = false, onExecuteQuote, onRefreshQuote, onInsertQuickPrompt }: RelayQuotePanelProps) {
  const payload = panel.payload || {}
  const breakdown = payload.breakdown || {}
  const output = breakdown.output || {}
  const fees = breakdown.fees || {}
  const instructions: string[] = Array.isArray(payload.instructions)
    ? payload.instructions.map((entry: any) => String(entry))
    : []
  const issues = Array.isArray(payload.issues) ? payload.issues : []
  const actions = payload.actions && typeof payload.actions === 'object' ? payload.actions : null
  const quickPrompts = actions
    ? Object.entries(actions)
        .map(([key, value]) => ({ key, label: String(value || '').trim() }))
        .filter((entry) => entry.label.length > 0)
    : []
  const etaSeconds = typeof breakdown.eta_seconds === 'number' ? breakdown.eta_seconds : undefined
  const quoteWallet = typeof payload.wallet?.address === 'string' ? payload.wallet.address : undefined

  const quoteType = typeof payload.quote_type === 'string'
    ? payload.quote_type.toLowerCase()
    : panel.id === 'relay_swap_quote'
      ? 'swap'
      : 'bridge'
  const isSwap = quoteType === 'swap'
  const actionVerb = isSwap ? 'swap' : 'bridge'
  const actionVerbCapitalized = isSwap ? 'Swap' : 'Bridge'
  const actionGerund = isSwap ? 'swapping' : 'bridging'
  const sendingLabel = isSwap ? 'Swapping…' : 'Bridging…'

  const [sending, setSending] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [showInstructions, setShowInstructions] = useState(false)
  const [showQuickPrompts, setShowQuickPrompts] = useState(false)

  const expiryRaw = payload.quote_expiry
  let expiryMs: number | undefined
  if (typeof expiryRaw === 'string') {
    const parsed = Date.parse(expiryRaw)
    if (!Number.isNaN(parsed)) expiryMs = parsed
  } else if (expiryRaw) {
    const isoCandidate = expiryRaw.iso || expiryRaw.ISO
    if (isoCandidate) {
      const parsed = Date.parse(String(isoCandidate))
      if (!Number.isNaN(parsed)) expiryMs = parsed
    }
    if (typeof expiryMs === 'undefined') {
      const epochCandidate = expiryRaw.epoch ?? expiryRaw.EPOCH
      if (typeof epochCandidate !== 'undefined') {
        const epochNum = Number(epochCandidate)
        if (Number.isFinite(epochNum)) {
          expiryMs = epochNum > 1e12 ? epochNum : epochNum * 1000
        }
      }
    }
  }

  const expiryDate = typeof expiryMs === 'number' ? new Date(expiryMs) : undefined
  const expired = typeof expiryMs === 'number' ? expiryMs <= Date.now() : false

  const walletMismatch = Boolean(
    walletAddress && quoteWallet && walletAddress.toLowerCase() !== quoteWallet.toLowerCase(),
  )

  const numeric = (value: any): number | undefined => {
    if (typeof value === 'number') return value
    if (typeof value === 'string' && value.trim().length) {
      const parsed = Number(value)
      if (Number.isFinite(parsed)) return parsed
    }
    return undefined
  }

  const formatUsd = (value: any): string => {
    const num = numeric(value)
    if (typeof num !== 'number') return '—'
    const abs = Math.abs(num)
    const options: Intl.NumberFormatOptions = abs >= 1
      ? { minimumFractionDigits: 2, maximumFractionDigits: 2 }
      : { minimumFractionDigits: 2, maximumFractionDigits: 4 }
    return `$${num.toLocaleString(undefined, options)}`
  }

  const outputEstimate = (() => {
    const amount = output.amount_estimate || output.amount || payload.output?.amount
    const symbol = output.symbol || payload.output?.token?.symbol
    if (!amount) return symbol ? `— ${symbol}` : '—'
    const amountNum = numeric(amount)
    const displayed = typeof amountNum === 'number'
      ? amountNum.toLocaleString(undefined, { maximumFractionDigits: 6 })
      : String(amount)
    return symbol ? `${displayed} ${symbol}` : displayed
  })()

  const outputUsd = payload.usd_estimates?.output || output.value_usd
  const gasUsd = payload.usd_estimates?.gas || fees.gas_usd

  const formatEta = (seconds?: number) => {
    if (!seconds || seconds <= 0) return '—'
    if (seconds < 60) return `${Math.round(seconds)}s`
    const minutes = Math.round(seconds / 60)
    if (minutes < 60) return `${minutes} min`
    const hours = Math.round(minutes / 60)
    if (hours < 24) return `${hours} hr`
    const days = Math.round(hours / 24)
    return `${days} day${days > 1 ? 's' : ''}`
  }

  const formatExpiry = () => {
    if (!expiryMs) return '—'
    const delta = expiryMs - Date.now()
    const abs = Math.abs(delta)
    const direction = delta >= 0 ? 'in ' : ''
    if (abs < 60_000) return delta >= 0 ? 'in under a minute' : 'expired just now'
    const minutes = Math.round(abs / 60_000)
    if (minutes < 60) return `${direction}${minutes} min${delta < 0 ? ' ago' : ''}`
    const hours = Math.round(minutes / 60)
    if (hours < 24) return `${direction}${hours} hr${delta < 0 ? ' ago' : ''}`
    const days = Math.round(hours / 24)
    return `${direction}${days} day${days > 1 ? 's' : ''}${delta < 0 ? ' ago' : ''}`
  }

  const disableReason = (() => {
    if (!walletReady) return `Connect a wallet to ${actionVerb}.`
    if (!payload.tx) return 'Quote did not include a prepared transaction.'
    if (payload.status !== 'ok') return 'Quote is incomplete. Ask for a refresh.'
    if (expired) return `Quote expired. Refresh before ${actionGerund}.`
    if (walletMismatch) return 'Connect the wallet that requested this quote.'
    return null
  })()

  const canExecute = !disableReason && Boolean(onExecuteQuote)

  const handleExecuteClick = async () => {
    if (!onExecuteQuote || !canExecute) return
    setSending(true)
    setError(null)
    setTxHash(null)
    try {
      const result = await onExecuteQuote(panel)
      if (typeof result === 'string' && result) setTxHash(result)
    } catch (err: any) {
      setError(err?.message || `${actionVerbCapitalized} transaction failed.`)
    } finally {
      setSending(false)
    }
  }

  const handleRefresh = async () => {
    if (!onRefreshQuote) return
    setRefreshing(true)
    setError(null)
    try {
      await onRefreshQuote()
    } catch (err: any) {
      setError(err?.message || 'Failed to refresh quote.')
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div className="space-y-4 text-sm text-slate-700">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-3">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Estimated Output</div>
          <div className="mt-1 text-sm font-semibold text-slate-900">{outputEstimate}</div>
          {outputUsd && <div className="text-xs text-slate-500">{formatUsd(outputUsd)}</div>}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-3">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Fees</div>
          <div className="mt-1 text-sm font-semibold text-slate-900">{formatUsd(gasUsd)}</div>
          {typeof fees.slippage_percent !== 'undefined' && fees.slippage_percent !== null && (
            <div className="text-xs text-slate-500">Slippage {fees.slippage_percent}%</div>
          )}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-3">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">ETA</div>
          <div className="mt-1 text-sm font-semibold text-slate-900">{formatEta(etaSeconds)}</div>
        </div>
        <div className={`rounded-2xl border ${expired ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-white'} p-3`}>
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Quote Expiry</div>
          <div className={`mt-1 text-sm font-semibold ${expired ? 'text-rose-600' : 'text-slate-900'}`}>
            {expiryDate ? expiryDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '—'}
          </div>
          {expiryMs && <div className={`text-xs ${expired ? 'text-rose-600' : 'text-slate-500'}`}>{formatExpiry()}</div>}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-3">
        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Destination Wallet</div>
        <div className="mt-1 text-sm font-mono text-slate-900 break-all">{quoteWallet || '—'}</div>
        {walletMismatch && (
          <div className="mt-1 text-xs text-amber-600">Connected wallet differs from the quote wallet. Switch wallets before {actionGerund}.</div>
        )}
      </div>

      {issues.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-800">
          <div className="font-semibold">Needs attention</div>
          <ul className="mt-2 list-disc pl-4 space-y-1">
            {issues.map((issue: any, idx: number) => (
              <li key={idx}>{String(issue)}</li>
            ))}
          </ul>
        </div>
      )}

      {instructions.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Instructions</div>
            <button
              type="button"
              onClick={() => setShowInstructions((value) => !value)}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-100"
              aria-expanded={showInstructions}
            >
              {showInstructions ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              {showInstructions ? 'Hide' : `${instructions.length}`}
            </button>
          </div>
          {!showInstructions && instructions[0] && (
            <div className="mt-2 text-xs text-slate-500 truncate">{instructions[0]}</div>
          )}
          {showInstructions && (
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              {instructions.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {quickPrompts.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Quick Prompts</div>
            <button
              type="button"
              onClick={() => setShowQuickPrompts((value) => !value)}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-100"
              aria-expanded={showQuickPrompts}
            >
              {showQuickPrompts ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              {showQuickPrompts ? 'Hide' : `${quickPrompts.length}`}
            </button>
          </div>
          {!showQuickPrompts && quickPrompts[0] && (
            <div className="mt-2 text-xs text-slate-500 truncate">{quickPrompts[0].label}</div>
          )}
          {showQuickPrompts && (
              <div className="mt-3 flex flex-wrap gap-2">
              {quickPrompts.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    if (onInsertQuickPrompt) onInsertQuickPrompt(label)
                  }}
                  className="inline-flex items-center gap-1 overflow-hidden rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100"
                  title={label}
                >
                  <MessageSquarePlus className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                  <span className="truncate whitespace-nowrap max-w-[200px]">{label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={handleExecuteClick} disabled={!canExecute || sending} className="rounded-xl px-4">
          {sending ? sendingLabel : actionVerbCapitalized}
        </Button>
        {onRefreshQuote && (
          <Button variant="secondary" onClick={handleRefresh} disabled={refreshing} className="rounded-xl px-4">
            {refreshing ? 'Refreshing…' : (
              <span className="inline-flex items-center gap-2">
                <Repeat className="h-4 w-4" />Refresh Quote
              </span>
            )}
          </Button>
        )}
        {disableReason && <span className="text-xs text-slate-500">{disableReason}</span>}
      </div>

      {error && <div className="text-xs text-rose-600">{error}</div>}
      {txHash && (
        <div className="text-xs text-emerald-600 break-all">
          Transaction submitted: <code>{txHash}</code>
        </div>
      )}
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
    </div>
  )
}

function ExpandedPanelModal({
  panel,
  onClose,
  walletAddress,
  walletReady,
  onBridge,
  onSwap,
  onRefreshBridgeQuote,
  onRefreshSwapQuote,
  onInsertQuickPrompt,
}: {
  panel?: Panel
  onClose: () => void
  walletAddress?: string
  walletReady?: boolean
  onBridge?: (panel: Panel) => Promise<string | void>
  onSwap?: (panel: Panel) => Promise<string | void>
  onRefreshBridgeQuote?: () => Promise<void>
  onRefreshSwapQuote?: () => Promise<void>
  onInsertQuickPrompt?: (prompt: string) => void
}) {
  if (!panel) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 p-3">
      <div className="w-full max-w-3xl max-h-[80vh] rounded-2xl bg-white shadow-xl border border-slate-200 flex flex-col">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <div className="font-semibold text-slate-900">{panel.title}</div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-slate-100 text-slate-600" title="Close">
            <Minimize2 className="h-4 w-4 mx-auto" />
          </button>
        </div>
        <div className="p-4 flex-1 overflow-y-auto">
          {panel.kind === 'chart' && <ChartPanel p={panel} />}
          {panel.kind === 'portfolio' && <PortfolioOverview payload={panel.payload} walletAddress={walletAddress} />}
          {panel.kind === 'card' && (
            (() => {
              const quoteType = typeof panel.payload?.quote_type === 'string' ? panel.payload.quote_type : undefined
              const isSwapPanel = quoteType === 'swap' || panel.id === 'relay_swap_quote'
              const isBridgePanel = quoteType === 'bridge' || panel.id === 'relay_bridge_quote'
              if (isSwapPanel || isBridgePanel) {
                const executeFn = isSwapPanel ? onSwap : onBridge
                const refreshFn = isSwapPanel ? onRefreshSwapQuote : onRefreshBridgeQuote
                return (
                  <RelayQuotePanel
                    panel={panel}
                    walletAddress={walletAddress}
                    walletReady={walletReady}
                    onExecuteQuote={executeFn}
                    onRefreshQuote={refreshFn}
                    onInsertQuickPrompt={onInsertQuickPrompt}
                  />
                )
              }
              return <div className="text-sm text-slate-700">{JSON.stringify(panel.payload)}</div>
            })()
          )}
          {panel.kind === 'prices' && <TopCoinsPanel payload={panel.payload} />}
          {panel.kind === 'trending' && (
          <TrendingTokensList
            tokens={Array.isArray(panel.payload?.tokens) ? panel.payload.tokens : []}
            fetchedAt={typeof panel.payload?.fetchedAt === 'string' ? panel.payload.fetchedAt : undefined}
            error={typeof panel.payload?.error === 'string' ? panel.payload.error : undefined}
            onInsertQuickPrompt={onInsertQuickPrompt}
          />
        )}
          {panel.kind === 'prediction' && (
            <div className="space-y-2">
              {(panel.payload?.markets || []).map((m: any) => (
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
          <PanelSources sources={panel.sources} />
        </div>
      </div>
    </div>
  )
}

function PersonaDropdown({ persona, setPersona }: { persona: Persona; setPersona: (p: Persona) => void }) {
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 224 })
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([])
  const menuId = useId()

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
      if (e.key === 'Escape') {
        e.preventDefault()
        setOpen(false)
        const trigger = wrapRef.current?.querySelector('button') as HTMLButtonElement | null
        trigger?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    const raf = window.requestAnimationFrame(() => {
      const currentIndex = Math.max(personaOrder.indexOf(persona), 0)
      const target = itemRefs.current[currentIndex] || itemRefs.current[0]
      target?.focus()
    })
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('keydown', onKey)
      window.cancelAnimationFrame(raf)
      itemRefs.current = []
    }
  }, [open, persona])

  const focusOption = React.useCallback((index: number) => {
    if (!personaOrder.length) return
    const normalized = (index + personaOrder.length) % personaOrder.length
    const el = itemRefs.current[normalized]
    el?.focus()
  }, [])

  const handlePersonaKey = (event: React.KeyboardEvent<HTMLButtonElement>, index: number, option: Persona) => {
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        event.preventDefault()
        focusOption(index + 1)
        break
      case 'ArrowUp':
      case 'ArrowLeft':
        event.preventDefault()
        focusOption(index - 1)
        break
      case 'Home':
        event.preventDefault()
        focusOption(0)
        break
      case 'End':
        event.preventDefault()
        focusOption(personaOrder.length - 1)
        break
      case 'Enter':
      case ' ': 
      case 'Spacebar': {
        event.preventDefault()
        setPersona(option)
        setOpen(false)
        const trigger = wrapRef.current?.querySelector('button') as HTMLButtonElement | null
        trigger?.focus()
        break
      }
      case 'Escape': {
        event.preventDefault()
        setOpen(false)
        const trigger = wrapRef.current?.querySelector('button') as HTMLButtonElement | null
        trigger?.focus()
        break
      }
      case 'Tab':
        setOpen(false)
        break
      default:
        break
    }
  }

  return (
    <div className="relative" ref={wrapRef}>
      <Button
        variant="outline"
        className={`rounded-full bg-white text-slate-900 ${personaStyles[persona].border} ${personaStyles[persona].hover} focus:ring-2 ${personaStyles[persona].ring}`}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Choose persona"
        aria-controls={open ? menuId : undefined}
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
              id={menuId}
              aria-orientation="vertical"
            >
              <div className="px-2 py-1 text-[11px] uppercase tracking-wide text-slate-500">Choose persona</div>
              {personaOrder.map((p, idx) => (
                <button
                  key={p}
                  ref={(el) => {
                    itemRefs.current[idx] = el
                  }}
                  onClick={() => {
                    setPersona(p)
                    setOpen(false)
                  }}
                  onKeyDown={(event) => handlePersonaKey(event, idx, p)}
                  className={`w-full text-left px-2 py-2 rounded-lg flex items-center gap-2 ${personaStyles[p].hover}`}
                  role="menuitemradio"
                  aria-checked={persona === p}
                  tabIndex={persona === p ? 0 : -1}
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

function getExplorerUrl(chain: string | null | undefined, address: string | null | undefined) {
  if (!address) return undefined
  const target = address
  const network = (chain || 'ethereum').toLowerCase()
  switch (network) {
    case 'ethereum':
    case 'mainnet':
      return `https://etherscan.io/address/${target}`
    case 'sepolia':
      return `https://sepolia.etherscan.io/address/${target}`
    case 'goerli':
      return `https://goerli.etherscan.io/address/${target}`
    case 'polygon':
    case 'polygon-mainnet':
    case 'matic':
      return `https://polygonscan.com/address/${target}`
    default:
      return undefined
  }
}

export default function DeFiChatAdaptiveUI({
  persona,
  setPersona,
  walletAddress,
  pro,
  entitlement,
  onRequestPro,
  allowManualUnlock,
  onManualUnlock,
}: {
  persona: Persona
  setPersona: (p: Persona) => void
  walletAddress?: string
  pro: boolean
  entitlement: EntitlementSnapshot
  onRequestPro: (source: 'cta' | 'action') => void
  allowManualUnlock?: boolean
  onManualUnlock?: () => void
}) {
  const [messages, setMessages] = useState<AgentMessage[]>(seedIntro)
  const [panels, setPanels] = useState<Panel[]>(seedPanels)
  const [highlight, setHighlight] = useState<string[] | undefined>(undefined)
  const [input, setInput] = useState('')
  const [panelUI, setPanelUI] = useState<Record<string, { collapsed?: boolean }>>({})
  const [expandedPanelId, setExpandedPanelId] = useState<string | null>(null)
  const [recentChats, setRecentChats] = useState<Array<{ conversation_id: string; title?: string | null; last_activity: string; message_count: number; archived: boolean }>>([])
  const proBadgeLabel = pro ? 'Pro' : entitlement.gating === 'token' ? 'Pro Locked' : 'Pro Preview'
  const manualUnlockAvailable = Boolean(!pro && allowManualUnlock && onManualUnlock)
  const [showProInfo, setShowProInfo] = useState(false)
  const [copiedToken, setCopiedToken] = useState(false)
  const isMounted = useRef(true)
  const proTokenAddress = entitlement.tokenAddress || null
  const proRequirement = React.useMemo(() => {
    if (pro) return 'Pro access is active.'
    if (entitlement.reason) return entitlement.reason
    if (entitlement.gating === 'token') {
      return 'Hold the Sherpa Pro token to unlock.'
    }
    if (entitlement.status === 'error') return 'Entitlement service is unavailable right now.'
    if (entitlement.status === 'disabled') return 'Pro gating is disabled in this environment.'
    return 'Upgrade to Sherpa Pro for deeper strategy, alerts, and fee rebates.'
  }, [pro, entitlement])
  const proExplorerUrl = React.useMemo(() => getExplorerUrl(entitlement.chain ?? null, proTokenAddress), [entitlement.chain, proTokenAddress])
  const storageKey = React.useCallback((addr?: string | null) => (addr ? `sherpa.conversation_id:${addr.toLowerCase()}` : 'sherpa.conversation_id:guest'), [])
  const [conversationId, setConversationId] = useState<string | undefined>(() => {
    try {
      const key = storageKey(walletAddress || null)
      const stored = localStorage.getItem(key)
      return stored || undefined
    } catch {
      return undefined
    }
  })
  const prefersReducedMotion = useReducedMotion()
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const handleInsertQuickPrompt = React.useCallback((prompt: string) => {
    const text = String(prompt ?? '').trim()
    if (!text.length) return
    setInput((prev) => {
      const prevValue = prev || ''
      if (!prevValue.trim()) return text
      const separator = prevValue.endsWith('\n') ? '' : '\n'
      return `${prevValue}${separator}${text}`
    })
    const focusInput = () => {
      const el = inputRef.current
      if (!el) return
      el.focus()
      const pos = el.value.length
      el.setSelectionRange(pos, pos)
    }
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(focusInput)
    } else {
      focusInput()
    }
  }, [])
  const scheduleScrollToBottom = React.useCallback(() => {
    window.setTimeout(() => {
      const el = scrollRef.current
      if (!el) return
      const behavior: ScrollBehavior = prefersReducedMotion ? 'auto' : 'smooth'
      el.scrollTo({ top: el.scrollHeight, behavior })
    }, 0)
  }, [prefersReducedMotion])

  const [showSim, setShowSim] = useState<{ from?: string; to?: string } | null>(null)
  const [showSwap, setShowSwap] = useState<{ from?: string; to?: string } | null>(null)
  const [showBridge, setShowBridge] = useState<boolean>(false)
  const [showRelay, setShowRelay] = useState<boolean>(false)
  const copyInfoTimeout = useRef<number | undefined>(undefined)
  const isAssistantTyping = useMemo(() => messages.some((msg) => msg.typing), [messages])
  const [ariaAnnouncement, setAriaAnnouncement] = useState('')
  const lastAnnouncedId = useRef<string | null>(null)
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  const { switchChainAsync } = useSwitchChain()
  const walletReady = Boolean(walletClient)

  function handleProUpsell(source: 'cta' | 'action') {
    onRequestPro(source)
    setShowProInfo(true)
    setCopiedToken(false)
  }

  const proContractDisplay = proTokenAddress ? truncateAddress(proTokenAddress, 6) : null

  async function handleCopyToken() {
    if (!proTokenAddress) return
    try {
      await navigator.clipboard.writeText(proTokenAddress)
      setCopiedToken(true)
      if (copyInfoTimeout.current) window.clearTimeout(copyInfoTimeout.current)
      copyInfoTimeout.current = window.setTimeout(() => setCopiedToken(false), 2000)
    } catch {
      setCopiedToken(false)
    }
  }

  useEffect(() => {
    return () => {
      if (copyInfoTimeout.current) window.clearTimeout(copyInfoTimeout.current)
    }
  }, [])

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  useEffect(() => {
    if (pro) {
      setShowProInfo(false)
      setCopiedToken(false)
    }
  }, [pro])

  useEffect(() => {
    const latestAssistant = [...messages]
      .reverse()
      .find((msg) => msg.role === 'assistant' && !msg.typing)
    if (latestAssistant && latestAssistant.id !== lastAnnouncedId.current) {
      const text = latestAssistant.text.replace(/\s+/g, ' ').trim()
      setAriaAnnouncement(text)
      lastAnnouncedId.current = latestAssistant.id
    }
  }, [messages])

  const loadPortfolioPanel = React.useCallback(async (addr: string) => {
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
        const panel: Panel = {
          id: 'portfolio_overview',
          kind: 'portfolio',
          title: 'Your Portfolio Snapshot',
          payload: { totalUsd, positions, allPositions },
          sources: Array.isArray(res.sources) ? res.sources : undefined,
        }
        setPanels((prev) => {
          const others = prev.filter((p) => p.id !== 'portfolio_overview')
          return [panel, ...others]
        })
        setHighlight(['portfolio_overview'])
      }
    } catch {}
  }, [setPanels, setHighlight])

  // Uniswap TVL removed in favor of a simple Top Coins panel

  async function loadTopCoinsPanel() {
    const coins = await getTopPrices(5)
    const panel: Panel = {
      id: 'top_coins',
      kind: 'prices',
      title: 'Top Coins (excl. stablecoins)',
      payload: { coins },
      sources: [{ name: 'CoinGecko', url: 'https://www.coingecko.com' }],
    }
    setPanels((prev) => {
      const others = prev.filter((p) => p.id !== 'top_coins')
      return [panel, ...others]
    })
    setHighlight(['top_coins'])
  }

  const loadTrendingTokensPanel = React.useCallback(async (options: { highlight?: boolean } = {}) => {
    const { highlight: forceHighlight = false } = options
    let tokens: TrendingToken[] = []
    let errorMessage: string | undefined
    try {
      tokens = await getTrendingTokens(8)
    } catch (err: any) {
      errorMessage = err?.message || 'Unable to load trending tokens.'
    }
    if (!isMounted.current) return
    const panel: Panel = {
      id: 'trending_tokens',
      kind: 'trending',
      title: 'Trending Tokens (Relay-ready)',
      payload: { tokens, fetchedAt: new Date().toISOString(), error: errorMessage },
      sources: [
        { name: 'CoinGecko', url: 'https://www.coingecko.com' },
        { name: 'Relay', url: 'https://relay.link' },
      ],
      metadata: { layout: 'banner' },
    }
    let existed = false
    setPanels((prev) => {
      existed = prev.some((p) => p.id === 'trending_tokens')
      const others = prev.filter((p) => p.id !== 'trending_tokens')
      return [panel, ...others]
    })
    if (forceHighlight || !existed) {
      setHighlight(['trending_tokens'])
    }
  }, [])

  const mergePanelsLocal = React.useCallback((current: Panel[], incoming: Panel[]): Panel[] => {
    const byId = new Map(current.map((p) => [p.id, p] as const))
    for (const p of incoming) byId.set(p.id, { ...(byId.get(p.id) || {} as any), ...p })
    return Array.from(byId.values())
  }, [])

  // Load portfolio panel when wallet address is available
  useEffect(() => {
    if (!walletAddress) {
      // Remove portfolio panel when wallet disconnects
      setPanels((prev) => prev.filter((p) => p.id !== 'portfolio_overview'))
      return
    }
    loadPortfolioPanel(walletAddress).catch(() => {})
  }, [walletAddress, loadPortfolioPanel])

  useEffect(() => {
    loadTrendingTokensPanel({ highlight: true }).catch(() => {})
    const interval = window.setInterval(() => {
      loadTrendingTokensPanel().catch(() => {})
    }, 60_000)
    return () => {
      window.clearInterval(interval)
    }
  }, [loadTrendingTokensPanel])

  // Load the stored conversation id when wallet changes
  useEffect(() => {
    try {
      const key = storageKey(walletAddress || null)
      const stored = localStorage.getItem(key) || undefined
      setConversationId(stored)
    } catch {
      setConversationId(undefined)
    }
  }, [walletAddress, storageKey])

  // Load recent chats when wallet changes
  useEffect(() => {
    if (!walletAddress) {
      setRecentChats([])
      return
    }
    api
      .listConversations(walletAddress)
      .then((items) => setRecentChats(items || []))
      .catch(() => setRecentChats([]))
  }, [walletAddress])

  const sendPrompt = React.useCallback(async (raw: string) => {
    const q = raw.trim()
    if (!q) return
    const userMsg: AgentMessage = { id: uid('msg'), role: 'user', text: q }
    const typingId = uid('msg')
    setMessages((m) => [...m, userMsg, { id: typingId, role: 'assistant', text: '', typing: true }])
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
        try { localStorage.setItem(storageKey(walletAddress || null), res.conversation_id) } catch {}
      }
      const newPanels = transformBackendPanels(res.panels)
      const portfolioPanels = newPanels.filter((p) => p.kind === 'portfolio')
      const nonPortfolioPanels = newPanels.filter((p) => p.kind !== 'portfolio')

      if (portfolioPanels.length) {
        if (!walletAddress) {
          setMessages((m) => [
            ...m.filter((mm) => mm.id !== typingId),
            { id: uid('msg'), role: 'assistant', text: 'Please connect your wallet to view your portfolio.' },
          ])
        } else {
          loadPortfolioPanel(walletAddress).catch(() => {})
          setHighlight(['portfolio_overview'])
        }
      }

      if (nonPortfolioPanels.length) {
        setPanels((prev) => mergePanelsLocal(prev, nonPortfolioPanels))
        setHighlight(nonPortfolioPanels.map((p) => p.id))
      }

      const assistantMsg: AgentMessage = {
        id: uid('msg'),
        role: 'assistant',
        text: res.reply || 'Done.',
        sources: (res.sources || []) as any,
      }
      setMessages((m) => m.filter((mm) => mm.id !== typingId).concat(assistantMsg))
      return res
    } catch (e: any) {
      setMessages((m) => m.filter((mm) => !(mm as any).typing).concat({
        id: uid('msg'),
        role: 'assistant',
        text: `Sorry, I hit an error contacting the API. ${e?.message || ''}`,
      }))
      throw e
    } finally {
      scheduleScrollToBottom()
    }
  }, [conversationId, loadPortfolioPanel, mergePanelsLocal, scheduleScrollToBottom, setConversationId, setHighlight, setPanels, storageKey, walletAddress])

  const send = async () => {
    const q = input.trim()
    if (!q) return
    setInput('')
    try {
      await sendPrompt(q)
    } catch {
      // Error already surfaced in chat
    }
  }

  const requestBridgeQuoteRefresh = React.useCallback(async () => {
    try {
      await sendPrompt('refresh bridge quote')
    } catch {
      // Follow-up errors already rendered in chat
    }
  }, [sendPrompt])

  const requestSwapQuoteRefresh = React.useCallback(async () => {
    try {
      await sendPrompt('refresh swap quote')
    } catch {
      // Errors already surfaced in chat history
    }
  }, [sendPrompt])

  const handleRelayExecution = React.useCallback(async (panel: Panel) => {
    const payload = panel.payload || {}
    const quoteType = typeof payload.quote_type === 'string'
      ? payload.quote_type.toLowerCase()
      : panel.id === 'relay_swap_quote'
        ? 'swap'
        : 'bridge'
    const isSwapQuote = quoteType === 'swap'
    const actionVerb = isSwapQuote ? 'swap' : 'bridge'
    const actionVerbCapitalized = isSwapQuote ? 'Swap' : 'Bridge'
    const refreshFn = isSwapQuote ? requestSwapQuoteRefresh : requestBridgeQuoteRefresh

    if (!walletClient) {
      throw new Error(`Connect a wallet to ${actionVerb}.`)
    }

    const tx = payload.tx
    if (!tx) throw new Error(`${actionVerbCapitalized} transaction not available; ask for a new quote.`)

    const quoteWallet: string | undefined = typeof payload.wallet?.address === 'string' ? payload.wallet.address : undefined
    if (!quoteWallet) throw new Error('Quote is missing the wallet address.')

    const accountAddress = (walletClient.account?.address ?? quoteWallet) as `0x${string}`

    const resolveExpiryMs = (input: any): number | undefined => {
      if (!input) return undefined
      if (typeof input === 'string') {
        const parsed = Date.parse(input)
        return Number.isNaN(parsed) ? undefined : parsed
      }
      const iso = input.iso || input.ISO
      if (iso) {
        const parsed = Date.parse(String(iso))
        if (!Number.isNaN(parsed)) return parsed
      }
      const epoch = input.epoch ?? input.EPOCH
      if (typeof epoch !== 'undefined') {
        const epochNum = Number(epoch)
        if (Number.isFinite(epochNum)) {
          return epochNum > 1e12 ? epochNum : epochNum * 1000
        }
      }
      return undefined
    }

    const expiryMs = resolveExpiryMs(payload.quote_expiry)
    if (typeof expiryMs === 'number' && expiryMs <= Date.now()) {
      await refreshFn()
      throw new Error(`Quote expired. Requested a fresh ${actionVerb} quote.`)
    }

    const connectedAddress = walletClient.account?.address
    if (connectedAddress && connectedAddress.toLowerCase() !== quoteWallet.toLowerCase()) {
      throw new Error('Connected wallet does not match the quote wallet.')
    }

    const ensureBigInt = (value: any): bigint | undefined => {
      if (typeof value === 'bigint') return value
      if (typeof value === 'string' && value.trim().length) {
        try { return BigInt(value) } catch { return undefined }
      }
      if (typeof value === 'number' && Number.isFinite(value)) {
        return BigInt(Math.trunc(value))
      }
      return undefined
    }

    const desiredChainId = typeof tx.chainId === 'number' ? tx.chainId : Number(tx.chainId ?? walletClient.chain?.id ?? 0)
    if (desiredChainId && walletClient.chain && walletClient.chain.id !== desiredChainId && switchChainAsync) {
      await switchChainAsync({ chainId: desiredChainId }).catch(() => {
        throw new Error(`Switch your wallet to chain ID ${desiredChainId} to continue.`)
      })
    }

    const rawInputAmount = payload.amounts?.input_amount_wei ?? payload.amounts?.input_base_units ?? tx.value ?? 0
    const inputAmountWei = ensureBigInt(rawInputAmount)
    const inputTokenAddress: string | undefined = payload.breakdown?.input?.token_address
    const inputTokenSymbol = typeof payload.breakdown?.input?.symbol === 'string'
      ? payload.breakdown.input.symbol.toUpperCase()
      : undefined

    const request: any = {
      account: walletClient.account ?? accountAddress,
      to: tx.to,
      data: tx.data,
    }

    if (!request.to || !request.data) throw new Error('Quote is missing transaction call data.')

    const gasLike = tx.gas ?? tx.gasLimit
    const gasValue = ensureBigInt(gasLike)
    if (typeof gasValue !== 'undefined') request.gas = gasValue

    const valueBig = ensureBigInt(tx.value)
    if (typeof valueBig !== 'undefined') request.value = valueBig

    if (typeof tx.chainId !== 'undefined' && tx.chainId !== null) {
      request.chainId = Number(tx.chainId)
    }

    if (typeof tx.maxFeePerGas !== 'undefined') {
      const parsed = ensureBigInt(tx.maxFeePerGas)
      if (typeof parsed !== 'undefined') request.maxFeePerGas = parsed
    }

    if (typeof tx.maxPriorityFeePerGas !== 'undefined') {
      const parsed = ensureBigInt(tx.maxPriorityFeePerGas)
      if (typeof parsed !== 'undefined') request.maxPriorityFeePerGas = parsed
    }

    if (typeof tx.nonce !== 'undefined') {
      request.nonce = tx.nonce
    }

    try {
      if (inputTokenAddress && inputAmountWei && inputAmountWei > 0n) {
        const wethLike = inputTokenSymbol === 'WETH'
        if (wethLike) {
          const executeWrap = async (value: bigint) => {
            await walletClient.writeContract({
              address: inputTokenAddress as `0x${string}`,
              abi: WETH_ABI,
              functionName: 'deposit',
              args: [],
              account: walletClient.account ?? accountAddress,
              chain: walletClient.chain,
              value,
            })
          }

          if (publicClient) {
            try {
              const balance = await publicClient.readContract({
                address: inputTokenAddress as `0x${string}`,
                abi: erc20Abi,
                functionName: 'balanceOf',
                args: [accountAddress],
              }) as bigint
              const deficit = balance < inputAmountWei ? (inputAmountWei - balance) : 0n
              if (deficit > 0n) {
                await executeWrap(deficit)
              }
            } catch (wrapErr) {
              console.warn('WETH balance check failed, attempting full wrap', wrapErr)
              await executeWrap(inputAmountWei)
            }
          } else {
            console.warn('Public client unavailable; wrapping full WETH amount without balance check')
            await executeWrap(inputAmountWei)
          }
        }
      }

      const approvalData = payload.approval_data
      if (approvalData) {
        const approveAmount = ensureBigInt(approvalData.amount)
        if (typeof approveAmount === 'undefined') {
          throw new Error(`Approval amount from ${actionVerb} quote is invalid.`)
        }
        await walletClient.writeContract({
          address: approvalData.tokenAddress as `0x${string}`,
          abi: erc20Abi,
          functionName: 'approve',
          args: [approvalData.spenderAddress as `0x${string}`, approveAmount],
          account: walletClient.account ?? accountAddress,
          chain: walletClient.chain,
        })
      }

      const hash = await walletClient.sendTransaction(request)
      return hash as string
    } catch (err: any) {
      await refreshFn()
      const message = err?.shortMessage || err?.message || `Wallet rejected the ${actionVerb} transaction.`
      throw new Error(message)
    }
  }, [walletClient, publicClient, requestBridgeQuoteRefresh, requestSwapQuoteRefresh, switchChainAsync])

  function reorderPanels(dragId: string, dropId: string) {
    if (dragId === dropId) return
    setPanels((prev) => {
      const idxA = prev.findIndex((p) => p.id === dragId)
      const idxB = prev.findIndex((p) => p.id === dropId)
      if (idxA < 0 || idxB < 0) return prev
      const next = prev.slice()
      const [moved] = next.splice(idxA, 1)
      next.splice(idxB, 0, moved)
      return next
    })
  }

  function toggleCollapse(id: string) {
    setPanelUI((u) => ({ ...u, [id]: { ...u[id], collapsed: !u[id]?.collapsed } }))
  }

  const handleAction = (a: AgentAction) => {
    if (a.gated === 'pro' && !pro) {
      handleProUpsell('action')
      const contractLine = proTokenAddress ? `Contract: ${proTokenAddress}` : ''
      const info = [proRequirement, contractLine].filter(Boolean).join('\n')
      setMessages((m) => [
        ...m,
        {
          id: uid('msg'),
          role: 'assistant',
          text: info || 'Sherpa Pro is token-gated. Hold the entitlement asset to unlock.',
          actions: [{ id: uid('act'), label: 'View Pro requirements', type: 'subscribe' }],
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
        if (a.params?.panel_id === 'trending_tokens') {
          loadTrendingTokensPanel({ highlight: true }).catch(() => {})
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
        handleProUpsell('action')
        const contractLine = proTokenAddress ? `Contract: ${proTokenAddress}` : ''
        const info = [proRequirement, contractLine].filter(Boolean).join('\n')
        setMessages((m) => [
          ...m,
          {
            id: uid('msg'),
            role: 'assistant',
            text: info || 'Sherpa Pro is token-gated. Hold the entitlement asset to unlock.',
          },
        ])
        break
      }
    }

    scheduleScrollToBottom()
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
            <Button
              variant="secondary"
              className="w-full"
              onClick={async () => {
                // Create a new conversation explicitly (if address), else clear guest
                try {
                  if (walletAddress) {
                    const res = await api.createConversation(walletAddress)
                    const newId = res?.conversation_id
                    if (newId) {
                      setConversationId(newId)
                      try { localStorage.setItem(storageKey(walletAddress), newId) } catch {}
                    }
                  } else {
                    // Guest session: clear any existing id
                    setConversationId(undefined)
                    try { localStorage.removeItem(storageKey(null)) } catch {}
                  }
                } catch {
                  // Fallback: just clear local state
                  setConversationId(undefined)
                }
                // Reset UI conversation state
                setMessages(seedIntro)
                setPanels(seedPanels)
              }}
            >
              <Sparkles className="h-4 w-4 mr-2" />New Chat
            </Button>
            {(import.meta as any).env?.DEV || (import.meta as any).env?.VITE_ENABLE_DEBUG_TOOLS === 'true' ? (
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={async () => {
                    // Frontend-only export (no server call)
                    try {
                      const payload = {
                        exported_at: new Date().toISOString(),
                        persona,
                        wallet_address: walletAddress || null,
                        conversation_id: conversationId || null,
                        ui: {
                          panels,
                          highlight: highlight || [],
                          panelUI,
                          expandedPanelId,
                          pro,
                        },
                        messages: messages.map((m) => ({
                          id: m.id,
                          role: m.role,
                          text: m.text,
                          actions: m.actions || [],
                          panels: m.panels || [],
                          sources: m.sources || [],
                          typing: Boolean(m.typing),
                        })),
                      }
                      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = `ui-conversation-${conversationId || 'guest'}.json`
                      document.body.appendChild(a)
                      a.click()
                      a.remove()
                      URL.revokeObjectURL(url)
                    } catch (e: any) {
                      console.error('Export(UI) failed', e)
                      setMessages((m) => [...m, { id: uid('msg'), role: 'assistant', text: 'Failed to export UI conversation JSON.' }])
                    }
                  }}
                >
                  <BarChart3 className="h-4 w-4 mr-2" />Export UI Log JSON
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={async () => {
                    // Server snapshot export (uses backend route)
                    if (!conversationId) {
                      setMessages((m) => [...m, { id: uid('msg'), role: 'assistant', text: 'No active conversation to export.' }])
                      return
                    }
                    try {
                      const data = await api.getConversation(conversationId)
                      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = `conversation-${conversationId}.json`
                      document.body.appendChild(a)
                      a.click()
                      a.remove()
                      URL.revokeObjectURL(url)
                    } catch (e: any) {
                      console.error('Export(server) failed', e)
                      setMessages((m) => [...m, { id: uid('msg'), role: 'assistant', text: 'Failed to export server conversation JSON.' }])
                    }
                  }}
                >
                  <BarChart3 className="h-4 w-4 mr-2" />Export Server JSON
                </Button>
              </div>
            ) : null}
            <Button variant="outline" className="w-full">
              <Settings className="h-4 w-4 mr-2" />Settings
            </Button>
          </CardContent>
        </Card>
<Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Recent Chats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {walletAddress ? (
              recentChats.length > 0 ? (
                recentChats.map((c) => (
                  <button
                    key={c.conversation_id}
                    className={`w-full text-left px-3 py-2 rounded-lg border text-xs ${
                      c.conversation_id === conversationId ? 'bg-primary-50 border-primary-200 text-primary-800' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    } sherpa-surface`}
                    onClick={() => {
                      setConversationId(c.conversation_id)
                      try { localStorage.setItem(storageKey(walletAddress), c.conversation_id) } catch {}
                    }}
                    title={c.title || c.conversation_id}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate">{c.title || c.conversation_id.slice(0, 18)}{c.title ? '' : '…'}</span>
                      <span className="text-[10px] text-slate-400">{formatRelativeTime(c.last_activity)}</span>
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-xs text-slate-500">No recent chats yet.</div>
              )
            ) : (
              <div className="text-xs text-slate-500">Connect a wallet to see chats.</div>
            )}
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
            <Button variant="secondary" className="justify-start" onClick={() => setShowRelay(true)}>
              <Repeat className="h-4 w-4 mr-2" />Bridging (POC)
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
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto space-y-4 pr-2"
          role="log"
          aria-live="polite"
          aria-relevant="additions text"
          aria-busy={isAssistantTyping}
          tabIndex={0}
        >
          <AnimatePresence>
            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={prefersReducedMotion ? undefined : { opacity: 0, y: -6 }}
                transition={prefersReducedMotion ? { duration: 0 } : undefined}
              >
                <MessageBubble m={m} onAction={handleAction} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        <div className="sr-only" aria-live="polite" aria-atomic="false">
          {ariaAnnouncement}
        </div>
        <div className="mt-3">
          <div className="w-full flex items-center">
            <div className="w-full flex items-center gap-2 border border-slate-300 bg-white rounded-2xl p-2 sherpa-surface">
              <Textarea
                ref={inputRef}
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
              <Badge variant="outline" className="rounded-full">{proBadgeLabel}</Badge>
              <span>Adaptive CTAs are generated by the agent.</span>
            </div>
            {!pro && (
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => handleProUpsell('cta')} className="rounded-full">
                  <Star className="h-3 w-3 mr-1" />Upgrade to Pro
                </Button>
                {manualUnlockAvailable && (
                  <Button size="sm" variant="secondary" onClick={onManualUnlock} className="rounded-full">
                    <Sparkles className="h-3 w-3 mr-1" />Dev Unlock
                  </Button>
                )}
              </div>
            )}
          </div>
          {showProInfo && !pro && (
            <div className="mt-3">
              <div className="rounded-2xl border border-primary-200/80 bg-primary-50/80 p-4 text-xs text-primary-900 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="mt-[2px] rounded-full bg-white/60 p-1 border border-primary-200">
                    <Star className="h-3.5 w-3.5 text-primary-600" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-primary-900">Unlock Sherpa Pro</p>
                        <p className="mt-1 text-[11px] leading-relaxed text-primary-900/80">{proRequirement}</p>
                      </div>
                      <button
                        onClick={() => {
                          setShowProInfo(false)
                          setCopiedToken(false)
                        }}
                        className="rounded-full p-1 text-primary-700 hover:bg-primary-100"
                        aria-label="Dismiss Pro info"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    {proTokenAddress && (
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-primary-900">
                        <code className="rounded-lg border border-primary-200 bg-white/80 px-2 py-1 font-mono text-[11px] tracking-tight">{proContractDisplay}</code>
                        <Button size="sm" variant="secondary" onClick={handleCopyToken} className="rounded-full px-3 py-1 text-[11px]">
                          {copiedToken ? 'Copied' : 'Copy contract'}
                        </Button>
                        {proExplorerUrl && (
                          <a
                            href={proExplorerUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-full border border-primary-200 px-2 py-1 text-[11px] text-primary-800 hover:bg-primary-100"
                          >
                            View explorer
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-3 text-[11px] text-primary-900/70">
                  <span className="font-medium text-primary-900">Pro perks:</span> deeper simulations, fee benchmarking, and guided DeFi workflows tailored to your wallet state.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right panel */}
      <div className="col-span-12 xl:col-span-3 flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto pr-2">
          <RightPanel
            panels={panels}
            highlight={highlight}
            walletAddress={walletAddress}
            panelUI={panelUI}
            onToggleCollapse={(id) => toggleCollapse(id)}
            onExpand={(id) => setExpandedPanelId(id)}
            onReorder={(from, to) => reorderPanels(from, to)}
            onBridge={handleRelayExecution}
            onSwap={handleRelayExecution}
            walletReady={walletReady}
            onRefreshBridgeQuote={requestBridgeQuoteRefresh}
            onRefreshSwapQuote={requestSwapQuoteRefresh}
            onInsertQuickPrompt={handleInsertQuickPrompt}
          />
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
      {showRelay && (
        <RelayQuoteModal onClose={() => setShowRelay(false)} />
      )}
      {expandedPanelId && (
        <ExpandedPanelModal
          panel={panels.find((p) => p.id === expandedPanelId)}
          onClose={() => setExpandedPanelId(null)}
          walletAddress={walletAddress}
          walletReady={walletReady}
          onBridge={handleRelayExecution}
          onSwap={handleRelayExecution}
          onRefreshBridgeQuote={requestBridgeQuoteRefresh}
          onRefreshSwapQuote={requestSwapQuoteRefresh}
          onInsertQuickPrompt={handleInsertQuickPrompt}
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
