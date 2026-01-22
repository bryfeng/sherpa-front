/**
 * Copy Trading Hooks
 *
 * Manages copy trading relationships, executions, and leader discovery using Convex.
 */

import { useCallback, useMemo } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'

// ============================================
// TYPES
// ============================================

export interface CopyConfig {
  leaderAddress: string
  leaderChain: string
  leaderLabel?: string
  sizingMode: 'percentage' | 'fixed' | 'proportional'
  sizeValue: string
  minTradeUsd: string
  maxTradeUsd?: string
  tokenWhitelist?: string[]
  tokenBlacklist?: string[]
  allowedActions: string[]
  delaySeconds: number
  maxDelaySeconds: number
  maxSlippageBps: number
  maxDailyTrades: number
  maxDailyVolumeUsd: string
  sessionKeyId?: string
}

export interface CopyRelationship {
  _id: string
  _creationTime: number
  id: string
  userId: string
  followerAddress: string
  followerChain: string
  config: CopyConfig
  isActive: boolean
  isPaused: boolean
  pauseReason?: string
  dailyTradeCount: number
  dailyVolumeUsd: string
  dailyResetAt: number
  totalTrades: number
  successfulTrades: number
  failedTrades: number
  skippedTrades: number
  totalVolumeUsd: string
  totalPnlUsd?: string
  createdAt: number
  updatedAt: number
  lastCopyAt?: number
}

export interface TradeSignal {
  leaderAddress: string
  leaderChain: string
  txHash: string
  blockNumber: number
  timestamp: number
  action: string
  tokenInAddress: string
  tokenInSymbol?: string
  tokenInAmount: string
  tokenOutAddress: string
  tokenOutSymbol?: string
  tokenOutAmount?: string
  valueUsd?: string
  dex?: string
}

export interface CopyExecution {
  _id: string
  _creationTime: number
  id: string
  relationshipId: string
  signal: TradeSignal
  status: 'pending' | 'pending_approval' | 'queued' | 'executing' | 'completed' | 'failed' | 'skipped' | 'cancelled' | 'expired'
  skipReason?: string
  calculatedSizeUsd?: string
  actualSizeUsd?: string
  txHash?: string
  gasUsed?: number
  gasPriceGwei?: string
  gasCostUsd?: string
  tokenOutAmount?: string
  slippageBps?: number
  errorMessage?: string
  signalReceivedAt: number
  executionStartedAt?: number
  executionCompletedAt?: number
  // Enriched fields from getPendingApprovals
  relationship?: {
    id: string
    leaderLabel?: string
    leaderAddress: string
    sizingMode: string
    sizeValue: string
  }
}

export interface LeaderProfile {
  _id: string
  _creationTime: number
  address: string
  chain: string
  label?: string
  notes?: string
  totalTrades: number
  winRate?: number
  avgTradePnlPercent?: number
  totalPnlUsd?: number
  sharpeRatio?: number
  maxDrawdownPercent?: number
  avgTradesPerDay?: number
  mostTradedTokens: string[]
  preferredSectors: string[]
  followerCount: number
  totalCopiedVolumeUsd: number
  isActive: boolean
  firstSeenAt: number
  lastActiveAt: number
  dataQualityScore: number
  lastAnalyzedAt?: number
}

export interface CopyStats {
  totalRelationships: number
  activeRelationships: number
  pausedRelationships: number
  totalTrades: number
  successfulTrades: number
  failedTrades: number
  skippedTrades: number
  totalVolumeUsd: number
  totalPnlUsd: number
  successRate: number
}

export interface CopyConfigUpdate {
  sizingMode?: string
  sizeValue?: string
  minTradeUsd?: string
  maxTradeUsd?: string
  tokenWhitelist?: string[]
  tokenBlacklist?: string[]
  allowedActions?: string[]
  delaySeconds?: number
  maxDelaySeconds?: number
  maxSlippageBps?: number
  maxDailyTrades?: number
  maxDailyVolumeUsd?: string
  sessionKeyId?: string
}

