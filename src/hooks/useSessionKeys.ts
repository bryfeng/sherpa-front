import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useCallback, useMemo } from 'react'
import type { SessionKeyConfig, Permission } from '../types/policy'

export interface UseSessionKeysOptions {
  walletAddress?: string
  includeExpired?: boolean
  includeRevoked?: boolean
}

export interface SessionKeyData {
  sessionId: string
  walletAddress: string
  agentId?: string
  permissions: Permission[]
  maxValuePerTxUsd: number
  maxTotalValueUsd: number
  totalValueUsedUsd: number
  transactionCount: number
  maxTransactions?: number
  chainAllowlist: number[]
  tokenAllowlist: string[]
  contractAllowlist: string[]
  status: 'active' | 'expired' | 'revoked' | 'exhausted'
  expiresAt: number
  createdAt: number
  lastUsedAt?: number
  revokedAt?: number
  revokeReason?: string
}

export interface UseSessionKeysReturn {
  // Data
  sessions: SessionKeyData[]
  activeCount: number
  isLoading: boolean

  // Actions
  create: (config: SessionKeyConfig) => Promise<string>
  revoke: (sessionId: string, reason: string) => Promise<void>
  extend: (sessionId: string, additionalDays: number) => Promise<void>

  // Helpers
  getSession: (sessionId: string) => SessionKeyData | undefined
  getBudgetUsage: (sessionId: string) => { used: number; total: number; percent: number } | undefined
  getDaysRemaining: (sessionId: string) => number | undefined
}

/**
 * Hook for managing session keys.
 */
export function useSessionKeys({
  walletAddress,
  includeExpired = false,
  includeRevoked = false,
}: UseSessionKeysOptions): UseSessionKeysReturn {
  // Query sessions from Convex
  const sessionsData = useQuery(
    api.sessionKeys.listByWallet,
    walletAddress
      ? { walletAddress, includeExpired, includeRevoked }
      : 'skip'
  )

  // Mutations
  const createMutation = useMutation(api.sessionKeys.create)
  const revokeMutation = useMutation(api.sessionKeys.revoke)
  const extendMutation = useMutation(api.sessionKeys.extend)

  // Transform sessions
  const sessions: SessionKeyData[] = useMemo(() => {
    if (!sessionsData) return []

    return sessionsData.map((s) => ({
      sessionId: s.sessionId,
      walletAddress: s.walletAddress,
      agentId: s.agentId ?? undefined,
      permissions: s.permissions as Permission[],
      maxValuePerTxUsd: parseFloat(s.valueLimits.maxValuePerTxUsd),
      maxTotalValueUsd: parseFloat(s.valueLimits.maxTotalValueUsd),
      totalValueUsedUsd: parseFloat(s.valueLimits.totalValueUsedUsd),
      transactionCount: s.valueLimits.transactionCount,
      maxTransactions: s.valueLimits.maxTransactions,
      chainAllowlist: s.chainAllowlist,
      tokenAllowlist: s.tokenAllowlist,
      contractAllowlist: s.contractAllowlist,
      status: s.status,
      expiresAt: s.expiresAt,
      createdAt: s.createdAt,
      lastUsedAt: s.lastUsedAt ?? undefined,
      revokedAt: s.revokedAt ?? undefined,
      revokeReason: s.revokeReason ?? undefined,
    }))
  }, [sessionsData])

  const activeCount = useMemo(() => {
    const now = Date.now()
    return sessions.filter((s) => s.status === 'active' && s.expiresAt > now).length
  }, [sessions])

  const isLoading = sessionsData === undefined && walletAddress !== undefined

  // Create session handler
  const create = useCallback(
    async (config: SessionKeyConfig): Promise<string> => {
      if (!walletAddress) {
        throw new Error('Wallet address required to create session')
      }

      const sessionId = `sk_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

      await createMutation({
        sessionId,
        walletAddress,
        permissions: config.permissions,
        valueLimits: {
          maxValuePerTxUsd: config.valueLimits.maxValuePerTxUsd.toString(),
          maxTotalValueUsd: config.valueLimits.maxTotalValueUsd.toString(),
          maxTransactions: config.valueLimits.maxTransactions,
          totalValueUsedUsd: '0',
          transactionCount: 0,
        },
        chainAllowlist: config.chainAllowlist,
        contractAllowlist: config.contractAllowlist,
        tokenAllowlist: config.tokenAllowlist,
        createdAt: Date.now(),
        expiresAt: config.expiresAt,
        status: 'active',
      })

      return sessionId
    },
    [walletAddress, createMutation]
  )

  // Revoke session handler
  const revoke = useCallback(
    async (sessionId: string, reason: string) => {
      await revokeMutation({
        sessionId,
        revokedAt: Date.now(),
        revokeReason: reason,
      })
    },
    [revokeMutation]
  )

  // Extend session handler
  const extend = useCallback(
    async (sessionId: string, additionalDays: number) => {
      await extendMutation({
        sessionId,
        additionalDays,
      })
    },
    [extendMutation]
  )

  // Helper: get session by ID
  const getSession = useCallback(
    (sessionId: string) => sessions.find((s) => s.sessionId === sessionId),
    [sessions]
  )

  // Helper: get budget usage
  const getBudgetUsage = useCallback(
    (sessionId: string) => {
      const session = sessions.find((s) => s.sessionId === sessionId)
      if (!session) return undefined

      const used = session.totalValueUsedUsd
      const total = session.maxTotalValueUsd
      const percent = total > 0 ? (used / total) * 100 : 0

      return { used, total, percent }
    },
    [sessions]
  )

  // Helper: get days remaining
  const getDaysRemaining = useCallback(
    (sessionId: string) => {
      const session = sessions.find((s) => s.sessionId === sessionId)
      if (!session) return undefined

      const now = Date.now()
      const remaining = session.expiresAt - now
      return Math.max(0, Math.ceil(remaining / (24 * 60 * 60 * 1000)))
    },
    [sessions]
  )

  return {
    sessions,
    activeCount,
    isLoading,
    create,
    revoke,
    extend,
    getSession,
    getBudgetUsage,
    getDaysRemaining,
  }
}

/**
 * Hook to get just the active session count.
 */
export function useActiveSessionCount(walletAddress?: string): number {
  const count = useQuery(
    api.sessionKeys.getActiveCount,
    walletAddress ? { walletAddress } : 'skip'
  )
  return count ?? 0
}
