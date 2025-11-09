import React from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import type { Widget } from '../../types/widgets'
import { TOKEN_PRICE_WIDGET_ID } from '../../constants/widgets'
import type { TVLPoint } from '../../services/defi'
import { getUniswapTVL } from '../../services/defi'
import TokenPriceChart from '../charts/TokenPriceChart'
import type { TokenChartParams, TokenChartResponse } from '../../services/prices'

function isTokenChartPayload(payload: any): payload is Partial<TokenChartResponse> {
  if (!payload || typeof payload !== 'object') return false
  const series = payload.series
  if (!series || typeof series !== 'object') return false
  if (!Array.isArray(series.prices)) return false
  if (!series.prices.length) return false
  if (!Array.isArray(payload.candles)) return false
  if (typeof payload.coin_id !== 'string' && typeof payload.metadata?.symbol !== 'string') return false
  return true
}

function normalizeChartPoints(payload: any): TVLPoint[] {
  if (!payload) return []
  if (Array.isArray(payload.points)) return payload.points as TVLPoint[]
  if (Array.isArray(payload.series)) {
    const values: number[] = payload.series
    const now = Date.now()
    const step = 24 * 60 * 60 * 1000
    const start = now - (values.length - 1) * step
    return values.map((value, index) => ({ time: start + index * step, tvl: value }))
  }
  if (Array.isArray(payload.timestamps) && Array.isArray(payload.tvl) && payload.timestamps.length === payload.tvl.length) {
    return (payload.tvl as number[]).map((value: number, index: number) => ({ time: payload.timestamps[index], tvl: value }))
  }
  return []
}

function formatDateShort(timestamp: number): string {
  try {
    return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  } catch {
    return ''
  }
}

function formatCompact(value: number, unit?: string, withUnit: boolean = true): string {
  if (!Number.isFinite(value)) return ''
  const abs = Math.abs(value)
  let num = value
  let suffix = ''
  if (abs >= 1_000_000_000) {
    num = value / 1_000_000_000
    suffix = 'B'
  } else if (abs >= 1_000_000) {
    num = value / 1_000_000
    suffix = 'M'
  } else if (abs >= 1_000) {
    num = value / 1_000
    suffix = 'K'
  }
  const base = num.toFixed(num < 10 ? 2 : 1)
  const formattedUnit = unit ? ` ${unit}` : ''
  return withUnit ? `${base}${suffix}${formattedUnit}` : `${base}${suffix}`
}

const TEMPLATE_BAR_HEIGHTS = [32, 44, 28, 56, 40, 68, 50, 74, 58, 62, 48, 66, 54, 70]

function isTokenChartTemplate(payload: any): boolean {
  return Boolean(payload && typeof payload === 'object' && payload.template === TOKEN_PRICE_WIDGET_ID)
}

