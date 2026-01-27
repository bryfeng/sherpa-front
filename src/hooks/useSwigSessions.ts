/**
 * Hook for managing Swig Sessions (Solana).
 *
 * Provides functionality to:
 * - Query existing Swig sessions for a wallet
 * - Grant new session permissions (role-based)
 * - Track session usage and spending
 * - Revoke sessions
 *
 * @module hooks/useSwigSessions
 */

import { useState, useCallback, useMemo } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'

// Swig session permission types
export type SwigSessionAction = 'swap' | 'transfer' | 'stake' | 'unstake'

// Swig role types
export type SwigRole = 'agent' | 'dca' | 'copy_trading' | 'custom'

export interface SwigSessionConfig {
  /** Role name for the session */
  role: SwigRole
  /** Maximum spending limit in USD */
  spendingLimitUsd: number
  /** Programs the session can interact with */
  allowedPrograms: string[]
  /** Tokens the session can spend/receive (mint addresses) */
  allowedTokens: string[]
  /** Actions permitted (swap, transfer, etc.) */
  allowedActions: SwigSessionAction[]
  /** Session validity duration in seconds */
  validityDuration: number
}

export interface SwigSessionData {
  /** Unique session identifier */
  sessionId: string
  /** Swig wallet this session belongs to */
  swigWalletAddress: string
  /** Role name */
  role: string
  /** Maximum spending limit in USD */
  spendingLimitUsd: number
  /** Total amount spent in USD */
  totalSpentUsd: number
  /** Allowed program IDs */
  allowedPrograms: string[]
  /** Allowed token mint addresses */
  allowedTokens: string[]
  /** Allowed actions */
  allowedActions: string[]
  /** Session expiration timestamp (ms) */
  validUntil: number
  /** Session status */
  status: 'active' | 'expired' | 'revoked'
  /** Number of transactions executed */
  transactionCount: number
  /** Creation timestamp */
  createdAt: number
  /** Last usage timestamp */
  lastUsedAt?: number
  /** Grant transaction signature */
  grantTxSignature?: string
  /** Revoke transaction signature */
  revokeTxSignature?: string
}

export interface UseSwigSessionsOptions {
  /** Swig wallet address */
  swigWalletAddress?: string
  /** Solana wallet address (owner) */
  solanaAddress?: string
  /** Include expired sessions in list */
  includeExpired?: boolean
  /** Include revoked sessions in list */
  includeRevoked?: boolean
}

export interface UseSwigSessionsReturn {
  // State
  sessions: SwigSessionData[]
  activeSession: SwigSessionData | null
  isLoading: boolean
  isGranting: boolean
  isRevoking: boolean
  error: string | null

  // Actions
  grantSession: (config: SwigSessionConfig) => Promise<string | null>
  revokeSession: (sessionId: string) => Promise<boolean>
  refreshSessions: () => Promise<void>

  // Helpers
  hasActiveSession: boolean
  getSpendingRemaining: () => number
  getTimeRemaining: () => number // seconds
  canExecuteAction: (action: SwigSessionAction) => boolean
}

/**
 * Hook for managing Swig Sessions on Solana.
 *
 * @example
 * ```tsx
 * function SwigSessionManager() {
 *   const { publicKey } = useWallet()
 *   const { swigWalletAddress } = useSwigWallet({ solanaAddress: publicKey?.toBase58() })
 *   const {
 *     sessions,
 *     activeSession,
 *     grantSession,
 *     hasActiveSession,
 *     getSpendingRemaining
 *   } = useSwigSessions({ swigWalletAddress })
 *
 *   const handleGrant = async () => {
 *     await grantSession({
 *       role: 'agent',
 *       spendingLimitUsd: 100,
 *       allowedPrograms: ['JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4'],
 *       allowedTokens: ['So11111111111111111111111111111111111111112'],
 *       allowedActions: ['swap'],
 *       validityDuration: 7 * 24 * 60 * 60, // 7 days
 *     })
 *   }
 *
 *   return (
 *     <div>
 *       {hasActiveSession ? (
 *         <p>Remaining budget: ${getSpendingRemaining()}</p>
 *       ) : (
 *         <button onClick={handleGrant}>Enable Autonomous Mode</button>
 *       )}
 *     </div>
 *   )
 * }
 * ```
 */
