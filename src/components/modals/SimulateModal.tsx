import React, { useMemo, useState } from 'react'
import { ModalBase } from './ModalBase'

export function SimulateModal({
  from = 'ETH',
  to = 'USDC',
  onClose,
  onConfirm,
}: {
  from?: string
  to?: string
  onClose: () => void
  onConfirm: (pct: number | null, amount?: number | null) => void
}) {
  const [pct, setPct] = useState<number | null>(25)
  const [custom, setCustom] = useState<string>('')

  const amount = useMemo(() => {
    const n = Number(custom)
    return isNaN(n) ? null : n
  }, [custom])

  return (
    <ModalBase
      title="Simulate Swap"
      onClose={onClose}
      footer={
        <div className="flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-sm">Cancel</button>
          <button onClick={() => onConfirm(pct, amount ?? undefined)} className="px-4 py-2 rounded-xl bg-primary-600 text-white text-sm hover:opacity-95">Simulate</button>
        </div>
      }
    >
      <div className="space-y-4 text-sm">
        <div>
          <div className="text-slate-700 mb-2">Preset percentages</div>
          <div className="flex gap-2">
            {[25, 50, 75].map((p) => (
              <button key={p} onClick={() => setPct(p)} className={`px-3 py-1.5 rounded-xl border text-sm ${pct === p ? 'bg-primary-600 text-white border-primary-600' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}>{p}%</button>
            ))}
            <button onClick={() => setPct(null)} className={`px-3 py-1.5 rounded-xl border text-sm ${pct === null ? 'bg-primary-600 text-white border-primary-600' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}>Custom</button>
          </div>
        </div>
        <div>
          <div className="text-slate-700 mb-2">Custom amount ({from} → {to})</div>
          <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Amount in from-token" className="w-full rounded-xl border border-slate-300 px-3 py-2" />
          <div className="text-xs text-slate-500 mt-1">Leave blank to use percentage.</div>
        </div>
      </div>
    </ModalBase>
  )
}

