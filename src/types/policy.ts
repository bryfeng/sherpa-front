/**
 * Policy Engine Types
 *
 * Three layers:
 * - System Policy: Platform-wide controls (admin only)
 * - Session Policy: Delegated access scoping (user-defined per session key)
 * - Risk Policy: Personal risk preferences (user settings)
 */

// ============================================
// Risk Policy (User Settings)
// ============================================

export interface RiskPolicyConfig {
  // Position limits
  maxPositionPercent: number // Max % of portfolio in single asset (1-100)
  maxPositionValueUsd: number // Max position value in USD

  // Daily limits
  maxDailyVolumeUsd: number // Max daily trading volume
  maxDailyLossUsd: number // Stop trading if daily loss exceeds

  // Transaction limits
  maxSingleTxUsd: number // Max single transaction value
  requireApprovalAboveUsd: number // Require manual approval above this

  // Slippage tolerance
  maxSlippagePercent: number // Max allowed slippage (0.1-10)
  warnSlippagePercent: number // Warn if slippage exceeds this

  // Gas limits
  maxGasPercent: number // Max gas as % of transaction (0.1-20)
  warnGasPercent: number // Warn if gas exceeds this %

  // Liquidity requirements
  minLiquidityUsd: number // Minimum pool liquidity required

  // Master toggle
  enabled: boolean
}

export const RISK_POLICY_DEFAULTS: RiskPolicyConfig = {
  maxPositionPercent: 25,
  maxPositionValueUsd: 10000,
  maxDailyVolumeUsd: 50000,
  maxDailyLossUsd: 1000,
  maxSingleTxUsd: 5000,
  requireApprovalAboveUsd: 2000,
  maxSlippagePercent: 3.0,
  warnSlippagePercent: 1.5,
  maxGasPercent: 5.0,
  warnGasPercent: 2.0,
  minLiquidityUsd: 100000,
  enabled: true,
}

export type RiskPresetKey = 'conservative' | 'moderate' | 'aggressive'

export interface RiskPreset {
  key: RiskPresetKey
  name: string
  description: string
  config: Partial<RiskPolicyConfig>
}

export const RISK_PRESETS: Record<RiskPresetKey, RiskPreset> = {
  conservative: {
    key: 'conservative',
    name: 'Conservative',
    description: 'Lower limits, tighter controls for careful trading',
    config: {
      maxPositionPercent: 10,
      maxPositionValueUsd: 2500,
      maxDailyVolumeUsd: 10000,
      maxDailyLossUsd: 200,
      maxSingleTxUsd: 1000,
      requireApprovalAboveUsd: 500,
      maxSlippagePercent: 1.0,
      warnSlippagePercent: 0.5,
      maxGasPercent: 2.0,
      warnGasPercent: 1.0,
      minLiquidityUsd: 500000,
    },
  },
  moderate: {
    key: 'moderate',
    name: 'Moderate',
    description: 'Balanced settings for everyday trading',
    config: {
      maxPositionPercent: 25,
      maxPositionValueUsd: 10000,
      maxDailyVolumeUsd: 50000,
      maxDailyLossUsd: 1000,
      maxSingleTxUsd: 5000,
      requireApprovalAboveUsd: 2000,
      maxSlippagePercent: 3.0,
      warnSlippagePercent: 1.5,
      maxGasPercent: 5.0,
      warnGasPercent: 2.0,
      minLiquidityUsd: 100000,
    },
  },
  aggressive: {
    key: 'aggressive',
    name: 'Aggressive',
    description: 'Higher limits for experienced traders',
    config: {
      maxPositionPercent: 50,
      maxPositionValueUsd: 50000,
      maxDailyVolumeUsd: 250000,
      maxDailyLossUsd: 5000,
      maxSingleTxUsd: 25000,
      requireApprovalAboveUsd: 10000,
      maxSlippagePercent: 5.0,
      warnSlippagePercent: 2.5,
      maxGasPercent: 10.0,
      warnGasPercent: 5.0,
      minLiquidityUsd: 50000,
    },
  },
}

// ============================================
// Session Key (Delegated Access)
// ============================================

export type Permission =
  | 'swap'
  | 'bridge'
  | 'transfer'
  | 'approve'
  | 'stake'
  | 'unstake'
  | 'claim'
  | 'wrap'
  | 'unwrap'

