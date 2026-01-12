/**
 * Transaction History Hook
 *
 * Provides transaction and execution history for a wallet.
 */

import { useMemo } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

// ============================================
// TYPES
// ============================================

export type TransactionType = 'swap' | 'bridge' | 'transfer' | 'approve'
export type TransactionStatus = 'pending' | 'submitted' | 'confirmed' | 'failed' | 'reverted'
export type ExecutionState =
  | 'idle'
  | 'analyzing'
  | 'planning'
  | 'awaiting_approval'
  | 'executing'
  | 'monitoring'
  | 'completed'
  | 'failed'
  | 'paused'
  | 'cancelled'

export interface Transaction {
  _id: Id<'transactions'>
  _creationTime: number
  executionId?: Id<'strategyExecutions'>
  walletId: Id<'wallets'>
  txHash?: string
  chain: string
  type: TransactionType
  status: TransactionStatus
  inputData: unknown
  outputData?: unknown
  gasUsed?: number
  gasPrice?: number
  valueUsd?: number
  createdAt: number
  confirmedAt?: number
}

export interface StrategyExecution {
  _id: Id<'strategyExecutions'>
  _creationTime: number
  strategyId: Id<'strategies'>
  walletAddress: string
  currentState: ExecutionState
  stateEnteredAt: number
  approvalReason?: string
  approvedBy?: string
  approvedAt?: number
  errorMessage?: string
  createdAt: number
  completedAt?: number
  strategy: {
    name: string
    strategyType: string
  } | null
}

export interface ActivityItem {
  id: string
  type: 'transaction' | 'execution'
  timestamp: number
  data: Transaction | StrategyExecution
}

// ============================================
// HOOKS
// ============================================

/**
 * Hook for fetching recent activity (transactions + executions)
 */
export function useRecentActivity(walletAddress: string | null, limit = 20) {
  const activity = useQuery(
    api.transactions.getRecentActivity,
    walletAddress ? { walletAddress, limit } : 'skip'
  )

  // Merge and sort transactions and executions by timestamp
  const items = useMemo<ActivityItem[]>(() => {
    if (!activity) return []

    const txItems: ActivityItem[] = (activity.transactions || []).map((tx: Transaction) => ({
      id: `tx-${tx._id}`,
      type: 'transaction' as const,
      timestamp: tx.createdAt,
      data: tx,
    }))

    const execItems: ActivityItem[] = (activity.executions || []).map((exec: StrategyExecution) => ({
      id: `exec-${exec._id}`,
      type: 'execution' as const,
      timestamp: exec.createdAt || exec._creationTime,
      data: exec,
    }))

    // Combine and sort by timestamp descending
    return [...txItems, ...execItems].sort((a, b) => b.timestamp - a.timestamp)
  }, [activity])

  return {
    items,
    transactions: (activity?.transactions || []) as Transaction[],
    executions: (activity?.executions || []) as StrategyExecution[],
    isLoading: activity === undefined,
    isEmpty: activity !== undefined && items.length === 0,
  }
}

/**
 * Hook for fetching transactions only
 */
export function useTransactions(
  walletAddress: string | null,
  options?: { limit?: number; type?: TransactionType }
) {
  const transactions = useQuery(
    api.transactions.listByWalletAddress,
    walletAddress
      ? { walletAddress, limit: options?.limit, type: options?.type }
      : 'skip'
  )

  return {
    transactions: (transactions || []) as Transaction[],
    isLoading: transactions === undefined,
    isEmpty: transactions !== undefined && transactions.length === 0,
  }
}

// ============================================
// FORMATTERS
// ============================================

/**
 * Format transaction type for display
 */
export function formatTransactionType(type: TransactionType): string {
  const labels: Record<TransactionType, string> = {
    swap: 'Swap',
    bridge: 'Bridge',
    transfer: 'Transfer',
    approve: 'Approval',
  }
  return labels[type] || type
}

/**
 * Format transaction status for display
 */
export function formatTransactionStatus(status: TransactionStatus): string {
  const labels: Record<TransactionStatus, string> = {
    pending: 'Pending',
    submitted: 'Submitted',
    confirmed: 'Confirmed',
    failed: 'Failed',
    reverted: 'Reverted',
  }
  return labels[status] || status
}

/**
 * Format execution state for display
 */
export function formatExecutionState(state: ExecutionState): string {
  const labels: Record<ExecutionState, string> = {
    idle: 'Idle',
    analyzing: 'Analyzing',
    planning: 'Planning',
    awaiting_approval: 'Awaiting Approval',
    executing: 'Executing',
    monitoring: 'Monitoring',
    completed: 'Completed',
    failed: 'Failed',
    paused: 'Paused',
    cancelled: 'Cancelled',
  }
  return labels[state] || state
}

/**
 * Get status color for transaction
 */
export function getTransactionStatusColor(status: TransactionStatus): string {
  const colors: Record<TransactionStatus, string> = {
    pending: 'var(--warning)',
    submitted: 'var(--accent)',
    confirmed: 'var(--success)',
    failed: 'var(--error)',
    reverted: 'var(--error)',
  }
  return colors[status] || 'var(--text-muted)'
}

/**
 * Get status color for execution
 */
export function getExecutionStateColor(state: ExecutionState): string {
  const colors: Record<ExecutionState, string> = {
    idle: 'var(--text-muted)',
    analyzing: 'var(--accent)',
    planning: 'var(--accent)',
    awaiting_approval: 'var(--warning)',
    executing: 'var(--accent)',
    monitoring: 'var(--accent)',
    completed: 'var(--success)',
    failed: 'var(--error)',
    paused: 'var(--warning)',
    cancelled: 'var(--text-muted)',
  }
  return colors[state] || 'var(--text-muted)'
}

/**
 * Format relative time
 */
export function formatRelativeTime(timestamp: number): string {
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
  if (diff < 604800000) {
    const days = Math.round(diff / 86400000)
    return `${days}d ago`
  }

  // Format as date for older items
  return new Date(timestamp).toLocaleDateString()
}

/**
 * Format USD value
 */
export function formatUsdValue(value: number | undefined): string {
  if (value === undefined || value === null) return '-'
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/**
 * Truncate transaction hash for display
 */
export function truncateTxHash(hash: string | undefined): string {
  if (!hash) return '-'
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`
}

/**
 * Get block explorer URL for transaction
 */
export function getExplorerUrl(txHash: string, chain: string): string {
  const explorers: Record<string, string> = {
    ethereum: 'https://etherscan.io/tx/',
    base: 'https://basescan.org/tx/',
    arbitrum: 'https://arbiscan.io/tx/',
    optimism: 'https://optimistic.etherscan.io/tx/',
    polygon: 'https://polygonscan.com/tx/',
  }
  const baseUrl = explorers[chain.toLowerCase()] || explorers.ethereum
  return `${baseUrl}${txHash}`
}
