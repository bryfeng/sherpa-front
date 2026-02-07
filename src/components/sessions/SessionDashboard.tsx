/**
 * Session Management Dashboard
 *
 * Shows all Smart Sessions for the connected user's smart account.
 * Displays active/expired sessions, spending usage, and revoke actions.
 */

import React, { useMemo, useCallback } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import {
  Shield,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Trash2,
} from 'lucide-react'

// ============================================
// TYPES
// ============================================

interface SmartSession {
  _id: string
  smartAccountAddress: string
  sessionId: string
  spendingLimitUsd: number
  allowedContracts: string[]
  allowedTokens: string[]
  allowedActions: string[]
  validUntil: number
  createdAt: number
  status: 'active' | 'expired' | 'revoked'
  totalSpentUsd?: number
  transactionCount?: number
  lastUsedAt?: number
  grantTxHash?: string
  revokeTxHash?: string
}

interface SessionDashboardProps {
  smartAccountAddress: string | null
  showExpired?: boolean
}

// ============================================
// HELPERS
// ============================================

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatRelativeTime(ts: number): string {
  const diff = ts - Date.now()
  if (diff < 0) return 'Expired'
  const days = Math.floor(diff / 86400000)
  if (days > 0) return `${days}d remaining`
  const hours = Math.floor(diff / 3600000)
  return `${hours}h remaining`
}

function truncateAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

// ============================================
// SPENDING BAR
// ============================================