export const PERMISSIONS: { key: Permission; label: string; description: string }[] = [
  { key: 'swap', label: 'Swap tokens', description: 'Exchange one token for another' },
  { key: 'bridge', label: 'Bridge across chains', description: 'Move tokens between networks' },
  { key: 'transfer', label: 'Transfer tokens', description: 'Send tokens to other addresses' },
  { key: 'approve', label: 'Approve token spending', description: 'Allow contracts to spend tokens' },
  { key: 'stake', label: 'Stake tokens', description: 'Lock tokens for rewards' },
  { key: 'unstake', label: 'Unstake tokens', description: 'Unlock staked tokens' },
  { key: 'claim', label: 'Claim rewards', description: 'Collect earned rewards' },
  { key: 'wrap', label: 'Wrap tokens', description: 'Convert native to wrapped tokens' },
  { key: 'unwrap', label: 'Unwrap tokens', description: 'Convert wrapped to native tokens' },
]

export interface SessionKeyConfig {
  // Permissions
  permissions: Permission[]

  // Value limits
  valueLimits: {
    maxValuePerTxUsd: number
    maxTotalValueUsd: number
    maxTransactions?: number
  }

  // Allowlists
  chainAllowlist: number[]
  tokenAllowlist: string[] // Format: "chainId:address"
  contractAllowlist: string[]

  // Timing
  expiresAt: number // Unix timestamp (ms)
  durationDays?: number // Helper for UI
}

export interface SessionKey extends SessionKeyConfig {
  sessionId: string
  walletAddress: string
  agentId?: string
  status: 'active' | 'expired' | 'revoked' | 'exhausted'
  createdAt: number
  lastUsedAt?: number
  revokedAt?: number
  revokeReason?: string

  // Usage tracking
  totalValueUsedUsd: number
  transactionCount: number
}

export const SESSION_DURATIONS = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
  { days: 365, label: '1 year' },
]

export const SUPPORTED_CHAINS = [
  { chainId: 1, name: 'Ethereum', symbol: 'ETH' },
  { chainId: 137, name: 'Polygon', symbol: 'MATIC' },
  { chainId: 42161, name: 'Arbitrum', symbol: 'ETH' },
  { chainId: 8453, name: 'Base', symbol: 'ETH' },
  { chainId: 10, name: 'Optimism', symbol: 'ETH' },
  { chainId: 56, name: 'BSC', symbol: 'BNB' },
]

// ============================================
// System Policy (Admin Only)
// ============================================

export interface SystemPolicyConfig {
  // Emergency controls
  emergencyStop: boolean
  emergencyStopReason?: string

  // Maintenance
  inMaintenance: boolean
  maintenanceMessage?: string

  // Blocklists
  blockedContracts: string[]
  blockedTokens: string[]
  blockedChains: number[]

  // Allowlists
  protocolWhitelistEnabled: boolean
  allowedProtocols: string[]
  allowedChains: number[]

  // Global limits
  maxSingleTxUsd: number
}

export interface SystemPolicyStatus {
  operational: boolean
  emergencyStop: boolean
  inMaintenance: boolean
  message?: string
}

// ============================================
// Policy Evaluation
// ============================================

export type PolicySeverity = 'block' | 'warn' | 'info'
export type PolicyType = 'session' | 'risk' | 'system'
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

export interface PolicyViolation {
  policyType: PolicyType
  policyName: string
  severity: PolicySeverity
  message: string
  details: Record<string, unknown>
  suggestion?: string
}

export interface PolicyResult {
  approved: boolean
  violations: PolicyViolation[]
  warnings: PolicyViolation[]
  riskScore: number // 0.0 - 1.0
  riskLevel: RiskLevel
  requiresApproval: boolean
  approvalReason?: string
}

// Helper to get risk level from score
export function getRiskLevel(score: number): RiskLevel {
  if (score < 0.25) return 'low'
  if (score < 0.5) return 'medium'
  if (score < 0.75) return 'high'
  return 'critical'
}

// Helper to get risk color
export function getRiskColor(level: RiskLevel): string {
  switch (level) {
    case 'low':
      return 'var(--success, #22c55e)'
    case 'medium':
      return 'var(--warning, #eab308)'
    case 'high':
      return 'var(--warning, #f97316)'
    case 'critical':
      return 'var(--error, #ef4444)'
  }
}

// Helper to format USD values
export function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}
