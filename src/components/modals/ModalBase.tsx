import React from 'react'

export function ModalBase({ title, onClose, children, footer }: { title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 p-3">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl border border-slate-200">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <div className="font-semibold text-slate-900">{title}</div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-slate-100 text-slate-600">✕</button>
        </div>
        <div className="p-4">{children}</div>
        {footer && <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 rounded-b-2xl">{footer}</div>}
      </div>
    </div>
  )
}

