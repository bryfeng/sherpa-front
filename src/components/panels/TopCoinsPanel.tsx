import React from 'react'

export function TopCoinsPanel({ payload }: { payload: any }) {
  const coins = Array.isArray(payload?.coins) ? payload.coins : []
  if (!coins.length) return <div className="text-sm text-slate-500">No data available.</div>
  return (
    <div className="space-y-2">
      {coins.map((coin: any) => (
        <div key={coin.id || coin.symbol} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex items-baseline gap-2">
            <div className="text-sm font-medium text-slate-900">{coin.name}</div>
            <div className="text-xs text-slate-500">{String(coin.symbol || '').toUpperCase()}</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm font-semibold text-slate-900">
              ${Number(coin.price_usd || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
            {typeof coin.change_24h === 'number' && (
              <div className={`text-xs ${coin.change_24h >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {coin.change_24h.toFixed(2)}%
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
