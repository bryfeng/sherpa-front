/**
 * Hook for managing Rhinestone Smart Sessions.
 *
 * Provides functionality to:
 * - Query existing Smart Sessions for a Smart Account
 * - Grant new on-chain session permissions (ERC-7715)
 * - Track session usage and spending
 * - Revoke sessions
 *
 * @module hooks/useSmartSessions
 */

import { useState, useCallback, useMemo } from 'react'
import { useAccount, useWalletClient, usePublicClient } from 'wagmi'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'

// Smart Session permission types
export type SmartSessionAction = 'swap' | 'bridge' | 'transfer' | 'approve' | 'stake' | 'unstake'

export interface SmartSessionConfig {
  /** Maximum spending limit in USD */
  spendingLimitUsd: number
  /** Contracts the session can interact with */
  allowedContracts: string[]
  /** Tokens the session can spend/receive */
  allowedTokens: string[]
  /** Actions permitted (swap, bridge, transfer, etc.) */
  allowedActions: SmartSessionAction[]
  /** Session validity duration in seconds */
  validityDuration: number
}

export interface SmartSessionData {
  /** Unique session identifier */
  sessionId: string
  /** Smart Account this session belongs to */
  smartAccountAddress: string
  /** Maximum spending limit in USD */
  spendingLimitUsd: number
  /** Total amount spent in USD */
  totalSpentUsd: number
  /** Allowed contract addresses */
  allowedContracts: string[]
  /** Allowed token addresses */
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
  /** Grant transaction hash */
  grantTxHash?: string
  /** Revoke transaction hash */
  revokeTxHash?: string
}

export interface UseSmartSessionsOptions {
  /** Smart Account address (uses connected account by default) */
  smartAccountAddress?: string
  /** Include expired sessions in list */
  includeExpired?: boolean
  /** Include revoked sessions in list */
  includeRevoked?: boolean
}

export interface UseSmartSessionsReturn {
  // State
  sessions: SmartSessionData[]
  activeSession: SmartSessionData | null
  isLoading: boolean
  isGranting: boolean
  isRevoking: boolean
  error: string | null

  // Actions
  grantSession: (config: SmartSessionConfig) => Promise<string | null>
  revokeSession: (sessionId: string) => Promise<boolean>
  refreshSessions: () => Promise<void>

  // Helpers
  hasActiveSession: boolean
  getSpendingRemaining: () => number
  getTimeRemaining: () => number // seconds
  canExecuteAction: (action: SmartSessionAction) => boolean
}

