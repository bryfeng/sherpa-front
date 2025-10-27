/* eslint-disable react/prop-types */
import React from 'react'
import { Sparkles, TrendingUp, Repeat, ArrowLeftRight } from 'lucide-react'
import { getTrendingTokens, type TrendingToken } from '../../services/trending'
import { truncateAddress } from '../../services/wallet'
import { getChainName } from '../../utils/chains'
import { formatRelativeTime } from '../../utils/time'
import { ErrorView } from '../ErrorView'
import { WidgetButton, WidgetCard, WidgetSection, WidgetHeader } from './widget-kit'

const POSITIVE_ACCENT = 'text-[#0c6f56]'
const NEGATIVE_ACCENT = 'text-[#d3355c]'

type TrendingTokensListProps = {
  tokens: TrendingToken[]
  fetchedAt?: string
  error?: string
  onInsertQuickPrompt?: (prompt: string) => void
  showHotspots?: boolean
  limitHotspots?: number
  compact?: boolean
}

export function TrendingTokensList({
  tokens,
  fetchedAt,
  error,
  onInsertQuickPrompt,
  showHotspots = true,
  limitHotspots = 3,
  compact = false,
}: TrendingTokensListProps) {
  if (error && tokens.length === 0) {
    return <ErrorView message={error} />
  }

  if (!tokens.length) {
    return <div className="text-sm" style={{ color: 'var(--muted)' }}>
      No trending tokens right now. Ask Sherpa for fresh market intel.
    </div>
  }

  const formatUsd = (amount: number | null | undefined, opts?: Intl.NumberFormatOptions) => {
    if (typeof amount !== 'number' || Number.isNaN(amount)) return '—'
    const formatOptions = opts ?? { maximumFractionDigits: amount >= 1 ? 2 : 4 }
    return `$${amount.toLocaleString(undefined, formatOptions)}`
  }

  const formatChange = (value: number | null | undefined) => {
    if (typeof value !== 'number' || Number.isNaN(value)) return null
    const sign = value >= 0 ? '+' : ''
    return `${sign}${value.toFixed(2)}%`
  }

  const hotspots = (() => {
    if (!showHotspots) return [] as Array<{ chainId: number; name: string; count: number }>
    const counts = new Map<number, { chainId: number; count: number }>()
    for (const token of tokens) {
      if (!token.chain_id) continue
      const current = counts.get(token.chain_id) || { chainId: token.chain_id, count: 0 }
      current.count += 1
      counts.set(token.chain_id, current)
    }
    return Array.from(counts.values())
      .map((entry) => ({ ...entry, name: getChainName(entry.chainId) || `Chain ${entry.chainId}` }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limitHotspots)
  })()

  return (
    <div className="space-y-3">
      <div className="text-xs text-slate-500">
        Sherpa tracks high-velocity assets across Relay-supported chains.
        {fetchedAt && ` Updated ${formatRelativeTime(fetchedAt)}.`}
      </div>
      {hotspots.length > 0 && (
        <WidgetSection tone="accent" className="text-xs">
          <div className="mb-2 flex items-center gap-2 font-medium">
            <Sparkles className="h-3.5 w-3.5" /> Cross-chain hotspots
          </div>
          <div className="flex flex-wrap gap-2">
            {hotspots.map((entry) => (
              <WidgetButton
                key={entry.chainId}
                variant="secondary"
                onClick={() => {
                  if (onInsertQuickPrompt) {
                    const prompt = `Bridge funds to ${entry.name} so I can trade the trending opportunities Sherpa surfaced.`
                    onInsertQuickPrompt(prompt)
                  }
                }}
                disabled={!onInsertQuickPrompt}
                className="border-primary-200 bg-white/70 text-primary-900 hover:bg-white"
              >
                <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{entry.name}</span>
                <span className="text-[11px] text-primary-700">{entry.count} tokens</span>
              </WidgetButton>
            ))}
          </div>
        </WidgetSection>
      )}
      <div className="space-y-3">
        {tokens.map((token) => {
          const chainName = getChainName(token.chain_id)
          const price = formatUsd(token.price_usd)
          const change = formatChange(token.change_24h)
          const changeToneClass = change && change.startsWith('+') ? POSITIVE_ACCENT : NEGATIVE_ACCENT
          const volume = formatUsd(token.volume_24h, { maximumFractionDigits: 0 })
          const contract = token.contract_address && token.contract_address.startsWith('0x')
            ? truncateAddress(token.contract_address, 6)
            : null
          const swapPrompt = (() => {
            const base = chainName
              ? `Grab a Relay swap quote to buy ${token.symbol?.toUpperCase() || token.name} on ${chainName}.`
              : `Grab a Relay swap quote for ${token.symbol?.toUpperCase() || token.name}.`
            if (token.contract_address) {
              return `${base} Use contract ${token.contract_address}.`
            }
            return base
          })()
          const bridgePrompt = chainName
            ? `Bridge funds to ${chainName} so I can rotate into ${token.symbol?.toUpperCase() || token.name}.`
            : `Bridge where needed so I can trade ${token.symbol?.toUpperCase() || token.name}.`

          return (
            <WidgetSection
              key={token.id || `${token.symbol}-${token.chain_id || 'unknown'}`}
              shadow
              className={`${compact ? 'space-y-2' : ''}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">{token.name || token.symbol}</div>
                  <div className="text-xs text-slate-500 flex items-center gap-2">
                    <span>{String(token.symbol || '').toUpperCase()}</span>
                    {chainName && <span>• {chainName}</span>}
                    {contract && <span className="text-slate-400">{contract}</span>}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-slate-900">{price}</div>
                  {change && (
                    <div className={`text-xs font-semibold ${changeToneClass}`}>{change}</div>
                  )}
                </div>
              </div>
              <div className="mt-2 text-xs text-slate-500 flex flex-wrap items-center gap-3">
                {volume !== '—' && <span>24h vol {volume}</span>}
                {typeof token.market_cap === 'number' && !Number.isNaN(token.market_cap) && (
                  <span>MCap {formatUsd(token.market_cap, { maximumFractionDigits: 0 })}</span>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <WidgetButton
                  onClick={() => onInsertQuickPrompt && onInsertQuickPrompt(swapPrompt)}
                  disabled={!onInsertQuickPrompt}
                >
                  <Repeat className="h-3.5 w-3.5" />Ask for swap quote
                </WidgetButton>
                <WidgetButton
                  variant="secondary"
                  onClick={() => onInsertQuickPrompt && onInsertQuickPrompt(bridgePrompt)}
                  disabled={!onInsertQuickPrompt}
                >
                  <ArrowLeftRight className="h-3.5 w-3.5" />Plan bridge
                </WidgetButton>
              </div>
            </WidgetSection>
          )
        })}
      </div>
    </div>
  )
}

export function TrendingTokensBanner({
  tokens,
  fetchedAt,
  onInsertQuickPrompt,
  onViewAll,
  error,
}: {
  tokens: TrendingToken[]
  fetchedAt?: string
  onInsertQuickPrompt?: (prompt: string) => void
  onViewAll?: () => void
  error?: string
}) {
  if (error && tokens.length === 0) {
    return <ErrorView message={error} />
  }

  const formatChange = (value: number | null | undefined) => {
    if (typeof value !== 'number' || Number.isNaN(value)) return null
    const sign = value >= 0 ? '+' : ''
    return `${sign}${value.toFixed(2)}%`
  }

  const top = tokens.slice(0, 3)

  const buildSwapPrompt = (token: TrendingToken) => {
    const chainName = getChainName(token.chain_id)
    const base = chainName
      ? `Grab a Relay swap quote to buy ${token.symbol?.toUpperCase() || token.name} on ${chainName}.`
      : `Grab a Relay swap quote for ${token.symbol?.toUpperCase() || token.name}.`
    if (token.contract_address) {
      return `${base} Use contract ${token.contract_address}.`
    }
    return base
  }

  if (!top.length) {
    return (
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1e66f5] via-[#36a2f5] to-[#9fd7ff] p-5 text-white shadow-xl">
        <div className="pointer-events-none absolute inset-0 rounded-[inherit] border border-white/20" />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.24em] text-white/80">Trending signals</div>
            <div className="text-lg font-semibold">No active tokens right now</div>
          </div>
          {onViewAll && (
            <WidgetButton
              variant="secondary"
              onClick={onViewAll}
              className="border-white/30 bg-white/90 px-4 py-2 text-[#0e4a88] hover:bg-white"
            >
              Ask Sherpa
            </WidgetButton>
          )}
        </div>
        <div className="relative mt-3 text-sm text-white/85">
          Prompt Sherpa for a fresh scan to surface new opportunities.
        </div>
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1e66f5] via-[#36a2f5] to-[#9fd7ff] p-5 text-white shadow-xl">
      <div className="pointer-events-none absolute inset-0 rounded-[inherit] border border-white/20" />
      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.24em] text-white/80">Trending right now</div>
          <div className="text-xl font-semibold leading-tight">Relay-ready tokens</div>
          {fetchedAt && (
            <div className="text-[11px] text-white/80">Updated {formatRelativeTime(fetchedAt)}</div>
          )}
        </div>
        <WidgetButton
          variant="secondary"
          onClick={onViewAll}
          disabled={!onViewAll}
          className="border-white/30 bg-white/90 px-4 py-2 text-[#0e4a88] hover:bg-white disabled:opacity-60"
        >
          View feed
        </WidgetButton>
      </div>
      <div className="relative mt-4 flex flex-wrap gap-2">
        {top.map((token) => {
          const change = formatChange(token.change_24h)
          const prompt = buildSwapPrompt(token)
          const changeToneClass = change && change.startsWith('+') ? POSITIVE_ACCENT : NEGATIVE_ACCENT
          return (
            <WidgetButton
              key={`${token.id || token.symbol}-${token.chain_id || 'na'}`}
              variant="ghost"
              onClick={() => onInsertQuickPrompt && onInsertQuickPrompt(prompt)}
              disabled={!onInsertQuickPrompt}
              className="border-white/50 bg-white/15 px-4 py-2 text-white backdrop-blur-sm hover:bg-white/20 disabled:cursor-not-allowed"
            >
              <span className="font-semibold tracking-wide text-white">{token.symbol?.toUpperCase() || token.name}</span>
              {change && <span className={`text-[11px] font-semibold ${changeToneClass}`}>{change}</span>}
            </WidgetButton>
          )
        })}
      </div>
    </div>
  )
}

type TrendingTokensWidgetProps = {
  limit?: number
  autoRefreshMs?: number
  onInsertQuickPrompt?: (prompt: string) => void
  className?: string
}

export function TrendingTokensWidget({
  limit = 6,
  autoRefreshMs = 60_000,
  onInsertQuickPrompt,
  className = '',
}: TrendingTokensWidgetProps) {
  const [tokens, setTokens] = React.useState<TrendingToken[]>([])
  const [status, setStatus] = React.useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [error, setError] = React.useState<string | null>(null)
  const [fetchedAt, setFetchedAt] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    setStatus((prev) => (prev === 'ready' ? prev : 'loading'))
    setError(null)
    try {
      const data = await getTrendingTokens(limit)
      setTokens(data)
      setFetchedAt(new Date().toISOString())
      setStatus('ready')
    } catch (err: any) {
      setError(err?.message || 'Unable to load trending tokens.')
      setStatus('error')
    }
  }, [limit])

  React.useEffect(() => {
    let cancelled = false
    const loadInitial = async () => {
      setStatus('loading')
      try {
        const data = await getTrendingTokens(limit)
        if (cancelled) return
        setTokens(data)
        setFetchedAt(new Date().toISOString())
        setStatus('ready')
      } catch (err: any) {
        if (cancelled) return
        setError(err?.message || 'Unable to load trending tokens.')
        setStatus('error')
      }
    }
    loadInitial().catch(() => {})

    if (!autoRefreshMs) {
      return () => {
        cancelled = true
      }
    }
    const timer = window.setInterval(() => {
      load().catch(() => {})
    }, autoRefreshMs)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [autoRefreshMs, limit, load])

  const showSkeleton = status === 'loading' && tokens.length === 0

  return (
    <WidgetCard className={`${className}`}>
      <WidgetHeader
        title="Trending Tokens"
        subtitle="Relay-ready ideas surfaced by Sherpa"
        actions={
          <WidgetButton
            variant="ghost"
            size="sm"
            onClick={() => load().catch(() => {})}
            title="Refresh"
            aria-label="Refresh trending tokens"
          >
            <Repeat className="h-4 w-4" />
          </WidgetButton>
        }
      />
      <div className="mt-3">
        {showSkeleton ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, idx) => (
              <div key={idx} className="h-16 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : (
          <TrendingTokensList
            tokens={tokens}
            fetchedAt={fetchedAt || undefined}
            error={error || undefined}
            onInsertQuickPrompt={onInsertQuickPrompt}
            showHotspots={!autoRefreshMs || autoRefreshMs >= 30_000}
            limitHotspots={2}
            compact
          />
        )}
        {status === 'error' && error && (
          <div className="mt-2 text-xs text-rose-600">{error}</div>
        )}
      </div>
    </WidgetCard>
  )
}
