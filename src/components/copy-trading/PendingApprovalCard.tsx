import React, { useState } from 'react'
import {
  ArrowRight,
  Clock,
  AlertCircle,
  Check,
  X,
  Loader2,
} from 'lucide-react'
import type { CopyExecution } from '../../types/copy-trading'
import {
  formatRelativeTime,
  formatUsdValue,
  truncateAddress,
} from '../../hooks/useCopyTrading'

interface PendingApprovalCardProps {
  execution: CopyExecution
  onApprove: (id: string) => Promise<{ success: boolean; executionId?: string }>
  onReject: (id: string, reason?: string) => Promise<void>
  onSign?: (executionId: string) => Promise<void> // Called after approval to sign tx
}

type CardState = 'idle' | 'approving' | 'signing' | 'confirming' | 'rejected'

export function PendingApprovalCard({
  execution,
  onApprove,
  onReject,
  onSign,
}: PendingApprovalCardProps) {
  const [state, setState] = useState<CardState>('idle')
  const [error, setError] = useState<string | null>(null)

  const handleApprove = async () => {
    setError(null)
    setState('approving')

    try {
      const result = await onApprove(execution.id)

      if (result.success && onSign) {
        setState('signing')
        await onSign(execution.id)
        setState('confirming')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve')
      setState('idle')
    }
  }

  const handleReject = async () => {
    setError(null)
    setState('rejected')

    try {
      await onReject(execution.id, 'Rejected by user')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject')
      setState('idle')
    }
  }

  const isLoading = state === 'approving' || state === 'signing' || state === 'confirming'
  const leaderLabel = execution.relationship?.leaderLabel || truncateAddress(execution.signal.leaderAddress)
  const timeSinceSignal = formatRelativeTime(execution.signalReceivedAt)

  return (
    <div
      className="rounded-lg p-4"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--line)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className="px-2 py-0.5 text-xs font-medium rounded-full"
            style={{
              background: 'var(--warning-bg)',
              color: 'var(--warning)',
            }}
          >
            Pending Approval
          </span>
          <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
            <Clock size={12} />
            {timeSinceSignal}
          </span>
        </div>
      </div>

      {/* Leader info */}
      <div className="mb-3">
        <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
          Leader
        </div>
        <div className="font-medium" style={{ color: 'var(--text)' }}>
          {leaderLabel}
        </div>
      </div>

      {/* Trade visualization */}
      <div
        className="flex items-center justify-between p-3 rounded-lg mb-3"
        style={{ background: 'var(--surface-alt)' }}
      >
        <div className="text-center">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center mb-1 mx-auto text-lg font-bold"
            style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
          >
            {execution.signal.tokenInSymbol?.charAt(0) || '?'}
          </div>
          <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>
            {execution.signal.tokenInSymbol || 'Unknown'}
          </div>
        </div>

        <ArrowRight size={20} style={{ color: 'var(--text-muted)' }} />

        <div className="text-center">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center mb-1 mx-auto text-lg font-bold"
            style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
          >
            {execution.signal.tokenOutSymbol?.charAt(0) || '?'}
          </div>
          <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>
            {execution.signal.tokenOutSymbol || 'Unknown'}
          </div>
        </div>
      </div>

      {/* Trade details */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <div className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>
            Leader Trade
          </div>
          <div className="font-medium" style={{ color: 'var(--text)' }}>
            {formatUsdValue(execution.signal.valueUsd)}
          </div>
        </div>
        <div>
          <div className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>
            Your Size
          </div>
          <div className="font-medium" style={{ color: 'var(--text)' }}>
            {formatUsdValue(execution.calculatedSizeUsd)}
            <span className="text-xs ml-1" style={{ color: 'var(--text-muted)' }}>
              ({execution.relationship?.sizingMode === 'fixed' ? 'fixed' : `${execution.relationship?.sizeValue}%`})
            </span>
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg mb-3 text-sm"
          style={{
            background: 'var(--error-bg)',
            color: 'var(--error)',
          }}
        >
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          className="flex-1 px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
          style={{
            background: 'var(--surface-alt)',
            color: 'var(--text)',
            opacity: isLoading ? 0.5 : 1,
          }}
          onClick={handleReject}
          disabled={isLoading}
        >
          <X size={16} />
          Reject
        </button>
        <button
          className="flex-1 px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
          style={{
            background: 'var(--accent)',
            color: 'var(--surface)',
            opacity: isLoading ? 0.5 : 1,
          }}
          onClick={handleApprove}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              {state === 'approving' && 'Approving...'}
              {state === 'signing' && 'Sign in Wallet...'}
              {state === 'confirming' && 'Confirming...'}
            </>
          ) : (
            <>
              <Check size={16} />
              Approve & Sign
            </>
          )}
        </button>
      </div>
    </div>
  )
}

// Compact version for notification list
export function PendingApprovalBadge({
  count,
  onClick,
}: {
  count: number
  onClick: () => void
}) {
  if (count === 0) return null

  return (
    <button
      className="relative p-2 rounded-lg transition-colors"
      style={{ background: 'var(--warning-bg)' }}
      onClick={onClick}
    >
      <Clock size={18} style={{ color: 'var(--warning)' }} />
      <span
        className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
        style={{
          background: 'var(--warning)',
          color: 'var(--surface)',
        }}
      >
        {count > 9 ? '9+' : count}
      </span>
    </button>
  )
}