function TokenPriceChartTemplate() {
  return (
    <div className="w-full space-y-6">
      <div className="space-y-1">
        <div className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>
          Token price workspace
        </div>
        <div className="text-2xl font-semibold" style={{ color: 'var(--text)' }}>
          Preload any coin chart
        </div>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Ask Sherpa “Show me the ETH price chart” or drop a contract address to hydrate this panel with live candles, stats, and sources.
        </p>
      </div>

      <div
        className="rounded-[28px] border border-dashed p-6"
        style={{ borderColor: 'var(--line)', background: 'var(--surface-2)' }}
      >
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-8">
            <div className="flex flex-wrap items-center justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
              <span>Price action preview</span>
              <span>1D · 7D · 30D · 90D</span>
            </div>
            <div
              className="flex h-64 items-end gap-2 rounded-2xl border px-4 py-6"
              style={{
                borderColor: 'var(--line)',
                background: 'linear-gradient(180deg, rgba(90,164,255,0.12) 0%, rgba(19,26,34,0.8) 100%)',
              }}
            >
              {TEMPLATE_BAR_HEIGHTS.map((height, index) => (
                <span
                  key={`chart-placeholder-${index}`}
                  className="flex-1 rounded-full"
                  style={{
                    height: `${height}%`,
                    background: 'linear-gradient(180deg, rgba(90,164,255,0.85) 0%, rgba(90,164,255,0.15) 100%)',
                    opacity: 0.9 - index * 0.02,
                  }}
                />
              ))}
            </div>
          </div>
          <div className="space-y-3 lg:col-span-4">
            {[
              { title: 'High / Low (range)', body: '— / —' },
              { title: 'Open / Close', body: '— / —' },
              { title: 'Candles (OHLC)', body: 'Waiting for samples' },
            ].map((card) => (
              <div
                key={card.title}
                className="rounded-2xl border border-dashed p-4"
                style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}
              >
                <div className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                  {card.title}
                </div>
                <div className="mt-1 text-lg font-semibold" style={{ color: 'var(--text)' }}>
                  {card.body}
                </div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Fills automatically once a token is requested.
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
        <span>Try prompts:</span>
        {['Show me the ETH price chart', 'Chart SOL over 30d', 'Plot BTC candles (1d)'].map((chip) => (
          <span
            key={chip}
            className="rounded-full border px-3 py-1"
            style={{ borderColor: 'var(--line)', background: 'var(--surface-2)', color: 'var(--text)' }}
          >
            {chip}
          </span>
        ))}
      </div>
    </div>
  )
}

function ChartPanelComponent({ widget }: { widget: Widget }) {
  const payload = widget.payload

  if (isTokenChartTemplate(payload)) {
    return <TokenPriceChartTemplate />
  }

  if (isTokenChartPayload(payload)) {
    const initialData: TokenChartResponse = {
      success: payload.success ?? true,
      metadata: payload.metadata ?? {},
      coin_id: payload.coin_id ?? payload.metadata?.id ?? '',
      range: payload.range ?? '7d',
      vs_currency: payload.vs_currency ?? 'usd',
      series: payload.series as TokenChartResponse['series'],
      candles: payload.candles ?? [],
      stats: payload.stats ?? {},
      sources: payload.sources ?? [],
      interval: payload.interval ?? null,
      cached: payload.cached ?? false,
    }

    return (
      <TokenPriceChart
        coinId={payload.coin_id}
        symbol={payload.metadata?.symbol ?? payload.symbol}
        address={payload.metadata?.contract_address ?? payload.contract_address}
        chain={payload.metadata?.chain ?? payload.chain ?? 'ethereum'}
        vsCurrency={initialData.vs_currency}
        initialRange={initialData.range as TokenChartParams['range']}
        initialData={initialData}
      />
    )
  }

  return <ProtocolChartPanel widget={widget} payload={payload} />
}

function ProtocolChartPanel({ widget, payload }: { widget: Widget; payload: any }) {
  const [range, setRange] = React.useState<'7d' | '30d'>('7d')
  const [points, setPoints] = React.useState<TVLPoint[]>(normalizeChartPoints(payload))
  const unit = payload?.unit
  const current: TVLPoint | undefined = payload?.current

  React.useEffect(() => {
    setPoints(normalizeChartPoints(payload))
  }, [payload])

  const loadingRef = React.useRef(false)

  const load = React.useCallback(
    async (nextRange: '7d' | '30d') => {
      if (loadingRef.current) return
      loadingRef.current = true
      try {
        const data = await getUniswapTVL(nextRange)
        if (data) setPoints(data)
      } finally {
        loadingRef.current = false
      }
    },
    [],
  )

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
          {(['7d', '30d'] as const).map((currentRange) => (
            <button
              key={currentRange}
              onClick={() => {
                setRange(currentRange)
                if (widget.id === 'uniswap_tvl_chart') void load(currentRange)
              }}
              className={`px-2 py-1 text-xs ${
                range === currentRange ? 'bg-primary-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'
              }`}
              aria-pressed={range === currentRange}
            >
              {currentRange}
            </button>
          ))}
        </div>
      </div>
      <div className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorTvl" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(15, 23, 42, 0.08)" />
            <XAxis dataKey="time" tickFormatter={formatDateShort} stroke="rgba(15,23,42,0.4)" fontSize={12} />
            <YAxis stroke="rgba(15,23,42,0.4)" fontSize={12} tickFormatter={(value) => formatCompact(value, unit, false)} />
            <Tooltip
              formatter={(value: number) => formatCompact(value, unit)}
              labelFormatter={(label: number) => new Date(label).toLocaleString()}
            />
            <Area type="monotone" dataKey="tvl" stroke="#2563eb" fillOpacity={1} fill="url(#colorTvl)" />
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

export const ChartPanel = React.memo(ChartPanelComponent)

ChartPanel.displayName = 'ChartPanel'

export default ChartPanel
