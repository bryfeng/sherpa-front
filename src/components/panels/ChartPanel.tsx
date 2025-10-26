import React from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import type { Widget } from '../../types/widgets'
import type { TVLPoint } from '../../services/defi'
import { getUniswapTVL } from '../../services/defi'

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

export function ChartPanel({ widget }: { widget: Widget }) {
  const [range, setRange] = React.useState<'7d' | '30d'>('7d')
  const [points, setPoints] = React.useState<TVLPoint[]>(normalizeChartPoints(widget.payload))
  const unit = widget.payload?.unit
  const current: TVLPoint | undefined = widget.payload?.current

  React.useEffect(() => {
    setPoints(normalizeChartPoints(widget.payload))
  }, [widget.payload])

  const loadingRef = React.useRef(false)

  async function load(nextRange: '7d' | '30d') {
    if (loadingRef.current) return
    loadingRef.current = true
    try {
      const data = await getUniswapTVL(nextRange)
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
