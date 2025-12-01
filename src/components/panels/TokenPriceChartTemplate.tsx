import React from 'react'

import { TOKEN_PRICE_WIDGET_ID } from '../../constants/widgets'

const TEMPLATE_BAR_HEIGHTS = [32, 44, 28, 56, 40, 68, 50, 74, 58, 62, 48, 66, 54, 70]

export default function TokenPriceChartTemplate() {
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

export const TOKEN_PRICE_TEMPLATE_ID = TOKEN_PRICE_WIDGET_ID
