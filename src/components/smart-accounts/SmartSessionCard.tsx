/**
 * Smart Session Card
 *
 * Displays a Smart Session with its status, spending, and controls.
 */

import React from 'react'
import { Shield, Clock, DollarSign, Activity, XCircle, AlertTriangle } from 'lucide-react'
import type { SmartSessionData } from '../../hooks/useSmartSessions'
import { formatUsd } from '../../types/policy'

interface SmartSessionCardProps {
  session: SmartSessionData
  onRevoke?: (sessionId: string) => void
  isRevoking?: boolean
}

export function SmartSessionCard({ session, onRevoke, isRevoking = false }: SmartSessionCardProps) {
  const now = Date.now()
  const isExpired = session.validUntil < now
  const isActive = session.status === 'active' && !isExpired

  // Calculate spending
  const spentPercent = Math.min(100, (session.totalSpentUsd / session.spendingLimitUsd) * 100)
  const remainingBudget = Math.max(0, session.spendingLimitUsd - session.totalSpentUsd)

  // Calculate time remaining
  const timeRemainingMs = Math.max(0, session.validUntil - now)
  const daysRemaining = Math.floor(timeRemainingMs / (24 * 60 * 60 * 1000))
  const hoursRemaining = Math.floor((timeRemainingMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))

  // Format time remaining
  const timeRemainingText =
    daysRemaining > 0
      ? `${daysRemaining}d ${hoursRemaining}h remaining`
      : hoursRemaining > 0
        ? `${hoursRemaining}h remaining`
        : 'Expired'

  // Status badge
  const getStatusBadge = () => {
    if (session.status === 'revoked') {
      return { text: 'Revoked', color: 'var(--error)', bg: 'rgba(var(--error-rgb), 0.1)' }
    }
    if (isExpired || session.status === 'expired') {
      return { text: 'Expired', color: 'var(--warning)', bg: 'rgba(var(--warning-rgb), 0.1)' }
    }
    if (spentPercent >= 100) {
      return { text: 'Budget Exhausted', color: 'var(--warning)', bg: 'rgba(var(--warning-rgb), 0.1)' }
    }
    return { text: 'Active', color: 'var(--success)', bg: 'rgba(var(--success-rgb), 0.1)' }
  }

  const status = getStatusBadge()

  return (
    <div
      className="rounded-xl border p-4"
      style={{
        borderColor: isActive ? 'var(--accent)' : 'var(--line)',
        background: 'var(--surface-1)',
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{
              background: isActive ? 'var(--accent)' : 'var(--surface-2)',
            }}
          >
            <Shield
              className="h-4 w-4"
              style={{ color: isActive ? 'white' : 'var(--text-muted)' }}
            />
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
              Smart Session
            </p>
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              {session.sessionId.slice(0, 12)}...
            </p>
          </div>
        </div>
        <span
          className="px-2 py-0.5 rounded-full text-[11px] font-medium"
          style={{ color: status.color, background: status.bg }}
        >
          {status.text}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        {/* Spending */}
        <div>
          <div className="flex items-center gap-1 mb-1">
            <DollarSign className="h-3 w-3" style={{ color: 'var(--text-muted)' }} />
            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              Spent
            </span>
          </div>
          <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
            {formatUsd(session.totalSpentUsd)}
          </p>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            of {formatUsd(session.spendingLimitUsd)}
          </p>
        </div>

        {/* Time */}
        <div>
          <div className="flex items-center gap-1 mb-1">
            <Clock className="h-3 w-3" style={{ color: 'var(--text-muted)' }} />
            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              Time
            </span>
          </div>
          <p
            className="text-sm font-medium"
            style={{ color: isExpired ? 'var(--warning)' : 'var(--text)' }}
          >
            {daysRemaining > 0 ? `${daysRemaining}d` : hoursRemaining > 0 ? `${hoursRemaining}h` : '--'}
          </p>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            remaining
          </p>
        </div>

        {/* Transactions */}
        <div>
          <div className="flex items-center gap-1 mb-1">
            <Activity className="h-3 w-3" style={{ color: 'var(--text-muted)' }} />
            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              Txns
            </span>
          </div>
          <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
            {session.transactionCount}
          </p>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            executed
          </p>
        </div>
      </div>

      {/* Spending Progress Bar */}
      <div className="mb-3">
        <div className="flex justify-between mb-1">
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            Budget used
          </span>
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            {spentPercent.toFixed(0)}%
          </span>
        </div>
        <div
          className="h-1.5 rounded-full overflow-hidden"
          style={{ background: 'var(--surface-2)' }}
        >
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${spentPercent}%`,
              background:
                spentPercent >= 90
                  ? 'var(--warning)'
                  : spentPercent >= 75
                    ? 'var(--warning)'
                    : 'var(--accent)',
            }}
          />
        </div>
        <p className="mt-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
          {formatUsd(remainingBudget)} remaining
        </p>
      </div>

      {/* Allowed Actions */}
      <div className="mb-3">
        <p className="text-[11px] mb-1.5" style={{ color: 'var(--text-muted)' }}>
          Allowed actions
        </p>
        <div className="flex flex-wrap gap-1">
          {session.allowedActions.map((action) => (
            <span
              key={action}
              className="px-2 py-0.5 rounded text-[11px]"
              style={{ background: 'var(--surface-2)', color: 'var(--text)' }}
            >
              {action}
            </span>
          ))}
        </div>
      </div>

      {/* Warning for low budget/time */}
      {isActive && (spentPercent >= 80 || daysRemaining <= 1) && (
        <div
          className="flex items-center gap-2 rounded-lg px-3 py-2 mb-3"
          style={{ background: 'rgba(var(--warning-rgb), 0.1)' }}
        >
          <AlertTriangle className="h-3.5 w-3.5" style={{ color: 'var(--warning)' }} />
          <p className="text-[11px]" style={{ color: 'var(--warning)' }}>
            {spentPercent >= 80 && daysRemaining <= 1
              ? 'Budget nearly exhausted and expiring soon'
              : spentPercent >= 80
                ? 'Budget nearly exhausted'
                : 'Session expiring soon'}
          </p>
        </div>
      )}

      {/* Revoke Button */}
      {isActive && onRevoke && (
        <button
          type="button"
          onClick={() => onRevoke(session.sessionId)}
          disabled={isRevoking}
          className="w-full flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-medium transition hover:bg-[var(--surface-2)] disabled:opacity-50"
          style={{ borderColor: 'var(--error)', color: 'var(--error)' }}
        >
          <XCircle className="h-3.5 w-3.5" />
          {isRevoking ? 'Revoking...' : 'Revoke Session'}
        </button>
      )}

      {/* Transaction Hash */}
      {session.grantTxHash && (
        <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--line)' }}>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            Grant tx:{' '}
            <span className="font-mono">
              {session.grantTxHash.slice(0, 10)}...{session.grantTxHash.slice(-8)}
            </span>
          </p>
        </div>
      )}
    </div>
  )
}

export default SmartSessionCard
