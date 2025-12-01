import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createChart, ColorType, type IChartApi, type ISeriesApi, type UTCTimestamp } from 'lightweight-charts'

import {
  getTokenChart,
  type TokenCandle,
  type TokenChartParams,
  type TokenChartPoint,
  type TokenChartResponse,
  type TokenChartStats,
} from '../../services/prices'
import { ErrorView } from '../ErrorView'
import { readThemeTokens, withAlpha, type ThemeTokens } from '../../utils/theme'

const RANGE_OPTIONS: Array<TokenChartParams['range']> = ['1d', '7d', '30d', '90d', '180d', '365d', 'max']

type TokenPriceChartProps = {
  coinId?: string
  symbol?: string
  address?: string
  chain?: string
  vsCurrency?: string
  includeCandles?: boolean
  initialRange?: TokenChartParams['range']
  initialData?: TokenChartResponse | null
  onRangeChange?: (range: TokenChartParams['range']) => void
}

type CandleDatum = TokenCandle & { time: UTCTimestamp }

type LineDatum = { time: UTCTimestamp; value: number }

type VolumeDatum = { time: UTCTimestamp; value: number; color?: string }

function toSeconds(timestamp: number | undefined | null): UTCTimestamp | undefined {
  if (!timestamp) return undefined
  return Math.floor(timestamp / 1000) as UTCTimestamp
}

function formatCurrency(value: number | undefined | null, currency: string = 'usd'): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—'
  return value.toLocaleString(undefined, {
    style: 'currency',
    currency: currency.toUpperCase(),
    maximumFractionDigits: value >= 1 ? 2 : 4,
  })
}

function formatPercent(value: number | undefined | null): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—'
  const sign = value > 0 ? '+' : value < 0 ? '' : ''
  return `${sign}${value.toFixed(2)}%`
}

function classifyChange(value: number | undefined | null): 'up' | 'down' | 'flat' {
  if (typeof value !== 'number' || Number.isNaN(value)) return 'flat'
  if (value > 0) return 'up'
  if (value < 0) return 'down'
  return 'flat'
}

function buildLineSeries(prices: TokenChartPoint[] | undefined): LineDatum[] {
  if (!Array.isArray(prices)) return []
  return prices
    .map((point) => {
      if (!point) return null
      if (typeof point.time !== 'number' || typeof point.price !== 'number') return null
      const time = toSeconds(point.time)
      if (!time) return null
      return { time, value: point.price }
    })
    .filter((entry): entry is LineDatum => entry !== null && Number.isFinite(entry.value))
}

function buildCandleSeries(candles: TokenCandle[] | undefined): CandleDatum[] {
  if (!Array.isArray(candles)) return []
  return candles
    .map((candle) => {
      if (!candle) return null
      const time = toSeconds(candle.time)
      if (!time) return null
      if (![candle.open, candle.high, candle.low, candle.close].every((val) => typeof val === 'number' && Number.isFinite(val))) {
        return null
      }
      return { ...candle, time }
    })
    .filter((entry): entry is CandleDatum => Boolean(entry))
}

function buildVolumeSeries(totalVolumes: { time: number; volume: number }[] | undefined): VolumeDatum[] {
  if (!Array.isArray(totalVolumes)) return []
  const volumes = totalVolumes
    .map((entry) => {
      if (!entry) return null
      const time = toSeconds(entry.time)
      if (!time) return null
      const value = Number(entry.volume)
      if (!Number.isFinite(value)) return null
      return { time, value }
    })
    .filter((entry): entry is VolumeDatum => Boolean(entry))
  if (!volumes.length) return volumes
  const maxVolume = Math.max(...volumes.map((entry) => entry.value)) || 1
  // Scale volumes to billions for display readability
  return volumes.map((entry) => ({
    ...entry,
    value: entry.value / 1_000_000_000,
    color: entry.value / maxVolume > 0.5 ? 'rgba(37, 99, 235, 0.6)' : 'rgba(37, 99, 235, 0.35)',
  }))
}

