/**
 * Pending Approvals Hook
 *
 * Manages pending strategy executions that require user approval.
 * Part of Phase 1 manual approval flow.
 */

import { useCallback, useMemo } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'

// ============================================
// TYPES
// ============================================

export interface PendingExecution {
  _id: Id<'strategyExecutions'>
  _creationTime: number
  strategyId: Id<'strategies'>
  walletAddress: string
  currentState: 'awaiting_approval'
  stateEnteredAt: number
  requiresApproval: boolean
  approvalReason?: string
  createdAt: number
  strategy: {
    _id: Id<'strategies'>
    name: string
    strategyType: 'dca' | 'rebalance' | 'limit_order' | 'stop_loss' | 'take_profit' | 'custom'
    config: Record<string, unknown>
  } | null
}

export interface PendingApprovalsViewModel {
  executions: PendingExecution[]
  count: number
  hasUrgent: boolean // Executions older than 1 hour
}

export interface ExecutionHistoryItem {
  _id: Id<'strategyExecutions'>
  strategyId: Id<'strategies'>
  currentState: string
  createdAt: number
  completedAt?: number
  approvalReason?: string
  errorMessage?: string
  metadata?: Record<string, unknown>
}

// ============================================
// HOOKS
// ============================================

/**
 * Hook to get pending approvals for a wallet
 */
export function usePendingApprovals(walletAddress: string | null) {
  const executions = useQuery(
    api.strategyExecutions.getPendingApprovals,
    walletAddress ? { walletAddress } : 'skip'
  )

  const viewModel = useMemo<PendingApprovalsViewModel | null>(() => {
    if (!executions) return null

    const now = Date.now()
    const oneHourAgo = now - 60 * 60 * 1000

    return {
      executions: executions as PendingExecution[],
      count: executions.length,
      hasUrgent: executions.some((e) => e.createdAt < oneHourAgo),
    }
  }, [executions])

  return {
    data: viewModel,
    executions: (executions ?? []) as PendingExecution[],
    isLoading: executions === undefined,
    isEmpty: executions !== undefined && executions.length === 0,
    count: executions?.length ?? 0,
  }
}

/**
 * Hook for a single execution details
 */
export function useExecution(executionId: Id<'strategyExecutions'> | null) {
  const execution = useQuery(
    api.strategyExecutions.get,
    executionId ? { executionId } : 'skip'
  )

  return {
    execution,
    isLoading: execution === undefined && executionId !== null,
  }
}

/**
 * Hook for execution history of a strategy
 */
export function useExecutionHistory(
  strategyId: Id<'strategies'> | null,
  limit = 20
) {
  const executions = useQuery(
    api.strategyExecutions.getByStrategy,
    strategyId ? { strategyId, limit } : 'skip'
  )

  return {
    executions: (executions ?? []) as ExecutionHistoryItem[],
    isLoading: executions === undefined && strategyId !== null,
  }
}

/**
 * Hook for execution mutations (approve, skip, complete, fail)
 */
export function useExecutionMutations() {
  const approveMutation = useMutation(api.strategyExecutions.approve)
  const skipMutation = useMutation(api.strategyExecutions.skip)
  const completeMutation = useMutation(api.strategyExecutions.complete)
  const failMutation = useMutation(api.strategyExecutions.fail)

  const approve = useCallback(
    async (executionId: Id<'strategyExecutions'>, approverAddress: string) => {
      return await approveMutation({ executionId, approverAddress })
    },
    [approveMutation]
  )

  const skip = useCallback(
    async (executionId: Id<'strategyExecutions'>, reason?: string) => {
      return await skipMutation({ executionId, reason })
    },
    [skipMutation]
  )

  const complete = useCallback(
    async (
      executionId: Id<'strategyExecutions'>,
      txHash?: string,
      outputData?: unknown
    ) => {
      return await completeMutation({ executionId, txHash, outputData })
    },
    [completeMutation]
  )

  const fail = useCallback(
    async (
      executionId: Id<'strategyExecutions'>,
      errorMessage: string,
      errorCode?: string,
      recoverable?: boolean
    ) => {
      return await failMutation({
        executionId,
        errorMessage,
        errorCode,
        recoverable,
      })
    },
    [failMutation]
  )

  return {
    approve,
    skip,
    complete,
    fail,
  }
}

// ============================================
// FORMATTERS
// ============================================

/**
 * Format time since execution was created
 */
export function formatWaitingTime(createdAt: number): string {
  const now = Date.now()
  const diff = now - createdAt

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

/**
 * Get urgency level for display
 */
export function getUrgencyLevel(
  createdAt: number
): 'normal' | 'warning' | 'urgent' {
  const now = Date.now()
  const diff = now - createdAt

  if (diff > 24 * 60 * 60 * 1000) return 'urgent'
  if (diff > 60 * 60 * 1000) return 'warning'
  return 'normal'
}

/**
 * Format strategy type for display
 */
export function formatStrategyType(
  type: 'dca' | 'rebalance' | 'limit_order' | 'stop_loss' | 'take_profit' | 'custom'
): string {
  const labels: Record<string, string> = {
    dca: 'DCA',
    rebalance: 'Rebalance',
    limit_order: 'Limit Order',
    stop_loss: 'Stop Loss',
    take_profit: 'Take Profit',
    custom: 'Custom',
  }
  return labels[type] || type
}
