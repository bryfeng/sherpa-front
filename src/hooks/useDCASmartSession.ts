/**
 * DCA Smart Session Hook
 *
 * Combines Smart Session management with DCA strategy activation.
 * Handles the flow: Check session → Grant if needed → Activate strategy.
 */

import { useQuery, useMutation } from 'convex/react'
import { useCallback, useMemo } from 'react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

// ============================================
// TYPES
// ============================================

export interface SmartSession {
  _id: Id<'smartSessions'>
  sessionId: string
  smartAccountAddress: string
  spendingLimitUsd: number
  allowedContracts: string[]
  allowedTokens: string[]
  allowedActions: string[]
  validUntil: number
  status: 'active' | 'expired' | 'revoked'
  totalSpentUsd?: number
  transactionCount?: number
  lastUsedAt?: number
  grantTxHash?: string
  createdAt: number
}

export interface SessionRequirements {
  spendingLimitUsd: number
  allowedTokens: string[]
  allowedContracts: string[]
  allowedActions: string[]
  validDays: number
}

export interface UseDCASmartSessionOptions {
  strategyId: Id<'dcaStrategies'> | null
  smartAccountAddress: string | null
}

// ============================================
// MAIN HOOK
// ============================================

export function useDCASmartSession({
  strategyId,
  smartAccountAddress,
}: UseDCASmartSessionOptions) {
  // Query strategy
  const strategy = useQuery(
    api.dca.get,
    strategyId ? { id: strategyId } : 'skip'
  )

  // Query active smart session
  const activeSession = useQuery(
    api.smartSessions.getActive,
    smartAccountAddress ? { smartAccountAddress } : 'skip'
  )

  // Query all sessions for the account
  const sessions = useQuery(
    api.smartSessions.listBySmartAccount,
    smartAccountAddress ? { smartAccountAddress, includeExpired: false } : 'skip'
  )

  // Mutations
  const activateWithSmartSessionMutation = useMutation(api.dca.activateWithSmartSession)
  const createSessionMutation = useMutation(api.smartSessions.create)

  // Derived state
  const hasSmartSession = useMemo(() => {
    return !!activeSession
  }, [activeSession])

  const strategyHasSession = useMemo(() => {
    return !!strategy?.smartSessionId
  }, [strategy?.smartSessionId])

  const canActivate = useMemo(() => {
    if (!strategy) return false
    if (strategy.status !== 'draft' && strategy.status !== 'pending_session') return false
    return hasSmartSession || strategyHasSession
  }, [strategy, hasSmartSession, strategyHasSession])

  const needsSession = useMemo(() => {
    if (!strategy) return false
    return (
      (strategy.status === 'draft' || strategy.status === 'pending_session') &&
      !hasSmartSession &&
      !strategyHasSession
    )
  }, [strategy, hasSmartSession, strategyHasSession])

  const isLoading =
    (strategyId !== null && strategy === undefined) ||
    (smartAccountAddress !== null && activeSession === undefined)

  // Calculate required session params from strategy
  const sessionRequirements = useMemo((): SessionRequirements | null => {
    if (!strategy) return null

    // Calculate spending limit: amount per execution * estimated executions
    const estimatedExecutions = strategy.maxExecutions ?? 365 // Default 1 year of daily
    const spendingLimitUsd = strategy.amountPerExecutionUsd * estimatedExecutions

    // Get token addresses
    const allowedTokens = [
      strategy.fromToken.address.toLowerCase(),
      strategy.toToken.address.toLowerCase(),
    ]

    // Common DEX contracts (would be expanded based on chain)
    const allowedContracts: string[] = []

    return {
      spendingLimitUsd,
      allowedTokens,
      allowedContracts,
      allowedActions: ['swap'],
      validDays: 365, // 1 year default
    }
  }, [strategy])

  // Activate strategy with smart session
  const activateWithSession = useCallback(
    async (options?: { nextExecutionAt?: number }) => {
      if (!strategyId) {
        throw new Error('Strategy ID required')
      }

      // Get the session ID to use
      let sessionId: string | undefined

      // First, check if strategy already has a session
      if (strategy?.smartSessionId) {
        sessionId = strategy.smartSessionId
      }
      // Otherwise, use the active session
      else if (activeSession) {
        sessionId = activeSession.sessionId
      }

      if (!sessionId) {
        throw new Error('No smart session available. Grant a session first.')
      }

      // Calculate next execution time
      const nextExecutionAt = options?.nextExecutionAt ?? calculateNextExecution(strategy)

      await activateWithSmartSessionMutation({
        strategyId,
        smartSessionId: sessionId,
        nextExecutionAt,
      })

      return { success: true }
    },
    [strategyId, strategy, activeSession, activateWithSmartSessionMutation]
  )

  // Create/record a new smart session (after on-chain grant)
  const recordSessionGrant = useCallback(
    async (params: {
      sessionId: string
      grantTxHash?: string
      spendingLimitUsd: number
      allowedContracts: string[]
      allowedTokens: string[]
      allowedActions: string[]
      validUntil: number
    }) => {
      if (!smartAccountAddress) {
        throw new Error('Smart account address required')
      }

      await createSessionMutation({
        smartAccountAddress,
        sessionId: params.sessionId,
        spendingLimitUsd: params.spendingLimitUsd,
        allowedContracts: params.allowedContracts,
        allowedTokens: params.allowedTokens,
        allowedActions: params.allowedActions,
        validUntil: params.validUntil,
        grantTxHash: params.grantTxHash,
      })

      return { sessionId: params.sessionId }
    },
    [smartAccountAddress, createSessionMutation]
  )

  return {
    // Data
    strategy,
    activeSession: activeSession as SmartSession | null | undefined,
    sessions: (sessions ?? []) as SmartSession[],
    sessionRequirements,

    // State
    hasSmartSession,
    strategyHasSession,
    canActivate,
    needsSession,
    isLoading,

    // Actions
    activateWithSession,
    recordSessionGrant,
  }
}