export function TokenPriceChart({
  coinId,
  symbol,
  address,
  chain = 'ethereum',
  vsCurrency = 'usd',
  includeCandles = true,
  initialRange = '7d',
  initialData = null,
  onRangeChange,
}: TokenPriceChartProps) {
  const [range, setRange] = useState<TokenChartParams['range']>(initialRange)
  const [data, setData] = useState<TokenChartResponse | null>(initialData)
  const [loading, setLoading] = useState<boolean>(!initialData)
  const [error, setError] = useState<string | null>(null)
  const [theme, setTheme] = useState<ThemeTokens>(() => readThemeTokens())

  const containerRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const areaSeriesRef = useRef<ISeriesApi<'Area'> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  const skipFetchRef = useRef<boolean>(Boolean(initialData))

  const lineData = useMemo(() => buildLineSeries(data?.series?.prices), [data?.series?.prices])
  const candleData = useMemo(() => buildCandleSeries(data?.candles), [data?.candles])
  const volumeData = useMemo(() => buildVolumeSeries(data?.series?.total_volumes), [data?.series?.total_volumes])

  const stats: TokenChartStats | null = data?.stats ?? null
  const metadata = data?.metadata ?? {}

  const latestPrice = stats?.latest ?? lineData[lineData.length - 1]?.value
  const changeAbs = stats?.change_abs ?? (latestPrice && lineData.length ? latestPrice - lineData[0].value : undefined)
  const changePct = stats?.change_pct ?? (changeAbs && lineData.length ? (changeAbs / lineData[0].value) * 100 : undefined)
  const changeClass = classifyChange(changePct)

  const chartBackground = theme.surface
  const chartTextColor = theme.text
  const chartMutedColor = theme.textMuted || '#94a3b8'
  const borderColor = withAlpha(theme.line, 0.8)
  const softBorderColor = withAlpha(theme.line, 0.4)
  const gridColor = withAlpha(theme.line, 0.35)
  const gridSubtleColor = withAlpha(theme.line, 0.2)
  const accentColor = theme.accent || '#3b82f6'
  const positiveColor = theme.success || '#22c55e'
  const negativeColor = theme.danger || '#f87171'
  const areaTopColor = withAlpha(accentColor, 0.35)
  const areaBottomColor = withAlpha(accentColor, 0.06)
  const histogramColor = withAlpha(accentColor, 0.35)
  const histogramBorder = withAlpha(theme.line, 0.2)
  const surfaceElevated = theme.surfaceElevated || theme.surface

  const formattedUpdatedAt = useMemo(() => {
    const ts = stats?.range_end ?? data?.series?.prices?.[data.series.prices.length - 1]?.time
    if (!ts) return null
    try {
      return new Date(ts).toLocaleString()
    } catch {
      return null
    }
  }, [data?.series?.prices, stats?.range_end])

  useEffect(() => {
    if (initialData) {
      setData(initialData)
      setLoading(false)
      skipFetchRef.current = true
    }
  }, [initialData])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const updateTheme = () => setTheme(readThemeTokens())
    updateTheme()
    const observer = new MutationObserver(updateTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style'] })
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const mediaListener = () => updateTheme()
    if (media?.addEventListener) {
      media.addEventListener('change', mediaListener)
    }
    return () => {
      observer.disconnect()
      if (media?.removeEventListener) media.removeEventListener('change', mediaListener)
    }
  }, [])

  useEffect(() => {
    if (!coinId && !symbol && !address) return

    if (skipFetchRef.current) {
      skipFetchRef.current = false
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    getTokenChart({
      coinId,
      symbol,
      address,
      chain,
      range,
      vsCurrency,
      includeCandles,
    })
      .then((response) => {
        if (cancelled) return
        if (response) {
          setData(response)
        } else {
          setError('Chart data is unavailable right now.')
        }
      })
      .catch((err: any) => {
        if (cancelled) return
        setError(err?.message || 'Failed to load chart data.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [address, chain, coinId, includeCandles, range, symbol, vsCurrency])

  useEffect(() => {
    if (!containerRef.current) return
    if (chartRef.current) {
      const existing = chartRef.current
      if (typeof (existing as any).remove === 'function') {
        ;(existing as any).remove()
      }
      chartRef.current = null
    }

    const chart = createChart(containerRef.current, {
      height: 360,
      layout: {
        background: { type: ColorType.Solid, color: chartBackground },
        textColor: chartTextColor,
      },
      grid: {
        horzLines: { color: gridColor },
        vertLines: { color: gridSubtleColor },
      },
      rightPriceScale: {
        borderColor: borderColor,
        scaleMargins: { top: 0.1, bottom: 0.2 },
      },
      timeScale: {
        borderColor: borderColor,
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        mode: 1,
      },
    })

    chartRef.current = chart

    const candleSeries = chart.addCandlestickSeries({
      priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
      upColor: positiveColor,
      downColor: negativeColor,
      borderDownColor: negativeColor,
      borderUpColor: positiveColor,
      wickDownColor: negativeColor,
      wickUpColor: positiveColor,
    })
    candleSeriesRef.current = candleSeries

    const areaSeries = chart.addAreaSeries({
      lineColor: accentColor,
      topColor: areaTopColor,
      bottomColor: areaBottomColor,
    })
    areaSeriesRef.current = areaSeries

    const volumeSeries = chart.addHistogramSeries({
      color: histogramColor,
      priceFormat: { type: 'volume', minMove: 0.01 },
      priceScaleId: 'vol',
    })
    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.75, bottom: 0 },
      borderColor: histogramBorder,
    })
    volumeSeriesRef.current = volumeSeries

    const ro = new ResizeObserver((entries) => {
      if (!chartRef.current) return
      for (const entry of entries) {
        if (entry.target === containerRef.current && entry.contentRect.width > 0) {
          chartRef.current.applyOptions({ width: entry.contentRect.width })
        }
      }
    })
    ro.observe(containerRef.current)

    return () => {
      ro.disconnect()
      if (chartRef.current) {
        const chart = chartRef.current
        if (typeof (chart as any)?.remove === 'function') {
          ;(chart as any).remove()
        }
        chartRef.current = null
      }
      candleSeriesRef.current = null
      areaSeriesRef.current = null
      volumeSeriesRef.current = null
    }
  }, [chartBackground, chartTextColor, gridColor, gridSubtleColor, borderColor, accentColor, areaTopColor, areaBottomColor, positiveColor, negativeColor, histogramColor, histogramBorder])

  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return

    if (candleData.length > 0 && candleSeriesRef.current) {
      candleSeriesRef.current.setData(candleData)
      candleSeriesRef.current.applyOptions({ visible: true })
      areaSeriesRef.current?.applyOptions({ visible: false })
    } else {
      areaSeriesRef.current?.applyOptions({ visible: true })
      areaSeriesRef.current?.setData(lineData)
      candleSeriesRef.current?.applyOptions({ visible: false })
    }

    if (areaSeriesRef.current && candleData.length > 0) {
      areaSeriesRef.current.setData(lineData)
    }

    if (volumeSeriesRef.current) {
      volumeSeriesRef.current.setData(volumeData)
    }

    if ((candleData.length > 0 || lineData.length > 0) && chart.timeScale()) {
      chart.timeScale().fitContent()
    }
  }, [candleData, lineData, volumeData])

  const handleRangeChange = (nextRange: TokenChartParams['range']) => {
    if (range === nextRange) return
    setRange(nextRange)
    onRangeChange?.(nextRange)
  }

  if (error) {
    return <ErrorView message={error} />
  }

  return (
    <div className="w-full space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs uppercase tracking-wide" style={{ color: chartMutedColor }}>
            {metadata?.name || metadata?.symbol || coinId || 'Token'}
          </div>
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-3xl font-semibold" style={{ color: chartTextColor }}>
              {formatCurrency(latestPrice, vsCurrency)}
            </span>
            <span
              className={`text-base font-semibold ${
                changeClass === 'up' ? 'text-emerald-500' : changeClass === 'down' ? 'text-rose-500' : 'text-slate-400'
              }`}
            >
              {formatPercent(changePct)}
            </span>
          </div>
          {changeAbs !== undefined && (
            <div className="text-sm" style={{ color: chartMutedColor }}>
              {formatCurrency(changeAbs, vsCurrency)} since {range?.toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 text-xs" style={{ color: chartMutedColor }}>
          <div>Updated {formattedUpdatedAt || '—'}</div>
          <div>Source · <a href="https://www.coingecko.com" target="_blank" rel="noreferrer" className="underline" style={{ color: accentColor }}>CoinGecko</a></div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className="flex flex-wrap items-center gap-2 rounded-2xl px-2 py-1"
          style={{ backgroundColor: withAlpha(theme.line, 0.2), border: `1px solid ${withAlpha(theme.line, 0.3)}` }}
        >
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => handleRangeChange(option)}
              disabled={loading && option === range}
              className="rounded-lg px-3 py-1 text-xs font-semibold transition"
              style={
                option === range
                  ? {
                      backgroundColor: accentColor,
                      color: '#ffffff',
                      boxShadow: '0 6px 12px rgba(0,0,0,0.18)',
                    }
                  : {
                      color: chartMutedColor,
                      backgroundColor: 'transparent',
                    }
              }
            >
              {option?.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <div
            className="relative h-[320px] w-full overflow-hidden rounded-3xl"
            style={{ backgroundColor: surfaceElevated, border: `1px solid ${borderColor}` }}
          >
            {loading && (
              <div
                className="absolute inset-0 z-10 flex items-center justify-center"
                style={{ backgroundColor: withAlpha(theme.background, 0.8) }}
              >
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" aria-hidden="true" />
              </div>
            )}
            <div ref={containerRef} className="h-full w-full" />
          </div>
        </div>
        <div className="space-y-3 lg:col-span-4">
          <div
            className="rounded-2xl p-4"
            style={{ backgroundColor: withAlpha(surfaceElevated, 0.9), border: `1px solid ${softBorderColor}` }}
          >
            <div className="text-[11px] uppercase tracking-wide" style={{ color: chartMutedColor }}>
              High / Low (range)
            </div>
            <div className="text-lg font-semibold" style={{ color: chartTextColor }}>
              {formatCurrency(stats?.high, vsCurrency)}
            </div>
            <div className="text-sm" style={{ color: chartMutedColor }}>
              {formatCurrency(stats?.low, vsCurrency)}
            </div>
          </div>
          <div
            className="rounded-2xl p-4"
            style={{ backgroundColor: withAlpha(surfaceElevated, 0.9), border: `1px solid ${softBorderColor}` }}
          >
            <div className="text-[11px] uppercase tracking-wide" style={{ color: chartMutedColor }}>
              Open / Close
            </div>
            <div className="text-lg font-semibold" style={{ color: chartTextColor }}>
              {formatCurrency(stats?.open, vsCurrency)}
            </div>
            <div className="text-sm" style={{ color: chartMutedColor }}>
              {formatCurrency(stats?.close, vsCurrency)}
            </div>
          </div>
          <div
            className="rounded-2xl p-4"
            style={{ backgroundColor: withAlpha(surfaceElevated, 0.9), border: `1px solid ${softBorderColor}` }}
          >
            <div className="text-[11px] uppercase tracking-wide" style={{ color: chartMutedColor }}>
              Candles (OHLC)
            </div>
            <div className="text-lg font-semibold" style={{ color: chartTextColor }}>
              {candleData.length ? `${candleData.length} samples` : '—'}
            </div>
            <div className="text-sm" style={{ color: chartMutedColor }}>
              Interval {data?.interval || 'n/a'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TokenPriceChart
