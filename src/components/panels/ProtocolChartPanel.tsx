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

export default function ProtocolChartPanel({ widget, payload }: { widget: Widget; payload: any }) {
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

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {(['7d', '30d'] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setRange(value)
              void load(value)
            }}
            className={`rounded-full border px-3 py-1 text-sm ${range === value ? 'bg-[var(--accent)] text-[var(--text-inverse)]' : ''}`}
            style={{ borderColor: 'var(--line)' }}
          >
            {value.toUpperCase()}
          </button>
        ))}
      </div>
      <div
        className="rounded-2xl border p-2"
        style={{ borderColor: 'var(--line)', background: 'var(--surface-2)' }}
      >
        <div style={{ width: '100%', height: 320 }}>
          <ResponsiveContainer>
            <AreaChart data={points}>
              <defs>
                <linearGradient id={`${widget.id}-tvl`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(90,164,255,0.9)" stopOpacity={1} />
                  <stop offset="100%" stopColor="rgba(90,164,255,0.05)" stopOpacity={1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.25)" />
              <XAxis dataKey="time" tickFormatter={formatDateShort} stroke="rgba(15,23,42,0.4)" fontSize={12} />
              <YAxis
                dataKey="tvl"
                tickFormatter={(value: number) => formatCompact(value, unit, false)}
                stroke="rgba(15,23,42,0.4)"
                fontSize={12}
              />
              <Tooltip
                cursor={{ stroke: 'rgba(90,164,255,0.24)' }}
                contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
                labelFormatter={(value: any) => formatDateShort(value as number)}
                formatter={(value: number) => [formatCompact(value, unit), 'TVL']}
              />
              <Area
                type="monotone"
                dataKey="tvl"
                stroke="rgba(90,164,255,0.9)"
                fill={`url(#${widget.id}-tvl)`}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      {current && (
        <div className="flex items-center gap-3 rounded-2xl border px-3 py-2 text-sm" style={{ borderColor: 'var(--line)', color: 'var(--text)' }}>
          <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Latest
          </span>
          <span className="font-semibold">
            {formatCompact(current.tvl, unit)}
          </span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {formatDateShort(current.time)}
          </span>
        </div>
      )}
    </div>
  )
}