// ============================================
// HELPERS
// ============================================

/**
 * Calculate next execution time based on strategy frequency.
 */
function calculateNextExecution(strategy: { frequency: string; executionHourUtc: number; executionDayOfWeek?: number; executionDayOfMonth?: number } | null | undefined): number {
  if (!strategy) {
    return Date.now() + 3600000 // 1 hour from now
  }

  const now = new Date()
  const targetHour = strategy.executionHourUtc

  // Start with today at target hour
  const next = new Date(now)
  next.setUTCHours(targetHour, 0, 0, 0)

  // If we're past today's target time, start from tomorrow
  if (next.getTime() <= now.getTime()) {
    next.setUTCDate(next.getUTCDate() + 1)
  }

  switch (strategy.frequency) {
    case 'hourly':
      // Next hour
      return now.getTime() + 3600000

    case 'daily':
      return next.getTime()

    case 'weekly':
      // Find next occurrence of target day
      const targetDay = strategy.executionDayOfWeek ?? 1 // Default Monday
      while (next.getUTCDay() !== targetDay) {
        next.setUTCDate(next.getUTCDate() + 1)
      }
      return next.getTime()

    case 'biweekly':
      // Find next occurrence of target day, then add a week
      const biweeklyTargetDay = strategy.executionDayOfWeek ?? 1
      while (next.getUTCDay() !== biweeklyTargetDay) {
        next.setUTCDate(next.getUTCDate() + 1)
      }
      return next.getTime()

    case 'monthly':
      // Find next occurrence of target day of month
      const targetDayOfMonth = strategy.executionDayOfMonth ?? 1
      next.setUTCDate(targetDayOfMonth)
      if (next.getTime() <= now.getTime()) {
        next.setUTCMonth(next.getUTCMonth() + 1)
      }
      return next.getTime()

    default:
      return next.getTime()
  }
}

// ============================================
// SMART SESSIONS LIST HOOK
// ============================================

export function useSmartSessions(smartAccountAddress: string | null) {
  const sessions = useQuery(
    api.smartSessions.listBySmartAccount,
    smartAccountAddress ? { smartAccountAddress } : 'skip'
  )

  const activeSession = useQuery(
    api.smartSessions.getActive,
    smartAccountAddress ? { smartAccountAddress } : 'skip'
  )

  return {
    sessions: (sessions ?? []) as SmartSession[],
    activeSession: activeSession as SmartSession | null | undefined,
    isLoading: sessions === undefined && smartAccountAddress !== null,
    hasActive: !!activeSession,
  }
}

// ============================================
// SESSION STATS HOOK
// ============================================

export function useSmartSessionStats(smartAccountAddress: string | null) {
  const stats = useQuery(
    api.smartSessions.getStats,
    smartAccountAddress ? { smartAccountAddress } : 'skip'
  )

  return {
    stats,
    isLoading: stats === undefined && smartAccountAddress !== null,
  }
}
