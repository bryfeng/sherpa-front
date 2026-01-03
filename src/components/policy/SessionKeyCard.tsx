import React, { useState } from 'react'
import { Key, Clock, Trash2, Plus, AlertTriangle, Check } from 'lucide-react'
import type { Permission } from '../../types/policy'
import { PERMISSIONS, SUPPORTED_CHAINS, formatUsd } from '../../types/policy'

interface SessionKeyCardProps {
  sessionId: string
  permissions: Permission[]
  maxValuePerTxUsd: number
  maxTotalValueUsd: number
  totalValueUsedUsd: number
  transactionCount: number
  maxTransactions?: number
  chainAllowlist: number[]
  status: 'active' | 'expired' | 'revoked' | 'exhausted'
  expiresAt: number
  createdAt: number
  lastUsedAt?: number
  onRevoke: (sessionId: string, reason: string) => Promise<void>
  onExtend: (sessionId: string, days: number) => Promise<void>
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'active':
      return 'var(--success)'
    case 'expired':
      return 'var(--warning)'
    case 'revoked':
      return 'var(--error)'
    case 'exhausted':
      return 'var(--text-muted)'
    default:
      return 'var(--text-muted)'
  }
}

function getDaysRemaining(expiresAt: number): number {
  const now = Date.now()
  const remaining = expiresAt - now
  return Math.max(0, Math.ceil(remaining / (24 * 60 * 60 * 1000)))
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

export function SessionKeyCard({
  sessionId,
  permissions,
  maxValuePerTxUsd,
  maxTotalValueUsd,
  totalValueUsedUsd,
  transactionCount,
  maxTransactions,
  chainAllowlist,
  status,
  expiresAt,
  createdAt,
  lastUsedAt,
  onRevoke,
  onExtend,
}: SessionKeyCardProps) {
  const [showActions, setShowActions] = useState(false)
  const [revokeReason, setRevokeReason] = useState('')
  const [isRevoking, setIsRevoking] = useState(false)
  const [isExtending, setIsExtending] = useState(false)

  const budgetPercent = maxTotalValueUsd > 0 ? (totalValueUsedUsd / maxTotalValueUsd) * 100 : 0
  const daysRemaining = getDaysRemaining(expiresAt)
  const isExpiringSoon = status === 'active' && daysRemaining <= 7
  const isBudgetLow = status === 'active' && budgetPercent >= 80

  const handleRevoke = async () => {
    if (!revokeReason.trim()) return
    setIsRevoking(true)
    try {
      await onRevoke(sessionId, revokeReason)
    } finally {
      setIsRevoking(false)
      setShowActions(false)
    }
  }

  const handleExtend = async (days: number) => {
    setIsExtending(true)
    try {
      await onExtend(sessionId, days)
    } finally {
      setIsExtending(false)
      setShowActions(false)
    }
  }

  const permissionLabels = permissions
    .map((p) => PERMISSIONS.find((perm) => perm.key === p)?.label || p)
    .join(', ')

  const chainNames = chainAllowlist
    .map((id) => SUPPORTED_CHAINS.find((c) => c.chainId === id)?.name || `Chain ${id}`)
    .join(', ')

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ borderColor: 'var(--line)', background: 'var(--surface-2)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: 'var(--surface-3)' }}
          >
            <Key className="h-4 w-4" style={{ color: getStatusColor(status) }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span
                className="text-sm font-medium"
                style={{ color: 'var(--text)' }}
              >
                {sessionId.slice(0, 12)}...
              </span>
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-medium uppercase"
                style={{
                  background: `${getStatusColor(status)}20`,
                  color: getStatusColor(status),
                }}
              >
                {status}
              </span>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {permissionLabels}
            </p>
          </div>
        </div>

        {status === 'active' && (
          <button
            type="button"
            onClick={() => setShowActions(!showActions)}
            className="rounded-lg border px-2.5 py-1 text-xs font-medium transition hover:bg-[var(--surface-3)]"
            style={{ borderColor: 'var(--line)', color: 'var(--text-muted)' }}
          >
            Manage
          </button>
        )}
      </div>

      {/* Budget Progress */}
      <div className="px-4 pb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Budget: {formatUsd(totalValueUsedUsd)} / {formatUsd(maxTotalValueUsd)} used
          </span>
          <span
            className="text-xs font-medium"
            style={{ color: isBudgetLow ? 'var(--warning)' : 'var(--text)' }}
          >
            {budgetPercent.toFixed(0)}%
          </span>
        </div>
        <div
          className="h-1.5 rounded-full overflow-hidden"
          style={{ background: 'var(--surface-3)' }}
        >
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${Math.min(budgetPercent, 100)}%`,
              background: isBudgetLow ? 'var(--warning)' : 'var(--accent)',
            }}
          />
        </div>
      </div>

      {/* Stats Row */}
      <div
        className="grid grid-cols-3 gap-px border-t"
        style={{ borderColor: 'var(--line)', background: 'var(--line)' }}
      >
        <div className="px-3 py-2" style={{ background: 'var(--surface-2)' }}>
          <p className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>
            Expires
          </p>
          <p
            className="text-xs font-medium flex items-center gap-1"
            style={{ color: isExpiringSoon ? 'var(--warning)' : 'var(--text)' }}
          >
            {isExpiringSoon && <AlertTriangle className="h-3 w-3" />}
            {daysRemaining}d
          </p>
        </div>
        <div className="px-3 py-2" style={{ background: 'var(--surface-2)' }}>
          <p className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>
            Transactions
          </p>
          <p className="text-xs font-medium" style={{ color: 'var(--text)' }}>
            {transactionCount}
            {maxTransactions && ` / ${maxTransactions}`}
          </p>
        </div>
        <div className="px-3 py-2" style={{ background: 'var(--surface-2)' }}>
          <p className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>
            Last used
          </p>
          <p className="text-xs font-medium" style={{ color: 'var(--text)' }}>
            {lastUsedAt ? formatRelativeTime(lastUsedAt) : 'Never'}
          </p>
        </div>
      </div>

      {/* Chains */}
      <div
        className="px-4 py-2 border-t text-xs"
        style={{ borderColor: 'var(--line)', color: 'var(--text-muted)' }}
      >
        Chains: {chainNames}
      </div>

      {/* Actions Panel */}
      {showActions && status === 'active' && (
        <div
          className="border-t px-4 py-3 space-y-3"
          style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}
        >
          {/* Extend */}
          <div>
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--text)' }}>
              Extend Session
            </p>
            <div className="flex gap-2">
              {[7, 30, 90].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => handleExtend(days)}
                  disabled={isExtending}
                  className="flex-1 rounded-lg border py-1.5 text-xs font-medium transition hover:bg-[var(--surface-2)]"
                  style={{ borderColor: 'var(--line)', color: 'var(--text)' }}
                >
                  <Plus className="h-3 w-3 inline mr-1" />
                  {days}d
                </button>
              ))}
            </div>
          </div>

          {/* Revoke */}
          <div>
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--error)' }}>
              Revoke Session
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Reason for revoking..."
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                className="flex-1 rounded-lg border px-3 py-1.5 text-xs"
                style={{
                  borderColor: 'var(--line)',
                  background: 'var(--surface-2)',
                  color: 'var(--text)',
                }}
              />
              <button
                type="button"
                onClick={handleRevoke}
                disabled={!revokeReason.trim() || isRevoking}
                className="rounded-lg px-3 py-1.5 text-xs font-medium transition disabled:opacity-50"
                style={{ background: 'var(--error)', color: 'white' }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
