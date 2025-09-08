import React, { useState } from 'react'
import { ModalBase } from './ModalBase'

export function SwapModal({
  from = 'ETH',
  to = 'USDC',
  onClose,
  onConfirm,
}: {
  from?: string
  to?: string
  onClose: () => void
  onConfirm: (params: { from: string; to: string; amount?: number }) => void
}) {
  const [fromToken, setFromToken] = useState(from)
  const [toToken, setToToken] = useState(to)
  const [amount, setAmount] = useState('')

  return (
    <ModalBase
      title="Swap"
      onClose={onClose}
      footer={
        <div className="flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-sm">Cancel</button>
          <button onClick={() => onConfirm({ from: fromToken, to: toToken, amount: Number(amount) || undefined })} className="px-4 py-2 rounded-xl bg-primary-600 text-white text-sm hover:opacity-95">Open Wallet</button>
        </div>
      }
    >
      <div className="space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-2">
          <input value={fromToken} onChange={(e) => setFromToken(e.target.value)} className="rounded-xl border border-slate-300 px-3 py-2" placeholder="From (e.g., ETH)" />
          <input value={toToken} onChange={(e) => setToToken(e.target.value)} className="rounded-xl border border-slate-300 px-3 py-2" placeholder="To (e.g., USDC)" />
        </div>
        <input value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2" placeholder="Amount (optional)" />
        <div className="text-xs text-slate-500">This will open your wallet to continue on a trusted venue.</div>
      </div>
    </ModalBase>
  )
}