// ============================================
// RELATIONSHIP QUERIES
// ============================================

/**
 * Get all copy relationships for a user
 */
export function useCopyRelationships(userId: string | null) {
  const relationships = useQuery(
    api.copyTrading.listByUser,
    userId ? { userId } : 'skip'
  )

  const sorted = useMemo(() => {
    if (!relationships) return []
    // Sort by active first, then by last copy time
    return [...relationships].sort((a, b) => {
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1
      if (a.isPaused !== b.isPaused) return a.isPaused ? 1 : -1
      return (b.lastCopyAt ?? 0) - (a.lastCopyAt ?? 0)
    }) as CopyRelationship[]
  }, [relationships])

  return {
    relationships: sorted,
    isLoading: relationships === undefined,
    isEmpty: relationships !== undefined && relationships.length === 0,
    activeCount: sorted.filter(r => r.isActive && !r.isPaused).length,
    pausedCount: sorted.filter(r => r.isPaused).length,
  }
}

/**
 * Get a single copy relationship by external ID
 */
export function useCopyRelationship(id: string | null) {
  const relationship = useQuery(
    api.copyTrading.getRelationship,
    id ? { id } : 'skip'
  )

  return {
    relationship: relationship as CopyRelationship | null | undefined,
    isLoading: relationship === undefined && id !== null,
  }
}

/**
 * Find relationship by user and leader (to check if already copying)
 */
export function useFindCopyRelationship(
  userId: string | null,
  leaderAddress: string | null,
  leaderChain: string | null
) {
  const relationship = useQuery(
    api.copyTrading.findRelationship,
    userId && leaderAddress && leaderChain
      ? { userId, leaderAddress, leaderChain }
      : 'skip'
  )

  return {
    relationship: relationship as CopyRelationship | null | undefined,
    isLoading: relationship === undefined && userId !== null,
    exists: relationship !== null && relationship !== undefined,
  }
}

// ============================================
// EXECUTION QUERIES
// ============================================

/**
 * Get executions for a relationship
 */
export function useCopyExecutions(
  relationshipId: string | null,
  options?: { limit?: number; status?: string }
) {
  const executions = useQuery(
    api.copyTrading.listExecutions,
    relationshipId
      ? { relationshipId, limit: options?.limit, status: options?.status }
      : 'skip'
  )

  return {
    executions: (executions ?? []) as CopyExecution[],
    isLoading: executions === undefined && relationshipId !== null,
    isEmpty: executions !== undefined && executions.length === 0,
  }
}

/**
 * Get a single execution by ID
 */
export function useCopyExecution(id: string | null) {
  const execution = useQuery(
    api.copyTrading.getExecution,
    id ? { id } : 'skip'
  )

  return {
    execution: execution as CopyExecution | null | undefined,
    isLoading: execution === undefined && id !== null,
  }
}

/**
 * Get pending approvals for a user (across all relationships)
 */
export function usePendingCopyApprovals(userId: string | null) {
  const approvals = useQuery(
    api.copyTrading.getPendingApprovals,
    userId ? { userId } : 'skip'
  )

  return {
    approvals: (approvals ?? []) as CopyExecution[],
    isLoading: approvals === undefined && userId !== null,
    count: approvals?.length ?? 0,
    hasApprovals: (approvals?.length ?? 0) > 0,
  }
}

// ============================================
// LEADER QUERIES
// ============================================

/**
 * Get leaderboard of top performing wallets
 */
export function useLeaderboard(options?: {
  chain?: string
  sortBy?: 'totalPnlUsd' | 'winRate' | 'followerCount' | 'totalTrades'
  limit?: number
  minTrades?: number
}) {
  const leaders = useQuery(api.copyTrading.getLeaderboard, {
    chain: options?.chain,
    sortBy: options?.sortBy,
    limit: options?.limit,
    minTrades: options?.minTrades,
  })

  return {
    leaders: (leaders ?? []) as LeaderProfile[],
    isLoading: leaders === undefined,
    isEmpty: leaders !== undefined && leaders.length === 0,
  }
}

