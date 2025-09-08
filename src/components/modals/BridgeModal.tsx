import React, { useState } from 'react'
import { ModalBase } from './ModalBase'

export function BridgeModal({
  onClose,
  onConfirm,
}: {
  onClose: () => void
  onConfirm: (params: { fromChain: string; toChain: string; amount?: number }) => void
}) {
  const [fromChain, setFromChain] = useState('mainnet')
  const [toChain, setToChain] = useState('arbitrum')
  const [amount, setAmount] = useState('')

  return (
    <ModalBase
      title="Bridge"
      onClose={onClose}
      footer={
        <div className="flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-sm">Cancel</button>
          <button onClick={() => onConfirm({ fromChain, toChain, amount: Number(amount) || undefined })} className="px-4 py-2 rounded-xl bg-primary-600 text-white text-sm hover:opacity-95">Continue</button>
        </div>
      }
    >
      <div className="space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-2">
          <input value={fromChain} onChange={(e) => setFromChain(e.target.value)} className="rounded-xl border border-slate-300 px-3 py-2" placeholder="From chain" />
          <input value={toChain} onChange={(e) => setToChain(e.target.value)} className="rounded-xl border border-slate-300 px-3 py-2" placeholder="To chain" />
        </div>
        <input value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2" placeholder="Amount (optional)" />
        <div className="text-xs text-slate-500">We’ll guide you to a reputable bridge with these settings.</div>
      </div>
    </ModalBase>
  )
}

