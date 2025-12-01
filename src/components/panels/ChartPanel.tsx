import React, { Suspense } from 'react'

import type { Widget } from '../../types/widgets'
import { TOKEN_PRICE_WIDGET_ID } from '../../constants/widgets'
import type { TokenChartParams, TokenChartResponse } from '../../services/prices'
import { ChartPlaceholder } from './ChartPlaceholder'
import TokenPriceChartTemplate from './TokenPriceChartTemplate'

const TokenPriceChart = React.lazy(() => import('../charts/TokenPriceChart'))
const ProtocolChartPanel = React.lazy(() => import('./ProtocolChartPanel'))

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

function isTokenChartTemplate(payload: any): boolean {
  return Boolean(payload && typeof payload === 'object' && payload.template === TOKEN_PRICE_WIDGET_ID)
}

export default function ChartPanelComponent({ widget }: { widget: Widget }) {
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
      <Suspense fallback={<ChartPlaceholder label="Loading token chart…" />}>
        <TokenPriceChart
          coinId={payload.coin_id}
          symbol={payload.metadata?.symbol ?? payload.symbol}
          address={payload.metadata?.contract_address ?? payload.contract_address}
          chain={payload.metadata?.chain ?? payload.chain ?? 'ethereum'}
          vsCurrency={initialData.vs_currency}
          initialRange={initialData.range as TokenChartParams['range']}
          initialData={initialData}
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