/**
 * Get a single leader profile by address
 */
export function useLeaderProfile(address: string | null, chain: string | null) {
  const leader = useQuery(
    api.copyTrading.getWatchedWallet,
    address && chain ? { address, chain } : 'skip'
  )

  return {
    leader: leader as LeaderProfile | null | undefined,
    isLoading: leader === undefined && address !== null,
  }
}

// ============================================
// STATS QUERIES
// ============================================

/**
 * Get aggregate copy trading stats for a user
 */
export function useCopyStats(userId: string | null) {
  const stats = useQuery(
    api.copyTrading.getUserCopyStats,
    userId ? { userId } : 'skip'
  )

  return {
    stats: stats as CopyStats | undefined,
    isLoading: stats === undefined && userId !== null,
  }
}

// ============================================
// RELATIONSHIP MUTATIONS
// ============================================

/**
 * Mutations for managing copy relationships
 */
export function useCopyRelationshipMutations() {
  const pauseMutation = useMutation(api.copyTrading.pauseRelationship)
  const resumeMutation = useMutation(api.copyTrading.resumeRelationship)
  const deleteMutation = useMutation(api.copyTrading.deleteRelationship)
  const updateConfigMutation = useMutation(api.copyTrading.updateRelationshipConfig)
  const upsertMutation = useMutation(api.copyTrading.upsertRelationship)

  const pause = useCallback(
    async (id: string, reason?: string) => {
      return await pauseMutation({ id, reason })
    },
    [pauseMutation]
  )

  const resume = useCallback(
    async (id: string) => {
      return await resumeMutation({ id })
    },
    [resumeMutation]
  )

  const remove = useCallback(
    async (id: string) => {
      return await deleteMutation({ id })
    },
    [deleteMutation]
  )

  const updateConfig = useCallback(
    async (id: string, config: CopyConfigUpdate) => {
      return await updateConfigMutation({ id, config })
    },
    [updateConfigMutation]
  )

  const create = useCallback(
    async (params: {
      id: string
      userId: string
      followerAddress: string
      followerChain: string
      config: CopyConfig
    }) => {
      const now = Date.now()
      return await upsertMutation({
        id: params.id,
        userId: params.userId,
        followerAddress: params.followerAddress,
        followerChain: params.followerChain,
        config: params.config,
        isActive: true,
        isPaused: false,
        dailyTradeCount: 0,
        dailyVolumeUsd: '0',
        dailyResetAt: now,
        totalTrades: 0,
        successfulTrades: 0,
        failedTrades: 0,
        skippedTrades: 0,
        totalVolumeUsd: '0',
        createdAt: now,
        updatedAt: now,
      })
    },
    [upsertMutation]
  )

  return {
    create,
    pause,
    resume,
    remove,
    updateConfig,
  }
}

// ============================================
// EXECUTION MUTATIONS
// ============================================

/**
 * Mutations for managing copy executions
 */
export function useCopyExecutionMutations() {
  const approveMutation = useMutation(api.copyTrading.approveExecution)
  const rejectMutation = useMutation(api.copyTrading.rejectExecution)
  const completeMutation = useMutation(api.copyTrading.completeExecution)
  const failMutation = useMutation(api.copyTrading.failExecution)

  const approve = useCallback(
    async (id: string) => {
      return await approveMutation({ id })
    },
    [approveMutation]
  )

  const reject = useCallback(
    async (id: string, reason?: string) => {
      return await rejectMutation({ id, reason })
    },
    [rejectMutation]
  )

  const complete = useCallback(
    async (params: {
      id: string
      txHash: string
      actualSizeUsd: string
      tokenOutAmount?: string
      slippageBps?: number
      gasUsed?: number
      gasCostUsd?: string
    }) => {
      return await completeMutation(params)
    },
    [completeMutation]
  )

  const fail = useCallback(
    async (id: string, errorMessage: string) => {
      return await failMutation({ id, errorMessage })
    },
    [failMutation]
  )

  return {
    approve,
    reject,
    complete,
    fail,
  }
}

