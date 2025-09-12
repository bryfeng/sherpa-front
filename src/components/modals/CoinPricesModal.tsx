import React, { useEffect, useState } from 'react'
import { ModalBase } from './ModalBase'
import { getTopPrices, TopCoin } from '../../services/prices'

export function CoinPricesModal({ onClose }: { onClose: () => void }) {
  const [coins, setCoins] = useState<TopCoin[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    getTopPrices(5)
      .then((arr) => {
        if (!mounted) return
        setCoins(arr)
      })
      .catch((e) => {
        if (!mounted) return
        setError(e?.message || 'Failed to load prices')
      })
    return () => {
      mounted = false
    }
  }, [])

  return (
    <ModalBase
      title="Top Coins (excl. stablecoins)"
      onClose={onClose}
    >
      {error && <div className="text-sm text-rose-600">{error}</div>}
      {!error && !coins && (
        <div className="text-sm text-slate-600">Loading prices…</div>
      )}
      {!error && coins && coins.length === 0 && (
        <div className="text-sm text-slate-600">No data available.</div>
      )}
      {!error && coins && coins.length > 0 && (
        <div className="space-y-2">
          {coins.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex items-baseline gap-2">
                <div className="text-sm font-medium text-slate-900">{c.name}</div>
                <div className="text-xs text-slate-500">{c.symbol}</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-sm font-semibold text-slate-900">${Number(c.price_usd || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                {typeof c.change_24h === 'number' && (
                  <div className={`text-xs ${c.change_24h >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{c.change_24h.toFixed(2)}%</div>
                )}
              </div>
            </div>
          ))}
          <div className="text-[11px] text-slate-500">Source: CoinGecko</div>
        </div>
      )}
    </ModalBase>
  )
}

