/**
 * Strategy Types for DCA and other automated strategies
 */

import type { Id } from '../../convex/_generated/dataModel'

// ============================================
// TOKEN TYPES
// ============================================

export interface TokenInfo {
  symbol: string
  address: string
  chainId: number
  decimals: number
  logoUrl?: string
}

// ============================================
// DCA STRATEGY TYPES
// ============================================

export type DCAFrequency = 'hourly' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom'

export type DCAStatus =
  | 'draft'           // Not yet activated
  | 'pending_session' // Waiting for session key
  | 'active'          // Running
  | 'paused'          // Temporarily paused
  | 'completed'       // User ended it
  | 'failed'          // Unrecoverable error
  | 'expired'         // Session key expired

export interface DCAStrategy {
  _id: Id<'dcaStrategies'>
  _creationTime: number

  // References
  userId: Id<'users'>
  walletId: Id<'wallets'>
  walletAddress: string

  // Basic info
  name: string
  description?: string

  // Tokens
  fromToken: TokenInfo
  toToken: TokenInfo

  // Amount
  amountPerExecutionUsd: number

  // Schedule
  frequency: DCAFrequency
  cronExpression?: string
  executionHourUtc: number
  executionDayOfWeek?: number  // 0-6, 0 = Sunday
  executionDayOfMonth?: number // 1-31

  // Constraints
  maxSlippageBps: number
  maxGasUsd: number
  skipIfGasAboveUsd?: number
  pauseIfPriceAboveUsd?: number
  pauseIfPriceBelowUsd?: number
  minAmountOut?: string

  // Session key
  sessionKeyId?: Id<'sessionKeys'>

  // Status
  status: DCAStatus
  pauseReason?: string

  // Scheduling state
  nextExecutionAt?: number
  lastExecutionAt?: number

  // Lifetime stats
  totalExecutions: number
  successfulExecutions: number
  failedExecutions: number
  skippedExecutions: number
  totalAmountSpentUsd: number
  totalTokensAcquired: string
  averagePriceUsd?: number
  lastError?: string

  // Budget limits
  maxTotalSpendUsd?: number
  maxExecutions?: number
  endDate?: number
}

// ============================================
// DCA EXECUTION TYPES
// ============================================

export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped'

export type SkipReason =
  | 'gas_too_high'
  | 'price_above_limit'
  | 'price_below_limit'
  | 'insufficient_balance'
  | 'session_expired'
  | 'slippage_exceeded'
  | 'manually_skipped'

export interface MarketConditions {
  tokenPriceUsd: number
  gasGwei: number
  estimatedGasUsd: number
}

export interface ExecutionQuote {
  inputAmount: string
  expectedOutputAmount: string
  minimumOutputAmount: string
  priceImpactBps: number
  route?: string
}

export interface DCAExecution {
  _id: Id<'dcaExecutions'>
  _creationTime: number

  strategyId: Id<'dcaStrategies'>
  executionNumber: number

  // Result
  status: ExecutionStatus
  skipReason?: SkipReason

  // Market conditions
  marketConditions?: MarketConditions

  // Quote
  quote?: ExecutionQuote

  // Transaction
  txHash?: string
  chainId: number
  actualInputAmount?: string
  actualOutputAmount?: string
  actualPriceUsd?: number
  gasUsed?: number
  gasPriceGwei?: number
  gasUsd?: number

  // Error
  errorMessage?: string
  errorCode?: string

  // Timing
  scheduledAt: number
  startedAt?: number
  completedAt?: number
}

// ============================================
// FORM TYPES
// ============================================

export interface DCAFormData {
  name: string
  description?: string
  fromToken: TokenInfo | null
  toToken: TokenInfo | null
  amountPerExecutionUsd: number
  frequency: DCAFrequency
  cronExpression?: string
  executionHourUtc: number
  executionDayOfWeek?: number
  executionDayOfMonth?: number
  maxSlippageBps: number
  maxGasUsd: number
  skipIfGasAboveUsd?: number
  pauseIfPriceAboveUsd?: number
  pauseIfPriceBelowUsd?: number
  maxTotalSpendUsd?: number
  maxExecutions?: number
  endDate?: number
}

export const DEFAULT_DCA_FORM: DCAFormData = {
  name: '',
  description: '',
  fromToken: null,
  toToken: null,
  amountPerExecutionUsd: 100,
  frequency: 'weekly',
  executionHourUtc: 12,
  executionDayOfWeek: 1, // Monday
  maxSlippageBps: 100, // 1%
  maxGasUsd: 5,
}

// ============================================
// PERFORMANCE TYPES
// ============================================

export interface StrategyPerformance {
  totalInvestedUsd: number
  currentValueUsd: number
  totalTokensAcquired: number
  averageBuyPrice: number
  currentTokenPrice: number
  unrealizedPnlUsd: number
  unrealizedPnlPercent: number
  // Buy-and-hold comparison
  buyAndHoldValueUsd: number
  dcaAdvantageUsd: number
  dcaAdvantagePercent: number
  // Execution stats
  successRate: number
  avgExecutionGasUsd: number
}

// ============================================
// SESSION KEY REQUIREMENTS
// ============================================

export interface SessionKeyRequirements {
  permissions: string[]
  spendingLimitUsd: number
  tokenAllowlist: string[]
  chainIds: number[]
  expiresIn: number // seconds
  estimatedExecutions: number
}

// ============================================
// UI HELPER TYPES
// ============================================

export interface StrategyFilters {
  status?: DCAStatus | 'all'
  sortBy?: 'created' | 'nextExecution' | 'name' | 'performance'
  sortOrder?: 'asc' | 'desc'
}

export const STATUS_LABELS: Record<DCAStatus, string> = {
  draft: 'Draft',
  pending_session: 'Pending Session',
  active: 'Active',
  paused: 'Paused',
  completed: 'Completed',
  failed: 'Failed',
  expired: 'Expired',
}

export const STATUS_COLORS: Record<DCAStatus, string> = {
  draft: 'var(--text-muted)',
  pending_session: 'var(--warning)',
  active: 'var(--success)',
  paused: 'var(--warning)',
  completed: 'var(--text-muted)',
  failed: 'var(--error)',
  expired: 'var(--error)',
}

export const FREQUENCY_LABELS: Record<DCAFrequency, string> = {
  hourly: 'Every Hour',
  daily: 'Daily',
  weekly: 'Weekly',
  biweekly: 'Every 2 Weeks',
  monthly: 'Monthly',
  custom: 'Custom',
}
