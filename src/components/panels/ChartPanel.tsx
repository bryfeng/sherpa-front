import React, { Suspense } from 'react'

import type { Widget } from '../../types/widgets'
import { TOKEN_PRICE_WIDGET_ID } from '../../constants/widgets'
import type { TokenChartParams, TokenChartResponse } from '../../services/prices'
import { ChartPlaceholder } from './ChartPlaceholder'
import TokenPriceChartTemplate from './TokenPriceChartTemplate'

const TokenPriceChart = React.lazy(() => import('../charts/TokenPriceChart'))
const ProtocolChartPanel = React.lazy(() => import('./ProtocolChartPanel'))

type TokenChartPayload = Partial<TokenChartResponse> & { symbol?: string }

function isTokenChartPayload(payload: any): payload is TokenChartPayload {
  if (!payload || typeof payload !== 'object') return false
  // Check if it has coin_id or a symbol - means it's a token chart request
  if (payload.coin_id || payload.symbol || payload.metadata?.symbol) {
    return true
  }
  const series = payload.series
  if (!series || typeof series !== 'object') return false
  if (!Array.isArray(series.prices)) return false
  if (!series.prices.length) return false
  if (!Array.isArray(payload.candles)) return false
  return true
}

function isTokenChartTemplate(payload: any): boolean {
  return Boolean(payload && typeof payload === 'object' && payload.template === TOKEN_PRICE_WIDGET_ID)
}

export default function ChartPanelComponent({ widget }: { widget: Widget }) {
  const payload = widget.payload

  if (isTokenChartTemplate(payload)) {
    return <TokenPriceChartTemplate />
  }

  if (isTokenChartPayload(payload)) {
    const hasPriceData = (payload.series?.prices?.length ?? 0) > 0
    const initialData: TokenChartResponse | null = hasPriceData ? {
      success: payload.success ?? true,
      metadata: payload.metadata ?? {},
      coin_id: payload.coin_id ?? '',
      range: payload.range ?? '7d',
      vs_currency: payload.vs_currency ?? 'usd',
      series: payload.series as TokenChartResponse['series'],
      candles: payload.candles ?? [],
      stats: payload.stats ?? {},
      sources: payload.sources ?? [],
      interval: payload.interval ?? null,
      cached: payload.cached ?? false,
    } : null

    return (
      <Suspense fallback={<ChartPlaceholder label="Loading token chart…" />}>
        <TokenPriceChart
          coinId={payload.coin_id}
          symbol={payload.symbol ?? payload.metadata?.symbol ?? undefined}
          address={payload.metadata?.contract_address ?? undefined}
          chain={payload.metadata?.chain ?? 'ethereum'}
          vsCurrency={payload.vs_currency ?? 'usd'}
          initialRange={(payload.range ?? '7d') as TokenChartParams['range']}
          initialData={initialData}
          showSelector
        />
      </Suspense>
    )
  }

  return (
    <Suspense fallback={<ChartPlaceholder label="Loading protocol chart…" />}>
      <ProtocolChartPanel widget={widget} payload={payload} />
    </Suspense>
  )
}
