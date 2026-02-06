/**
 * Smart Session Intent Types
 *
 * Types for tracking intent execution via Rhinestone Smart Sessions.
 */

import type { Id } from '../../convex/_generated/dataModel'

// ============================================
// STATUS TYPES
// ============================================

export type IntentStatus = 'pending' | 'executing' | 'confirming' | 'completed' | 'failed'

export type IntentType = 'dca_execution' | 'swap' | 'bridge'

export type IntentSourceType = 'dca_strategy' | 'manual'

// ============================================
// INTENT DATA TYPES
// ============================================

export interface IntentTokenInfo {
  symbol: string
  address: string
  amount: string
}

export interface IntentTokenOutInfo {
  symbol: string
  address: string
  amount?: string
}

export interface SmartSessionIntent {
  _id: Id<'smartSessionIntents'>
  _creationTime: number
  smartSessionId: string
  smartAccountAddress: string
  intentType: IntentType
  sourceType?: IntentSourceType
  sourceId?: string // Strategy ID if from automated strategy
  status: IntentStatus
  chainId: number
  txHash?: string
  estimatedValueUsd?: number
  actualValueUsd?: number
  gasUsd?: number
  tokenIn?: IntentTokenInfo
  tokenOut?: IntentTokenOutInfo
  errorMessage?: string
  createdAt: number
  submittedAt?: number
  confirmedAt?: number
}

// ============================================
// UI HELPER TYPES
// ============================================

export const INTENT_STATUS_LABELS: Record<IntentStatus, string> = {
  pending: 'Pending',
  executing: 'Executing',
  confirming: 'Confirming',
  completed: 'Completed',
  failed: 'Failed',
}

export const INTENT_STATUS_COLORS: Record<IntentStatus, string> = {
  pending: 'var(--text-muted)',
  executing: 'var(--accent)',
  confirming: 'var(--warning)',
  completed: 'var(--success)',
  failed: 'var(--error)',
}

export const INTENT_TYPE_LABELS: Record<IntentType, string> = {
  dca_execution: 'DCA Buy',
  swap: 'Swap',
  bridge: 'Bridge',
}

// ============================================
// FORM/CREATE TYPES
// ============================================

export interface CreateIntentData {
  smartSessionId: string
  smartAccountAddress: string
  intentType: IntentType
  chainId: number
  sourceType?: IntentSourceType
  sourceId?: string
  estimatedValueUsd?: number
  tokenIn?: IntentTokenInfo
  tokenOut?: IntentTokenOutInfo
}