export function useSwigSessions({
  swigWalletAddress: externalSwigAddress,
  solanaAddress,
  includeExpired = false,
  includeRevoked = false,
}: UseSwigSessionsOptions = {}): UseSwigSessionsReturn {
  const [isGranting, setIsGranting] = useState(false)
  const [isRevoking, setIsRevoking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Get Swig wallet for owner if not provided
  const swigWallet = useQuery(
    api.swigWallets.getByOwner,
    !externalSwigAddress && solanaAddress ? { ownerAddress: solanaAddress } : 'skip'
  )

  const effectiveAddress = externalSwigAddress ?? swigWallet?.swigWalletAddress

  // Query sessions from Convex
  const sessionsData = useQuery(
    api.swigSessions.listBySwigWallet,
    effectiveAddress
      ? { swigWalletAddress: effectiveAddress, includeExpired, includeRevoked }
      : 'skip'
  )

  // Query active session
  const activeSessionData = useQuery(
    api.swigSessions.getActive,
    effectiveAddress ? { swigWalletAddress: effectiveAddress } : 'skip'
  )

  // Mutations
  const createSessionMutation = useMutation(api.swigSessions.create)
  const revokeSessionMutation = useMutation(api.swigSessions.revoke)

  // Transform sessions data
  const sessions: SwigSessionData[] = useMemo(() => {
    if (!sessionsData) return []

    return sessionsData.map((s) => ({
      sessionId: s.sessionId,
      swigWalletAddress: s.swigWalletAddress,
      role: s.role,
      spendingLimitUsd: s.spendingLimitUsd,
      totalSpentUsd: s.totalSpentUsd ?? 0,
      allowedPrograms: s.allowedPrograms,
      allowedTokens: s.allowedTokens,
      allowedActions: s.allowedActions,
      validUntil: s.validUntil,
      status: s.status,
      transactionCount: s.transactionCount ?? 0,
      createdAt: s.createdAt,
      lastUsedAt: s.lastUsedAt ?? undefined,
      grantTxSignature: s.grantTxSignature ?? undefined,
      revokeTxSignature: s.revokeTxSignature ?? undefined,
    }))
  }, [sessionsData])

  // Transform active session
  const activeSession: SwigSessionData | null = useMemo(() => {
    if (!activeSessionData) return null

    return {
      sessionId: activeSessionData.sessionId,
      swigWalletAddress: activeSessionData.swigWalletAddress,
      role: activeSessionData.role,
      spendingLimitUsd: activeSessionData.spendingLimitUsd,
      totalSpentUsd: activeSessionData.totalSpentUsd ?? 0,
      allowedPrograms: activeSessionData.allowedPrograms,
      allowedTokens: activeSessionData.allowedTokens,
      allowedActions: activeSessionData.allowedActions,
      validUntil: activeSessionData.validUntil,
      status: activeSessionData.status,
      transactionCount: activeSessionData.transactionCount ?? 0,
      createdAt: activeSessionData.createdAt,
      lastUsedAt: activeSessionData.lastUsedAt ?? undefined,
      grantTxSignature: activeSessionData.grantTxSignature ?? undefined,
    }
  }, [activeSessionData])

  const isLoading =
    (sessionsData === undefined && effectiveAddress !== undefined) ||
    (swigWallet === undefined && solanaAddress !== undefined && !externalSwigAddress)

  /**
   * Grant a new Swig session on-chain.
   */
  const grantSession = useCallback(
    async (config: SwigSessionConfig): Promise<string | null> => {
      if (!effectiveAddress) {
        setError('Swig wallet not found')
        return null
      }

      setIsGranting(true)
      setError(null)

      try {
        // Import Swig SDK dynamically
        const { Swig, SwigRole: SwigRoleSDK } = await import('@swig-wallet/sdk')
        const { Connection, clusterApiUrl } = await import('@solana/web3.js')

        // Create connection
        const connection = new Connection(clusterApiUrl('mainnet-beta'))

        // Get Swig wallet instance
        const swigWallet = await Swig.load({
          connection,
          address: effectiveAddress,
        })

        // Calculate validity timestamp
        const validUntil = Date.now() + config.validityDuration * 1000

        // Generate session ID
        const sessionId = `swig_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

        // Build role configuration based on session config
        const roleConfig = {
          name: config.role,
          permissions: {
            spendingLimit: config.spendingLimitUsd,
            allowedPrograms: config.allowedPrograms,
            allowedTokens: config.allowedTokens,
            allowedActions: config.allowedActions,
            validUntil: Math.floor(validUntil / 1000), // Unix timestamp in seconds
          },
        }

        // Grant role (triggers wallet signature)
        const grantResult = await swigWallet.grantRole(roleConfig)

        // Get transaction signature if available
        const txSignature = grantResult?.signature ?? undefined

        // Save session to Convex
        await createSessionMutation({
          swigWalletAddress: effectiveAddress,
          sessionId,
          role: config.role,
          spendingLimitUsd: config.spendingLimitUsd,
          allowedPrograms: config.allowedPrograms,
          allowedTokens: config.allowedTokens,
          allowedActions: config.allowedActions,
          validUntil,
          grantTxSignature: txSignature,
        })

        setIsGranting(false)
        return sessionId
      } catch (err) {
        console.error('Error granting Swig session:', err)
        setError(err instanceof Error ? err.message : 'Failed to grant session')
        setIsGranting(false)
        return null
      }
    },
    [effectiveAddress, createSessionMutation]
  )

  /**
   * Revoke an existing Swig session.
   */
  const revokeSession = useCallback(
    async (sessionId: string): Promise<boolean> => {
      if (!effectiveAddress) {
        setError('Swig wallet not found')
        return false
      }

      setIsRevoking(true)
      setError(null)

      try {
        // Import Swig SDK dynamically
        const { Swig } = await import('@swig-wallet/sdk')
        const { Connection, clusterApiUrl } = await import('@solana/web3.js')

        // Create connection
        const connection = new Connection(clusterApiUrl('mainnet-beta'))

        // Get Swig wallet instance
        const swigWallet = await Swig.load({
          connection,
          address: effectiveAddress,
        })

        // Revoke session on-chain
        const revokeResult = await swigWallet.revokeRole(sessionId)

        // Update Convex record
        await revokeSessionMutation({
          sessionId,
          revokeTxSignature: revokeResult?.signature,
        })

        setIsRevoking(false)
        return true
      } catch (err) {
        console.error('Error revoking Swig session:', err)
        setError(err instanceof Error ? err.message : 'Failed to revoke session')
        setIsRevoking(false)
        return false
      }
    },
    [effectiveAddress, revokeSessionMutation]
  )

  /**
   * Refresh sessions list (Convex handles reactively).
   */
  const refreshSessions = useCallback(async () => {
    // Convex queries are reactive, so this is mainly for forcing UI updates
  }, [])

  // Helper: check if there's an active session
  const hasActiveSession = activeSession !== null && activeSession.status === 'active'

  // Helper: get remaining spending budget
  const getSpendingRemaining = useCallback(() => {
    if (!activeSession) return 0
    return Math.max(0, activeSession.spendingLimitUsd - activeSession.totalSpentUsd)
  }, [activeSession])

  // Helper: get remaining time in seconds
  const getTimeRemaining = useCallback(() => {
    if (!activeSession) return 0
    const remaining = activeSession.validUntil - Date.now()
    return Math.max(0, Math.floor(remaining / 1000))
  }, [activeSession])

  // Helper: check if action is permitted
  const canExecuteAction = useCallback(
    (action: SwigSessionAction): boolean => {
      if (!activeSession || activeSession.status !== 'active') return false
      if (activeSession.validUntil < Date.now()) return false
      if (activeSession.totalSpentUsd >= activeSession.spendingLimitUsd) return false
      return activeSession.allowedActions.includes(action)
    },
    [activeSession]
  )

  return {
    sessions,
    activeSession,
    isLoading,
    isGranting,
    isRevoking,
    error,
    grantSession,
    revokeSession,
    refreshSessions,
    hasActiveSession,
    getSpendingRemaining,
    getTimeRemaining,
    canExecuteAction,
  }
}

/**
 * Hook to get just the active Swig session status.
 */
export function useHasActiveSwigSession(swigWalletAddress?: string): boolean {
  const activeSession = useQuery(
    api.swigSessions.getActive,
    swigWalletAddress ? { swigWalletAddress } : 'skip'
  )
  return activeSession !== null && activeSession !== undefined
}

/**
 * Hook to get Swig session statistics.
 */
export function useSwigSessionStats(swigWalletAddress?: string) {
  const stats = useQuery(
    api.swigSessions.getStats,
    swigWalletAddress ? { swigWalletAddress } : 'skip'
  )

  return {
    totalSessions: stats?.totalSessions ?? 0,
    activeSessions: stats?.activeSessions ?? 0,
    totalSpentUsd: stats?.totalSpentUsd ?? 0,
    totalTransactions: stats?.totalTransactions ?? 0,
    isLoading: stats === undefined && swigWalletAddress !== undefined,
  }
}

export default useSwigSessions
