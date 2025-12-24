import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { createChart, ColorType, type IChartApi, type ISeriesApi, type UTCTimestamp } from 'lightweight-charts'
import { Settings2, Maximize2 } from 'lucide-react'

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
import { TokenSelector, type TokenOption } from './TokenSelector'

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
  showSelector?: boolean
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
  const sign = value > 0 ? '+' : ''
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
  return volumes.map((entry) => ({
    ...entry,
    value: entry.value / 1_000_000_000,
    color: entry.value / maxVolume > 0.5 ? 'rgba(37, 99, 235, 0.6)' : 'rgba(37, 99, 235, 0.35)',
  }))
}

export function TokenPriceChart({
  coinId: initialCoinId,
  symbol: initialSymbol,
  address,
  chain = 'ethereum',
  vsCurrency = 'usd',
  includeCandles = true,
  initialRange = '7d',
  initialData = null,
  onRangeChange,
  showSelector = false,
}: TokenPriceChartProps) {
  const [selectedToken, setSelectedToken] = useState<TokenOption | null>(() => {
    if (initialCoinId || initialSymbol) {
      return {
        id: initialCoinId || '',
        symbol: initialSymbol || '',
        name: initialSymbol || initialCoinId || '',
      }
    }
    return null
  })

  const coinId = selectedToken?.id || initialCoinId
  const symbol = selectedToken?.symbol || initialSymbol

  const [range, setRange] = useState<TokenChartParams['range']>(initialRange)
  const [data, setData] = useState<TokenChartResponse | null>(initialData)
  const [loading, setLoading] = useState<boolean>(!initialData)
  const [error, setError] = useState<string | null>(null)
  const [theme, setTheme] = useState<ThemeTokens>(() => readThemeTokens())

  const handleTokenSelect = useCallback((token: TokenOption) => {
    setSelectedToken(token)
    setData(null)
    setLoading(true)
    setError(null)
  }, [])

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

  // Theme colors
  const chartTextColor = theme.text
  const chartMutedColor = theme.textMuted || '#94a3b8'
  const borderColor = withAlpha(theme.line, 0.6)
  const gridColor = withAlpha(theme.line, 0.25)
  const gridSubtleColor = withAlpha(theme.line, 0.12)
  const accentColor = theme.accent || '#3b82f6'
  const positiveColor = theme.success || '#22c55e'
  const negativeColor = theme.danger || '#ef4444'
  const areaTopColor = withAlpha(accentColor, 0.25)
  const areaBottomColor = withAlpha(accentColor, 0.02)
  const histogramColor = withAlpha(accentColor, 0.4)
  const histogramBorder = withAlpha(theme.line, 0.2)
  const surfaceElevated = theme.surfaceElevated || theme.surface

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

  // Chart creation
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
      height: 400,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: chartMutedColor,
        fontFamily: 'inherit',
      },
      grid: {
        horzLines: { color: gridColor, visible: true },
        vertLines: { color: gridSubtleColor, visible: true },
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.08, bottom: 0.15 },
      },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        mode: 1,
        horzLine: { color: chartMutedColor, labelBackgroundColor: surfaceElevated },
        vertLine: { color: chartMutedColor, labelBackgroundColor: surfaceElevated },
      },
      handleScale: { axisPressedMouseMove: true },
      handleScroll: { vertTouchDrag: false },
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
      lineWidth: 2,
      topColor: areaTopColor,
      bottomColor: areaBottomColor,
      crosshairMarkerRadius: 4,
    })
    areaSeriesRef.current = areaSeries

    const volumeSeries = chart.addHistogramSeries({
      color: histogramColor,
      priceFormat: { type: 'volume', minMove: 0.01 },
      priceScaleId: 'vol',
    })
    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
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
  }, [chartMutedColor, gridColor, gridSubtleColor, accentColor, areaTopColor, areaBottomColor, positiveColor, negativeColor, histogramColor, histogramBorder, surfaceElevated])

  // Data updates
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
    return (
      <div
        className="rounded-2xl border p-6"
        style={{ borderColor: borderColor, background: surfaceElevated }}
      >
        {showSelector && (
          <div className="mb-4">
            <TokenSelector selectedToken={selectedToken} onSelectToken={handleTokenSelect} />
          </div>
        )}
        <ErrorView message={error} />
      </div>
    )
  }

  const tokenName = metadata?.name || selectedToken?.name || symbol || coinId || 'Token'

  return (
    <div
      className="relative overflow-hidden rounded-2xl border"
      style={{ borderColor: borderColor, background: surfaceElevated }}
    >
      {/* Header */}
      <div
        className="flex items-start justify-between gap-4 px-5 pt-5 pb-3"
      >
        <div className="min-w-0 flex-1">
          {/* Token selector + name */}
          <div className="flex items-center gap-2 mb-1">
            {showSelector && (
              <TokenSelector selectedToken={selectedToken} onSelectToken={handleTokenSelect} />
            )}
            <span className="text-base font-medium truncate" style={{ color: chartTextColor }}>
              {tokenName}
            </span>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-2.5">
            <span className="text-3xl font-semibold tracking-tight" style={{ color: chartTextColor }}>
              {formatCurrency(latestPrice, vsCurrency)}
            </span>
            <span
              className={`text-sm font-semibold ${
                changeClass === 'up' ? 'text-emerald-500' : changeClass === 'down' ? 'text-rose-500' : ''
              }`}
              style={changeClass === 'flat' ? { color: chartMutedColor } : undefined}
            >
              {formatPercent(changePct)}
            </span>
            {changeAbs !== undefined && (
              <span className="text-sm" style={{ color: chartMutedColor }}>
                ({formatCurrency(changeAbs, vsCurrency)})
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="p-2 rounded-lg transition hover:bg-[var(--hover)]"
            style={{ color: chartMutedColor }}
            aria-label="Chart settings"
          >
            <Settings2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="p-2 rounded-lg transition hover:bg-[var(--hover)]"
            style={{ color: chartMutedColor }}
            aria-label="Expand chart"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Chart container */}
      <div className="relative px-2">
        {loading && (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center"
            style={{ backgroundColor: withAlpha(surfaceElevated, 0.9) }}
          >
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: accentColor }} />
          </div>
        )}
        <div ref={containerRef} className="w-full" style={{ height: 400 }} />

        {/* Range selector - overlaid at bottom of chart */}
        <div className="absolute bottom-4 left-4 z-10">
          <div
            className="inline-flex items-center gap-0.5 rounded-lg p-1"
            style={{
              backgroundColor: withAlpha(surfaceElevated, 0.95),
              backdropFilter: 'blur(8px)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            {RANGE_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => handleRangeChange(option)}
                disabled={loading && option === range}
                className="rounded-md px-2.5 py-1 text-[11px] font-semibold transition"
                style={
                  option === range
                    ? {
                        backgroundColor: accentColor,
                        color: '#ffffff',
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
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-between gap-4 px-5 py-3 text-[11px] border-t"
        style={{ borderColor: withAlpha(theme.line, 0.3), color: chartMutedColor }}
      >
        <div className="flex items-center gap-4">
          <span>H: <strong style={{ color: chartTextColor }}>{formatCurrency(stats?.high, vsCurrency)}</strong></span>
          <span>L: <strong style={{ color: chartTextColor }}>{formatCurrency(stats?.low, vsCurrency)}</strong></span>
          <span>O: <strong style={{ color: chartTextColor }}>{formatCurrency(stats?.open, vsCurrency)}</strong></span>
          <span>C: <strong style={{ color: chartTextColor }}>{formatCurrency(stats?.close, vsCurrency)}</strong></span>
        </div>
        <a
          href="https://www.coingecko.com"
          target="_blank"
          rel="noreferrer"
          className="hover:underline"
          style={{ color: chartMutedColor }}
        >
          via CoinGecko
        </a>
      </div>
    </div>
  )
}

export default TokenPriceChart