/**
 * Hook for managing Rhinestone Smart Sessions.
 *
 * @example
 * ```tsx
 * function SessionManager() {
 *   const {
 *     sessions,
 *     activeSession,
 *     grantSession,
 *     hasActiveSession,
 *     getSpendingRemaining
 *   } = useSmartSessions()
 *
 *   const handleGrant = async () => {
 *     await grantSession({
 *       spendingLimitUsd: 100,
 *       allowedContracts: ['0x...'],
 *       allowedTokens: ['0x...'],
 *       allowedActions: ['swap', 'bridge'],
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
export function useSmartSessions({
  smartAccountAddress: externalAddress,
  includeExpired = false,
  includeRevoked = false,
}: UseSmartSessionsOptions = {}): UseSmartSessionsReturn {
  const { address: eoaAddress, chainId } = useAccount()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()

  const [isGranting, setIsGranting] = useState(false)
  const [isRevoking, setIsRevoking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Get Smart Account for EOA
  const smartAccount = useQuery(
    api.smartAccounts.getByOwner,
    eoaAddress ? { ownerAddress: eoaAddress } : 'skip'
  )

  const effectiveAddress = externalAddress ?? smartAccount?.smartAccountAddress

  // Query sessions from Convex
  const sessionsData = useQuery(
    api.smartSessions.listBySmartAccount,
    effectiveAddress
      ? { smartAccountAddress: effectiveAddress, includeExpired, includeRevoked }
      : 'skip'
  )

  // Query active session
  const activeSessionData = useQuery(
    api.smartSessions.getActive,
    effectiveAddress ? { smartAccountAddress: effectiveAddress } : 'skip'
  )

  // Mutations
  const createSessionMutation = useMutation(api.smartSessions.create)
  const revokeSessionMutation = useMutation(api.smartSessions.revoke)

  // Transform sessions data
  const sessions: SmartSessionData[] = useMemo(() => {
    if (!sessionsData) return []

    return sessionsData.map((s) => ({
      sessionId: s.sessionId,
      smartAccountAddress: s.smartAccountAddress,
      spendingLimitUsd: s.spendingLimitUsd,
      totalSpentUsd: s.totalSpentUsd ?? 0,
      allowedContracts: s.allowedContracts,
      allowedTokens: s.allowedTokens,
      allowedActions: s.allowedActions,
      validUntil: s.validUntil,
      status: s.status,
      transactionCount: s.transactionCount ?? 0,
      createdAt: s.createdAt,
      lastUsedAt: s.lastUsedAt ?? undefined,
      grantTxHash: s.grantTxHash ?? undefined,
      revokeTxHash: s.revokeTxHash ?? undefined,
    }))
  }, [sessionsData])

  // Transform active session
  const activeSession: SmartSessionData | null = useMemo(() => {
    if (!activeSessionData) return null

    return {
      sessionId: activeSessionData.sessionId,
      smartAccountAddress: activeSessionData.smartAccountAddress,
      spendingLimitUsd: activeSessionData.spendingLimitUsd,
      totalSpentUsd: activeSessionData.totalSpentUsd ?? 0,
      allowedContracts: activeSessionData.allowedContracts,
      allowedTokens: activeSessionData.allowedTokens,
      allowedActions: activeSessionData.allowedActions,
      validUntil: activeSessionData.validUntil,
      status: activeSessionData.status,
      transactionCount: activeSessionData.transactionCount ?? 0,
      createdAt: activeSessionData.createdAt,
      lastUsedAt: activeSessionData.lastUsedAt ?? undefined,
      grantTxHash: activeSessionData.grantTxHash ?? undefined,
    }
  }, [activeSessionData])

  const isLoading =
    (sessionsData === undefined && effectiveAddress !== undefined) ||
    (smartAccount === undefined && eoaAddress !== undefined)

  /**
   * Grant a new Smart Session on-chain.
   */
  const grantSession = useCallback(
    async (config: SmartSessionConfig): Promise<string | null> => {
      if (!effectiveAddress || !walletClient || !chainId) {
        setError('Smart Account or wallet not connected')
        return null
      }

      setIsGranting(true)
      setError(null)

      try {
        // Import Rhinestone SDK dynamically
        const { RhinestoneSDK } = await import('@rhinestone/sdk')

        const rhinestone = new RhinestoneSDK()

        // Get the smart account instance
        const account = await rhinestone.getAccount({
          address: effectiveAddress as `0x${string}`,
          owners: {
            type: 'ecdsa',
            accounts: [walletClient],
          },
        })

        // Calculate validity timestamp
        const validUntil = Date.now() + config.validityDuration * 1000

        // Generate session ID
        const sessionId = `ss_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

        // Build session permission parameters
        // Note: This follows the ERC-7715 permission request format
        const sessionParams = {
          sessionId,
          validUntil: Math.floor(validUntil / 1000), // Unix timestamp in seconds
          policies: [
            {
              // Spending limit policy
              type: 'spending-limit',
              limit: config.spendingLimitUsd,
              currency: 'USD',
            },
            {
              // Contract allowlist policy
              type: 'contract-allowlist',
              contracts: config.allowedContracts,
            },
            {
              // Token allowlist policy
              type: 'token-allowlist',
              tokens: config.allowedTokens,
            },
            {
              // Action restriction policy
              type: 'action-allowlist',
              actions: config.allowedActions,
            },
          ],
        }

        // Request session grant from user (triggers wallet signature)
        const grantResult = await account.grantSession(sessionParams)

        // Get transaction hash if available
        const txHash = grantResult?.txHash ?? undefined

        // Save session to Convex
        await createSessionMutation({
          smartAccountAddress: effectiveAddress,
          sessionId,
          spendingLimitUsd: config.spendingLimitUsd,
          allowedContracts: config.allowedContracts,
          allowedTokens: config.allowedTokens,
          allowedActions: config.allowedActions,
          validUntil,
          grantTxHash: txHash,
        })

        setIsGranting(false)
        return sessionId
      } catch (err) {
        console.error('Error granting Smart Session:', err)
        setError(err instanceof Error ? err.message : 'Failed to grant session')
        setIsGranting(false)
        return null
      }
    },
    [effectiveAddress, walletClient, chainId, createSessionMutation]
  )

  /**
   * Revoke an existing Smart Session.
   */
  const revokeSession = useCallback(
    async (sessionId: string): Promise<boolean> => {
      if (!effectiveAddress || !walletClient) {
        setError('Smart Account or wallet not connected')
        return false
      }

      setIsRevoking(true)
      setError(null)

      try {
        // Import Rhinestone SDK dynamically
        const { RhinestoneSDK } = await import('@rhinestone/sdk')

        const rhinestone = new RhinestoneSDK()

        // Get the smart account instance
        const account = await rhinestone.getAccount({
          address: effectiveAddress as `0x${string}`,
          owners: {
            type: 'ecdsa',
            accounts: [walletClient],
          },
        })

        // Revoke session on-chain
        const revokeResult = await account.revokeSession(sessionId)

        // Update Convex record
        await revokeSessionMutation({
          sessionId,
          revokeTxHash: revokeResult?.txHash,
        })

        setIsRevoking(false)
        return true
      } catch (err) {
        console.error('Error revoking Smart Session:', err)
        setError(err instanceof Error ? err.message : 'Failed to revoke session')
        setIsRevoking(false)
        return false
      }
    },
    [effectiveAddress, walletClient, revokeSessionMutation]
  )

  /**
   * Refresh sessions list (Convex handles reactively, but this forces check).
   */
  const refreshSessions = useCallback(async () => {
    // Convex queries are reactive, so this is mainly for forcing UI updates
    // The actual refresh happens automatically via Convex subscriptions
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
    (action: SmartSessionAction): boolean => {
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
 * Hook to get just the active session status.
 */
export function useHasActiveSession(smartAccountAddress?: string): boolean {
  const activeSession = useQuery(
    api.smartSessions.getActive,
    smartAccountAddress ? { smartAccountAddress } : 'skip'
  )
  return activeSession !== null && activeSession !== undefined
}

/**
 * Hook to get session statistics.
 */
export function useSessionStats(smartAccountAddress?: string) {
  const stats = useQuery(
    api.smartSessions.getStats,
    smartAccountAddress ? { smartAccountAddress } : 'skip'
  )

  return {
    totalSessions: stats?.totalSessions ?? 0,
    activeSessions: stats?.activeSessions ?? 0,
    totalSpentUsd: stats?.totalSpentUsd ?? 0,
    totalTransactions: stats?.totalTransactions ?? 0,
    isLoading: stats === undefined && smartAccountAddress !== undefined,
  }
}

export default useSmartSessions