// ============================================
// STATUS HELPERS
// ============================================

export function getRelationshipStatus(
  relationship: CopyRelationship
): 'active' | 'paused' | 'inactive' | 'error' {
  if (!relationship.isActive) return 'inactive'
  if (relationship.isPaused) return 'paused'
  return 'active'
}

export function getRelationshipStatusColor(status: 'active' | 'paused' | 'inactive' | 'error'): string {
  switch (status) {
    case 'active':
      return 'green'
    case 'paused':
      return 'yellow'
    case 'inactive':
      return 'gray'
    case 'error':
      return 'red'
  }
}

export function getExecutionStatusColor(status: CopyExecution['status']): string {
  switch (status) {
    case 'completed':
      return 'green'
    case 'pending':
    case 'pending_approval':
      return 'yellow'
    case 'queued':
    case 'executing':
      return 'blue'
    case 'failed':
      return 'red'
    case 'skipped':
    case 'cancelled':
    case 'expired':
      return 'gray'
  }
}

export function canPauseRelationship(relationship: CopyRelationship): boolean {
  return relationship.isActive && !relationship.isPaused
}

export function canResumeRelationship(relationship: CopyRelationship): boolean {
  return relationship.isActive && relationship.isPaused
}

export function canDeleteRelationship(relationship: CopyRelationship): boolean {
  return relationship.isActive
}

// ============================================
// FORMATTING HELPERS
// ============================================

export function formatRelativeTime(timestamp: number | undefined): string {
  if (!timestamp) return 'Never'

  const now = Date.now()
  const diff = now - timestamp

  if (diff < 60000) return 'Just now'
  if (diff < 3600000) {
    const mins = Math.round(diff / 60000)
    return `${mins}m ago`
  }
  if (diff < 86400000) {
    const hours = Math.round(diff / 3600000)
    return `${hours}h ago`
  }

  const days = Math.round(diff / 86400000)
  return `${days}d ago`
}

export function formatUsdValue(value: string | number | undefined): string {
  if (value === undefined || value === null) return '$0'
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return '$0'

  if (num >= 1000000) {
    return `$${(num / 1000000).toFixed(2)}M`
  }
  if (num >= 1000) {
    return `$${(num / 1000).toFixed(2)}K`
  }
  return `$${num.toFixed(2)}`
}

export function formatPercentage(value: number | undefined): string {
  if (value === undefined || value === null) return '0%'
  return `${value.toFixed(1)}%`
}

export function formatSizingMode(mode: string, value: string): string {
  switch (mode) {
    case 'percentage':
      return `${value}% of leader`
    case 'fixed':
      return `$${value} fixed`
    case 'proportional':
      return 'Proportional'
    default:
      return mode
  }
}

export function truncateAddress(address: string, chars = 4): string {
  if (!address) return ''
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`
}

// ============================================
// SKIP REASONS
// ============================================

export const SKIP_REASONS: Record<string, string> = {
  BELOW_MIN_TRADE: 'Trade value below minimum',
  ABOVE_MAX_TRADE: 'Trade value above maximum',
  DAILY_TRADE_LIMIT: 'Daily trade limit reached',
  DAILY_VOLUME_LIMIT: 'Daily volume limit reached',
  TOKEN_BLACKLISTED: 'Token is blacklisted',
  TOKEN_NOT_WHITELISTED: 'Token not in whitelist',
  ACTION_NOT_ALLOWED: 'Action type not allowed',
  SESSION_KEY_EXPIRED: 'Session key expired',
  INSUFFICIENT_BALANCE: 'Insufficient balance',
  HIGH_SLIPPAGE: 'Slippage too high',
  PAUSED: 'Copying is paused',
}

export function formatSkipReason(reason: string | undefined): string {
  if (!reason) return 'Unknown reason'
  return SKIP_REASONS[reason] ?? reason
}
