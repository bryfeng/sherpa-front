import React from 'react'
import { Key, AlertCircle } from 'lucide-react'
import { SessionKeyCard } from './SessionKeyCard'
import type { Permission } from '../../types/policy'

interface SessionData {
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
}

interface SessionKeyListProps {
  sessions: SessionData[]
  isLoading: boolean
  onRevoke: (sessionId: string, reason: string) => Promise<void>
  onExtend: (sessionId: string, days: number) => Promise<void>
}

export function SessionKeyList({
  sessions,
  isLoading,
  onRevoke,
  onExtend,
}: SessionKeyListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl border p-4"
            style={{ borderColor: 'var(--line)' }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="h-8 w-8 rounded-lg"
                style={{ background: 'var(--surface-3)' }}
              />
              <div className="flex-1">
                <div
                  className="h-4 w-32 rounded mb-1"
                  style={{ background: 'var(--surface-3)' }}
                />
                <div
                  className="h-3 w-24 rounded"
                  style={{ background: 'var(--surface-3)' }}
                />
              </div>
            </div>
            <div className="h-2 rounded-full" style={{ background: 'var(--surface-3)' }} />
          </div>
        ))}
      </div>
    )
  }

  if (sessions.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-3 rounded-xl border p-8 text-center"
        style={{ borderColor: 'var(--line)', background: 'var(--surface-2)' }}
      >
        <div
          className="flex h-12 w-12 items-center justify-center rounded-xl"
          style={{ background: 'var(--surface-3)' }}
        >
          <Key className="h-6 w-6" style={{ color: 'var(--text-muted)' }} />
        </div>
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
            No Active Sessions
          </p>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            Create a session key to allow agents to trade on your behalf
          </p>
        </div>
      </div>
    )
  }

  // Sort sessions: active first, then by creation date (newest first)
  const sortedSessions = [...sessions].sort((a, b) => {
    const statusOrder = { active: 0, expired: 1, exhausted: 2, revoked: 3 }
    const statusDiff = statusOrder[a.status] - statusOrder[b.status]
    if (statusDiff !== 0) return statusDiff
    return b.createdAt - a.createdAt
  })

  // Separate active and inactive
  const activeSessions = sortedSessions.filter((s) => s.status === 'active')
  const inactiveSessions = sortedSessions.filter((s) => s.status !== 'active')

  return (
    <div className="space-y-4">
      {/* Active Sessions */}
      {activeSessions.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Active Sessions ({activeSessions.length})
          </h4>
          {activeSessions.map((session) => (
            <SessionKeyCard
              key={session.sessionId}
              {...session}
              onRevoke={onRevoke}
              onExtend={onExtend}
            />
          ))}
        </div>
      )}

      {/* Warnings for expiring soon */}
      {activeSessions.some((s) => {
        const daysRemaining = Math.ceil((s.expiresAt - Date.now()) / (24 * 60 * 60 * 1000))
        return daysRemaining <= 7 && daysRemaining > 0
      }) && (
        <div
          className="flex items-center gap-2 rounded-lg border px-3 py-2"
          style={{ borderColor: 'var(--warning)', background: 'var(--warning)/5' }}
        >
          <AlertCircle className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--warning)' }} />
          <p className="text-xs" style={{ color: 'var(--warning)' }}>
            Some sessions are expiring soon. Extend them to avoid interruption.
          </p>
        </div>
      )}

      {/* Inactive Sessions */}
      {inactiveSessions.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Past Sessions ({inactiveSessions.length})
          </h4>
          {inactiveSessions.slice(0, 3).map((session) => (
            <SessionKeyCard
              key={session.sessionId}
              {...session}
              onRevoke={onRevoke}
              onExtend={onExtend}
            />
          ))}
          {inactiveSessions.length > 3 && (
            <p className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>
              + {inactiveSessions.length - 3} more past sessions
            </p>
          )}
        </div>
      )}
    </div>
  )
}
