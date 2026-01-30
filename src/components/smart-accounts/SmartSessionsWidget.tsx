/**
 * Smart Sessions Widget
 *
 * Widget for managing Smart Sessions - displays active session status
 * and provides controls to grant/revoke sessions.
 */

import React, { useState } from 'react'
import { Shield, Plus, RefreshCw, AlertCircle } from 'lucide-react'
import { useSmartSessions, useSessionStats } from '../../hooks/useSmartSessions'
import { useSmartAccount } from '../../hooks/useSmartAccount'
import { SmartSessionForm } from './SmartSessionForm'
import { SmartSessionCard } from './SmartSessionCard'
import { formatUsd } from '../../types/policy'

interface SmartSessionsWidgetProps {
  /** Compact mode for sidebar */
  compact?: boolean
}

export function SmartSessionsWidget({ compact = false }: SmartSessionsWidgetProps) {
  const { hasSmartAccount, smartAccountAddress, status: accountStatus } = useSmartAccount()
  const {
    sessions,
    activeSession,
    isLoading,
    isGranting,
    isRevoking,
    error,
    grantSession,
    revokeSession,
    hasActiveSession,
    getSpendingRemaining,
    getTimeRemaining,
  } = useSmartSessions()

  const stats = useSessionStats(smartAccountAddress ?? undefined)

  const [showForm, setShowForm] = useState(false)

  // Format time remaining
  const formatTimeRemaining = (seconds: number) => {
    if (seconds <= 0) return 'Expired'
    const days = Math.floor(seconds / (24 * 60 * 60))
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60))
    if (days > 0) return `${days}d ${hours}h`
    if (hours > 0) return `${hours}h`
    const minutes = Math.floor(seconds / 60)
    return `${minutes}m`
  }

  // Compact mode - just status indicator
  if (compact) {
    return (
      <div
        className="flex items-center gap-2 rounded-lg border px-3 py-2"
        style={{
          borderColor: hasActiveSession ? 'var(--accent)' : 'var(--line)',
          background: hasActiveSession ? 'rgba(var(--accent-rgb), 0.1)' : 'var(--surface-2)',
        }}
      >
        <Shield
          className="h-4 w-4"
          style={{ color: hasActiveSession ? 'var(--accent)' : 'var(--text-muted)' }}
        />
        <div className="flex-1 min-w-0">
          <p
            className="text-xs font-medium truncate"
            style={{ color: hasActiveSession ? 'var(--accent)' : 'var(--text-muted)' }}
          >
            {hasActiveSession ? 'Autonomous Mode' : 'Manual Mode'}
          </p>
          {hasActiveSession && activeSession && (
            <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
              {formatUsd(getSpendingRemaining())} / {formatTimeRemaining(getTimeRemaining())}
            </p>
          )}
        </div>
      </div>
    )
  }

  // Loading state
  if (isLoading || accountStatus === 'checking') {
    return (
      <div
        className="rounded-xl border p-4"
        style={{ borderColor: 'var(--line)', background: 'var(--surface-1)' }}
      >
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin" style={{ color: 'var(--text-muted)' }} />
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Loading sessions...
          </span>
        </div>
      </div>
    )
  }

  // No Smart Account
  if (!hasSmartAccount) {
    return (
      <div
        className="rounded-xl border p-4"
        style={{ borderColor: 'var(--line)', background: 'var(--surface-1)' }}
      >
        <div className="flex items-center gap-3 mb-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: 'var(--surface-2)' }}
          >
            <Shield className="h-5 w-5" style={{ color: 'var(--text-muted)' }} />
          </div>
          <div>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
              Smart Sessions
            </h3>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Deploy a Smart Account first
            </p>
          </div>
        </div>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Smart Sessions require a Smart Account to enable on-chain permission enforcement.
        </p>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div
        className="rounded-xl border p-4"
        style={{ borderColor: 'var(--error)', background: 'var(--surface-1)' }}
      >
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="h-4 w-4" style={{ color: 'var(--error)' }} />
          <span className="text-sm font-medium" style={{ color: 'var(--error)' }}>
            Error
          </span>
        </div>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {error}
        </p>
      </div>
    )
  }

  // Show form
  if (showForm) {
    return (
      <div
        className="rounded-xl border p-4"
        style={{ borderColor: 'var(--line)', background: 'var(--surface-1)' }}
      >
        <SmartSessionForm
          onSubmit={async (config) => {
            await grantSession(config)
            setShowForm(false)
          }}
          onCancel={() => setShowForm(false)}
          isSubmitting={isGranting}
        />
      </div>
    )
  }

  return (
    <div
      className="rounded-xl border p-4"
      style={{ borderColor: 'var(--line)', background: 'var(--surface-1)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{
              background: hasActiveSession ? 'var(--accent)' : 'var(--surface-2)',
            }}
          >
            <Shield
              className="h-5 w-5"
              style={{ color: hasActiveSession ? 'white' : 'var(--text-muted)' }}
            />
          </div>
          <div>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
              Smart Sessions
            </h3>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {hasActiveSession ? 'Autonomous execution enabled' : 'Manual approval required'}
            </p>
          </div>
        </div>
        {!hasActiveSession && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition"
            style={{ background: 'var(--accent)', color: 'white' }}
          >
            <Plus className="h-3.5 w-3.5" />
            Enable
          </button>
        )}
      </div>

      {/* Active Session */}
      {activeSession && (
        <SmartSessionCard
          session={activeSession}
          onRevoke={revokeSession}
          isRevoking={isRevoking}
        />
      )}

      {/* No Active Session */}
      {!activeSession && (
        <div
          className="rounded-lg border-2 border-dashed p-6 text-center"
          style={{ borderColor: 'var(--line)' }}
        >
          <Shield className="h-8 w-8 mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>
            No Active Session
          </p>
          <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
            Enable autonomous mode to let the agent execute transactions without manual approval
          </p>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium transition"
            style={{ background: 'var(--accent)', color: 'white' }}
          >
            <Shield className="h-3.5 w-3.5" />
            Grant Smart Session
          </button>
        </div>
      )}

      {/* Stats */}
      {stats.totalSessions > 0 && (
        <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--line)' }}>
          <p className="text-[11px] mb-2" style={{ color: 'var(--text-muted)' }}>
            Session History
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                {stats.totalSessions}
              </p>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                Total sessions
              </p>
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                {formatUsd(stats.totalSpentUsd)}
              </p>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                Total spent
              </p>
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                {stats.totalTransactions}
              </p>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                Transactions
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Past Sessions */}
      {sessions.length > 1 && (
        <div className="mt-4">
          <button
            type="button"
            className="text-xs font-medium"
            style={{ color: 'var(--accent)' }}
            onClick={() => {
              // Could expand to show past sessions
            }}
          >
            View {sessions.length - 1} past session{sessions.length > 2 ? 's' : ''}
          </button>
        </div>
      )}
    </div>
  )
}

export default SmartSessionsWidget