function SpendingBar({ spent, limit }: { spent: number; limit: number }) {
  const pct = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0
  const isHigh = pct > 80

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-slate-500">${spent.toFixed(2)} spent</span>
        <span className="text-slate-400">${limit.toFixed(0)} limit</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            isHigh ? 'bg-amber-500' : 'bg-blue-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ============================================
// SESSION CARD
// ============================================

function SessionCard({
  session,
  onRevoke,
  isRevoking,
  linkedStrategyName,
}: {
  session: SmartSession
  onRevoke: (sessionId: string) => void
  isRevoking: boolean
  linkedStrategyName?: string
}) {
  const isActive = session.status === 'active' && session.validUntil > Date.now()
  const isExpired = session.status === 'expired' || session.validUntil <= Date.now()
  const isRevoked = session.status === 'revoked'

  const statusConfig = isRevoked
    ? { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50', label: 'Revoked' }
    : isExpired
    ? { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50', label: 'Expired' }
    : { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50', label: 'Active' }

  const StatusIcon = statusConfig.icon

  return (
    <div className="border border-slate-200 rounded-xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${statusConfig.bg}`}>
            <Shield className={`h-4 w-4 ${statusConfig.color}`} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium text-slate-900">
                Session {truncateAddress(session.sessionId)}
              </span>
              <StatusIcon className={`h-3.5 w-3.5 ${statusConfig.color}`} />
            </div>
            <p className="text-xs text-slate-400">
              Created {formatDate(session.createdAt)}
            </p>
          </div>
        </div>

        {isActive && (
          <button
            onClick={() => onRevoke(session.sessionId)}
            disabled={isRevoking}
            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
            title="Revoke session"
          >
            {isRevoking ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </button>
        )}
      </div>

      {/* Spending */}
      <SpendingBar
        spent={session.totalSpentUsd ?? 0}
        limit={session.spendingLimitUsd}
      />

      {/* Details */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-slate-400">Transactions</span>
          <p className="font-medium text-slate-700">{session.transactionCount ?? 0}</p>
        </div>
        <div>
          <span className="text-slate-400">Expires</span>
          <p className="font-medium text-slate-700">
            {isExpired ? 'Expired' : formatRelativeTime(session.validUntil)}
          </p>
        </div>
        <div>
          <span className="text-slate-400">Actions</span>
          <p className="font-medium text-slate-700">
            {session.allowedActions.join(', ') || 'All'}
          </p>
        </div>
        {linkedStrategyName && (
          <div>
            <span className="text-slate-400">Strategy</span>
            <p className="font-medium text-blue-600 truncate">{linkedStrategyName}</p>
          </div>
        )}
      </div>

      {/* Grant TX */}
      {session.grantTxHash && (
        <div className="flex items-center gap-1 text-xs text-slate-400">
          <span>Grant TX: {truncateAddress(session.grantTxHash)}</span>
          <ExternalLink className="h-3 w-3" />
        </div>
      )}
    </div>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================

export function SessionDashboard({
  smartAccountAddress,
  showExpired = true,
}: SessionDashboardProps) {
  const sessions = useQuery(
    api.smartSessions.listBySmartAccount,
    smartAccountAddress
      ? {
          smartAccountAddress,
          includeExpired: showExpired,
          includeRevoked: showExpired,
        }
      : 'skip'
  ) as SmartSession[] | undefined

  // Fetch DCA strategies to link sessions to strategies
  const dcaStrategies = useQuery(
    api.dca.listByWallet,
    smartAccountAddress
      ? { walletAddress: smartAccountAddress }
      : 'skip'
  ) as Array<{ _id: string; name: string; smartSessionId?: string }> | undefined

  const revokeMutation = useMutation(api.smartSessions.revoke)
  const [revokingId, setRevokingId] = React.useState<string | null>(null)

  // Build session → strategy name map
  const sessionStrategyMap = useMemo(() => {
    const map = new Map<string, string>()
    if (dcaStrategies) {
      for (const s of dcaStrategies) {
        if (s.smartSessionId) {
          map.set(s.smartSessionId, s.name)
        }
      }
    }
    return map
  }, [dcaStrategies])

  const handleRevoke = useCallback(
    async (sessionId: string) => {
      setRevokingId(sessionId)
      try {
        await revokeMutation({ sessionId })
      } catch (err) {
        console.error('Failed to revoke session:', err)
      } finally {
        setRevokingId(null)
      }
    },
    [revokeMutation]
  )

  // Loading
  if (sessions === undefined) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 text-slate-400 animate-spin" />
        <span className="ml-2 text-sm text-slate-500">Loading sessions...</span>
      </div>
    )
  }

  // No smart account
  if (!smartAccountAddress) {
    return (
      <div className="text-center py-12 text-sm text-slate-400">
        <Shield className="h-8 w-8 mx-auto mb-2 text-slate-300" />
        <p>No smart account connected</p>
      </div>
    )
  }

  // Empty
  if (sessions.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-slate-400">
        <Shield className="h-8 w-8 mx-auto mb-2 text-slate-300" />
        <p>No sessions found</p>
        <p className="text-xs mt-1">Grant a session to enable autonomous trading</p>
      </div>
    )
  }

  const activeSessions = sessions.filter(
    (s) => s.status === 'active' && s.validUntil > Date.now()
  )
  const inactiveSessions = sessions.filter(
    (s) => s.status !== 'active' || s.validUntil <= Date.now()
  )

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
        <Shield className="h-5 w-5 text-blue-500" />
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Smart Sessions</h3>
          <p className="text-xs text-slate-400">
            {activeSessions.length} active, {inactiveSessions.length} expired/revoked
          </p>
        </div>
      </div>

      {/* Active Sessions */}
      {activeSessions.length > 0 && (
        <div className="space-y-2">
          {activeSessions.map((session) => (
            <SessionCard
              key={session._id}
              session={session}
              onRevoke={handleRevoke}
              isRevoking={revokingId === session.sessionId}
              linkedStrategyName={sessionStrategyMap.get(session.sessionId)}
            />
          ))}
        </div>
      )}

      {/* Inactive Sessions */}
      {showExpired && inactiveSessions.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Past Sessions
          </h4>
          {inactiveSessions.map((session) => (
            <SessionCard
              key={session._id}
              session={session}
              onRevoke={handleRevoke}
              isRevoking={revokingId === session.sessionId}
              linkedStrategyName={sessionStrategyMap.get(session.sessionId)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
