import React, { useMemo, useState } from 'react'
import { ModalBase } from './ModalBase'
import { getBungeeQuote } from '../../services/bungee'

export function BungeeQuoteModal({ onClose }: { onClose: () => void }) {
  const [fromChainId, setFromChainId] = useState(1)
  const [toChainId, setToChainId] = useState(137)
  const [fromToken, setFromToken] = useState('0x0000000000000000000000000000000000000000')
  const [toToken, setToToken] = useState('0x0000000000000000000000000000000000000000')
  const [amount, setAmount] = useState('0.1')
  const [slippage, setSlippage] = useState(1.0)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any | null>(null)
  const [error, setError] = useState<string | null>(null)

  const amountWei = useMemo(() => {
    try {
      const n = Number(amount)
      if (!isFinite(n) || n <= 0) return ''
      // Assume 18 decimals for native for POC
      return BigInt(Math.round(n * 1e6)) * BigInt(1e12) + ''
    } catch {
      return ''
    }
  }, [amount])

  async function preview() {
    setError(null)
    setResult(null)
    setLoading(true)
    try {
      const data = await getBungeeQuote({
        fromChainId,
        toChainId,
        fromTokenAddress: fromToken,
        toTokenAddress: toToken,
        amount: amountWei,
        slippage,
      })
      setResult(data)
    } catch (e: any) {
      setError(e?.message || 'Failed to fetch quote')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ModalBase
      title="Bungee Bridge (POC)"
      onClose={onClose}
      footer={
        <div className="flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-sm">Close</button>
          <button onClick={preview} disabled={!amountWei || loading} className="px-4 py-2 rounded-xl bg-primary-600 text-white text-sm hover:opacity-95 disabled:opacity-50">{loading ? 'Fetching…' : 'Preview'}</button>
        </div>
      }
    >
      <div className="space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-slate-700 mb-1">From chain (ID)</div>
            <input type="number" value={fromChainId} onChange={(e) => setFromChainId(parseInt(e.target.value || '0', 10) || 0)} className="w-full rounded-xl border border-slate-300 px-3 py-2" />
          </div>
          <div>
            <div className="text-slate-700 mb-1">To chain (ID)</div>
            <input type="number" value={toChainId} onChange={(e) => setToChainId(parseInt(e.target.value || '0', 10) || 0)} className="w-full rounded-xl border border-slate-300 px-3 py-2" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-slate-700 mb-1">From token (address)</div>
            <input value={fromToken} onChange={(e) => setFromToken(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2" />
            <div className="text-xs text-slate-500 mt-1">Use 0x000...000 for native</div>
          </div>
          <div>
            <div className="text-slate-700 mb-1">To token (address)</div>
            <input value={toToken} onChange={(e) => setToToken(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-slate-700 mb-1">Amount</div>
            <input value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2" />
          </div>
          <div>
            <div className="text-slate-700 mb-1">Slippage (%)</div>
            <input type="number" step="0.1" value={slippage} onChange={(e) => setSlippage(parseFloat(e.target.value || '0'))} className="w-full rounded-xl border border-slate-300 px-3 py-2" />
          </div>
        </div>
        {error && <div className="text-rose-600">{error}</div>}
        {result && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 overflow-auto">
            <pre className="whitespace-pre-wrap break-all">{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}
      </div>
    </ModalBase>
  )
}

