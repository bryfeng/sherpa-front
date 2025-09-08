import { useMemo } from 'react'
import type { PortfolioData } from '../../types/portfolio'

// Minimal placeholder until wiring chat panels state
export function PanelManager({ portfolio }: { portfolio?: PortfolioData }) {
  const items = useMemo(() => (portfolio ? ['portfolio'] : []), [portfolio])
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-slate-200">Panels</h2>
      {items.length === 0 ? (
        <div className="text-xs text-slate-300/80 border border-white/10 rounded-xl p-4 bg-white/5 backdrop-blur">
          <div className="mb-3">Panels like Portfolio appear here.</div>
          <div className="grid grid-cols-3 gap-2">
            <div className="h-20 rounded-lg bg-white/5 border border-white/10" />
            <div className="h-20 rounded-lg bg-white/5 border border-white/10" />
            <div className="h-20 rounded-lg bg-white/5 border border-white/10" />
          </div>
        </div>
      ) : null}

      {portfolio && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm font-medium mb-2">Portfolio Overview</div>
          <div className="text-xs text-slate-300 mb-2 break-all">{portfolio.address}</div>
          <div className="text-sm mb-3">
            <span className="text-slate-300">Total Value: </span>
            <span className="font-semibold">${typeof portfolio.total_value_usd === 'string' ? parseFloat(portfolio.total_value_usd).toLocaleString(undefined, { maximumFractionDigits: 2 }) : portfolio.total_value_usd.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
          </div>
          <div className="text-xs text-slate-300 mb-2">Tokens: {portfolio.token_count}</div>
          <div className="max-h-48 overflow-auto space-y-2 pr-1">
            {portfolio.tokens?.slice(0, 8).map((t, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="truncate">
                  <span className="font-medium">{t.symbol}</span>{' '}
                  <span className="text-slate-400">{t.name}</span>
                </div>
                <div className="text-right ml-2">
                  <div className="font-medium">${t.value_usd ? Number(t.value_usd).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}</div>
                  <div className="text-slate-400">{t.balance_formatted ?? ''}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
