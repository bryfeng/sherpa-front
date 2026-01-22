/**
 * Copy Trading Types
 *
 * Type definitions for the copy trading system.
 */

// ============================================
// Sizing & Configuration
// ============================================

export type SizingMode = 'percentage' | 'fixed' | 'proportional'

export interface CopyConfig {
  // Leader identification
  leaderAddress: string
  leaderChain: string
  leaderLabel?: string

  // Position sizing
  sizingMode: SizingMode
  sizeValue: string // Decimal as string for precision

  // Trade limits
  minTradeUsd: string
  maxTradeUsd?: string

  // Token filtering
  tokenWhitelist?: string[]
  tokenBlacklist?: string[]
  allowedActions: string[] // e.g., ['swap']

  // Execution settings
  delaySeconds: number
  maxDelaySeconds: number
  maxSlippageBps: number

  // Daily limits
  maxDailyTrades: number
  maxDailyVolumeUsd: string

  // Session key (for autonomous execution)
  sessionKeyId?: string
}

export interface CopyConfigUpdate {
  sizingMode?: SizingMode
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
// Relationships
// ============================================

export type RelationshipStatus = 'active' | 'paused' | 'inactive' | 'error'

export interface CopyRelationship {
  _id: string
  _creationTime: number
  id: string
  userId: string
  followerAddress: string
  followerChain: string
  config: CopyConfig

  // Status
  isActive: boolean
  isPaused: boolean
  pauseReason?: string

  // Daily tracking (resets daily)
  dailyTradeCount: number
  dailyVolumeUsd: string
  dailyResetAt: number

  // Lifetime stats
  totalTrades: number
  successfulTrades: number
  failedTrades: number
  skippedTrades: number
  totalVolumeUsd: string
  totalPnlUsd?: string

  // Timestamps
  createdAt: number
  updatedAt: number
  lastCopyAt?: number
}

// ============================================
// Trade Signals
// ============================================

export interface TradeSignal {
  leaderAddress: string
  leaderChain: string
  txHash: string
  blockNumber: number
  timestamp: number
  action: string // 'swap', 'bridge', etc.
  tokenInAddress: string
  tokenInSymbol?: string
  tokenInAmount: string
  tokenOutAddress: string
  tokenOutSymbol?: string
  tokenOutAmount?: string
  valueUsd?: string
  dex?: string
}

// ============================================
// Executions
// ============================================

export type ExecutionStatus =
  | 'pending'
  | 'pending_approval'
  | 'queued'
  | 'executing'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'cancelled'
  | 'expired'

export interface CopyExecution {
  _id: string
  _creationTime: number
  id: string
  relationshipId: string
  signal: TradeSignal

  // Status
  status: ExecutionStatus
  skipReason?: string

  // Sizing
  calculatedSizeUsd?: string
  actualSizeUsd?: string

  // Transaction details
  txHash?: string
  gasUsed?: number
  gasPriceGwei?: string
  gasCostUsd?: string

  // Result
  tokenOutAmount?: string
  slippageBps?: number
  errorMessage?: string

  // Timing
  signalReceivedAt: number
  executionStartedAt?: number
  executionCompletedAt?: number

  // Enriched fields (from getPendingApprovals)
  relationship?: {
    id: string
    leaderLabel?: string
    leaderAddress: string
    sizingMode: string
    sizeValue: string
  }
}

// ============================================
// Leader Profiles
// ============================================

export interface LeaderProfile {
  _id: string
  _creationTime: number
  address: string
  chain: string
  label?: string
  notes?: string

  // Performance metrics
  totalTrades: number
  winRate?: number // 0-100
  avgTradePnlPercent?: number
  totalPnlUsd?: number
  sharpeRatio?: number
  maxDrawdownPercent?: number

  // Trading behavior
  avgTradesPerDay?: number
  mostTradedTokens: string[]
  preferredSectors: string[]

  // Social/copy stats
  followerCount: number
  totalCopiedVolumeUsd: number

  // Status
  isActive: boolean
  firstSeenAt: number
  lastActiveAt: number
  dataQualityScore: number // 0-1
  lastAnalyzedAt?: number
}

// ============================================
// Stats & Analytics
// ============================================

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
  successRate: number // 0-100
}

export interface PerformanceByLeader {
  leaderAddress: string
  leaderLabel?: string
  copiedVolumeUsd: number
  pnlUsd: number
  successRate: number
  tradeCount: number
}

// ============================================
// Form Data (for UI)
// ============================================

export interface CopyConfigFormData {
  // Step 1: Leader
  leaderAddress: string
  leaderChain: string
  leaderLabel?: string

  // Step 2: Sizing
  sizingMode: SizingMode
  sizeValue: string

  // Step 3: Risk Limits
  minTradeUsd: string
  maxTradeUsd: string
  maxDailyTrades: number
  maxDailyVolumeUsd: string
  maxSlippageBps: number
  delaySeconds: number
  maxDelaySeconds: number

  // Step 4: Token Filters
  filterMode: 'all' | 'whitelist' | 'blacklist'
  tokenWhitelist: string[]
  tokenBlacklist: string[]
  allowedActions: string[]

  // Step 5: Execution Mode
  executionMode: 'manual' | 'session_key'
  sessionKeyId?: string
}

// ============================================
// Skip Reasons
// ============================================

export type SkipReason =
  | 'BELOW_MIN_TRADE'
  | 'ABOVE_MAX_TRADE'
  | 'DAILY_TRADE_LIMIT'
  | 'DAILY_VOLUME_LIMIT'
  | 'TOKEN_BLACKLISTED'
  | 'TOKEN_NOT_WHITELISTED'
  | 'ACTION_NOT_ALLOWED'
  | 'SESSION_KEY_EXPIRED'
  | 'INSUFFICIENT_BALANCE'
  | 'HIGH_SLIPPAGE'
  | 'PAUSED'

export const SKIP_REASON_LABELS: Record<SkipReason, string> = {
  BELOW_MIN_TRADE: 'Trade value below minimum',
  ABOVE_MAX_TRADE: 'Trade value above maximum',
  DAILY_TRADE_LIMIT: 'Daily trade limit reached',
  DAILY_VOLUME_LIMIT: 'Daily volume limit reached',
  TOKEN_BLACKLISTED: 'Token is blacklisted',
  TOKEN_NOT_WHITELISTED: 'Token not in whitelist',
  ACTION_NOT_ALLOWED: 'Action type not allowed',
  SESSION_KEY_EXPIRED: 'Session key expired',
  INSUFFICIENT_BALANCE: 'Insufficient balance for trade',
  HIGH_SLIPPAGE: 'Slippage exceeds maximum',
  PAUSED: 'Copy trading is paused',
}

// ============================================
// Status Colors (for UI)
// ============================================

export const EXECUTION_STATUS_COLORS: Record<ExecutionStatus, string> = {
  completed: 'green',
  pending: 'yellow',
  pending_approval: 'amber',
  queued: 'blue',
  executing: 'blue',
  failed: 'red',
  skipped: 'gray',
  cancelled: 'gray',
  expired: 'gray',
}

export const RELATIONSHIP_STATUS_CONFIG: Record<
  RelationshipStatus,
  { color: string; icon: string; label: string }
> = {
  active: { color: 'green', icon: '🟢', label: 'Active' },
  paused: { color: 'yellow', icon: '🟡', label: 'Paused' },
  inactive: { color: 'gray', icon: '⚪', label: 'Inactive' },
  error: { color: 'red', icon: '🔴', label: 'Error' },
}
