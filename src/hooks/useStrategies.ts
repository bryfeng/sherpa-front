/**
 * Strategies Hook
 *
 * Manages DCA strategies using Convex for real-time data.
 */

import { useCallback, useMemo } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import type {
  DCAStrategy,
  DCAExecution,
  DCAFormData,
  DCAStatus,
  StrategyFilters,
} from '../types/strategy'

// ============================================
// GENERIC STRATEGIES (from AI tool)
// ============================================

/**
 * Generic strategy type from the strategies table (created by AI)
 */
export interface GenericStrategy {
  _id: Id<'strategies'>
  _creationTime: number
  userId: Id<'users'>
  walletAddress: string
  name: string
  description?: string
  strategyType: 'dca' | 'rebalance' | 'limit_order' | 'stop_loss' | 'take_profit' | 'custom'
  config: Record<string, unknown>
  status: 'draft' | 'pending_session' | 'active' | 'paused' | 'completed' | 'failed' | 'expired' | 'archived'
  sessionKeyId?: Id<'sessionKeys'>
  requiresManualApproval?: boolean // Phase 1: true means each execution needs user approval
  cronExpression?: string
  lastExecutedAt?: number
  nextExecutionAt?: number
  totalExecutions?: number
  successfulExecutions?: number
  failedExecutions?: number
  lastError?: string
  createdAt: number
  updatedAt: number
}

/**
 * Hook for generic strategies (created by AI tool)
 * Reads from the `strategies` table
 */
export function useGenericStrategies(walletAddress: string | null, statusFilter?: 'draft' | 'active' | 'paused' | 'archived') {
  const strategies = useQuery(
    api.strategies.listByWallet,
    walletAddress ? { walletAddress, status: statusFilter } : 'skip'
  )

  return {
    strategies: (strategies ?? []) as GenericStrategy[],
    isLoading: strategies === undefined,
    isEmpty: strategies !== undefined && strategies.length === 0,
  }
}

/**
 * Hook for a single generic strategy
 */
export function useGenericStrategy(strategyId: Id<'strategies'> | null) {
  const strategy = useQuery(
    api.strategies.get,
    strategyId ? { strategyId } : 'skip'
  )

  return {
    strategy: strategy as GenericStrategy | null | undefined,
    isLoading: strategy === undefined && strategyId !== null,
  }
}

/**
 * Mutations for generic strategies
 */
export function useGenericStrategyMutations() {
  const activateMutation = useMutation(api.strategies.activate)
  const pauseMutation = useMutation(api.strategies.pause)
  const updateMutation = useMutation(api.strategies.update)
  const removeMutation = useMutation(api.strategies.remove)
  const executeNowMutation = useMutation(api.strategyExecutions.executeNow)

  return {
    activate: useCallback(
      async (strategyId: Id<'strategies'>, smartSessionId?: string) =>
        activateMutation({ strategyId, smartSessionId }),
      [activateMutation]
    ),
    pause: useCallback(
      async (strategyId: Id<'strategies'>) => pauseMutation({ strategyId }),
      [pauseMutation]
    ),
    update: useCallback(
      async (strategyId: Id<'strategies'>, updates: { name?: string; description?: string; config?: unknown }) =>
        updateMutation({ strategyId, ...updates }),
      [updateMutation]
    ),
    remove: useCallback(
      async (strategyId: Id<'strategies'>) => removeMutation({ strategyId }),
      [removeMutation]
    ),
    /**
     * Execute Now - Immediately create a pending execution for approval
     * Returns the execution ID and approval reason
     */
    executeNow: useCallback(
      async (strategyId: Id<'strategies'>) => executeNowMutation({ strategyId }),
      [executeNowMutation]
    ),
  }
}

// ============================================
// DCA-SPECIFIC STRATEGIES (detailed)
// ============================================

export function useStrategies(walletAddress: string | null, filters?: StrategyFilters) {
  const strategies = useQuery(
    api.dca.listByWallet,
    walletAddress ? { walletAddress, status: filters?.status === 'all' ? undefined : filters?.status } : 'skip'
  )

  const sortedStrategies = useMemo(() => {
    if (!strategies) return []

    const sorted = [...strategies]
    const sortBy = filters?.sortBy ?? 'created'
    const order = filters?.sortOrder ?? 'desc'

    sorted.sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'created':
          comparison = (a._creationTime ?? 0) - (b._creationTime ?? 0)
          break
        case 'nextExecution':
          comparison = (a.nextExecutionAt ?? Infinity) - (b.nextExecutionAt ?? Infinity)
          break
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'performance':
          comparison = a.totalAmountSpentUsd - b.totalAmountSpentUsd
          break
      }
      return order === 'asc' ? comparison : -comparison
    })

    return sorted as DCAStrategy[]
  }, [strategies, filters?.sortBy, filters?.sortOrder])

  return {
    strategies: sortedStrategies,
    isLoading: strategies === undefined,
    isEmpty: strategies !== undefined && strategies.length === 0,
  }
}

// ============================================
// SINGLE STRATEGY
// ============================================

export function useStrategy(strategyId: Id<'dcaStrategies'> | null) {
  const strategy = useQuery(
    api.dca.get,
    strategyId ? { id: strategyId } : 'skip'
  )

  return {
    strategy: strategy as DCAStrategy | null | undefined,
    isLoading: strategy === undefined && strategyId !== null,
  }
}

// ============================================
// EXECUTIONS
// ============================================

export function useStrategyExecutions(strategyId: Id<'dcaStrategies'> | null, limit = 20) {
  const executions = useQuery(
    api.dca.getExecutions,
    strategyId ? { strategyId, limit } : 'skip'
  )

  return {
    executions: executions as DCAExecution[] | undefined,
    isLoading: executions === undefined && strategyId !== null,
  }
}

// ============================================
// MUTATIONS
// ============================================

export function useStrategyMutations() {
  const createMutation = useMutation(api.dca.create)
  const activateMutation = useMutation(api.dca.activate)
  const pauseMutation = useMutation(api.dca.pause)
  const resumeMutation = useMutation(api.dca.resume)
  const stopMutation = useMutation(api.dca.stop)
  const updateConfigMutation = useMutation(api.dca.updateConfig)

  const create = useCallback(
    async (
      userId: Id<'users'>,
      walletId: Id<'wallets'>,
      walletAddress: string,
      data: DCAFormData
    ) => {
      if (!data.fromToken || !data.toToken) {
        throw new Error('Tokens are required')
      }

      return await createMutation({
        userId,
        walletId,
        walletAddress: walletAddress.toLowerCase(),
        name: data.name,
        description: data.description,
        fromToken: data.fromToken,
        toToken: data.toToken,
        amountPerExecutionUsd: data.amountPerExecutionUsd,
        frequency: data.frequency,
        cronExpression: data.cronExpression,
        executionHourUtc: data.executionHourUtc,
        executionDayOfWeek: data.executionDayOfWeek,
        executionDayOfMonth: data.executionDayOfMonth,
        maxSlippageBps: data.maxSlippageBps,
        maxGasUsd: data.maxGasUsd,
        skipIfGasAboveUsd: data.skipIfGasAboveUsd,
        pauseIfPriceAboveUsd: data.pauseIfPriceAboveUsd,
        pauseIfPriceBelowUsd: data.pauseIfPriceBelowUsd,
        maxTotalSpendUsd: data.maxTotalSpendUsd,
        maxExecutions: data.maxExecutions,
        endDate: data.endDate,
      })
    },
    [createMutation]
  )

  const activate = useCallback(
    async (strategyId: Id<'dcaStrategies'>, sessionKeyId: Id<'sessionKeys'>, nextExecutionAt?: number) => {
      return await activateMutation({
        strategyId,
        sessionKeyId,
        nextExecutionAt: nextExecutionAt ?? Date.now() + 3600000, // Default: 1 hour from now
      })
    },
    [activateMutation]
  )

  const pause = useCallback(
    async (strategyId: Id<'dcaStrategies'>, reason?: string) => {
      return await pauseMutation({ strategyId, reason })
    },
    [pauseMutation]
  )

  const resume = useCallback(
    async (strategyId: Id<'dcaStrategies'>, nextExecutionAt?: number) => {
      return await resumeMutation({
        strategyId,
        nextExecutionAt: nextExecutionAt ?? Date.now() + 3600000, // Default: 1 hour from now
      })
    },
    [resumeMutation]
  )

  const stop = useCallback(
    async (strategyId: Id<'dcaStrategies'>) => {
      return await stopMutation({ strategyId })
    },
    [stopMutation]
  )

  const updateConfig = useCallback(
    async (strategyId: Id<'dcaStrategies'>, updates: Partial<DCAFormData>) => {
      // Only pass allowed fields to updateConfig
      return await updateConfigMutation({
        strategyId,
        amountPerExecutionUsd: updates.amountPerExecutionUsd,
        frequency: updates.frequency,
        cronExpression: updates.cronExpression,
        executionHourUtc: updates.executionHourUtc,
        executionDayOfWeek: updates.executionDayOfWeek,
        executionDayOfMonth: updates.executionDayOfMonth,
        maxSlippageBps: updates.maxSlippageBps,
        maxGasUsd: updates.maxGasUsd,
        skipIfGasAboveUsd: updates.skipIfGasAboveUsd,
        pauseIfPriceAboveUsd: updates.pauseIfPriceAboveUsd,
        pauseIfPriceBelowUsd: updates.pauseIfPriceBelowUsd,
        maxTotalSpendUsd: updates.maxTotalSpendUsd,
        maxExecutions: updates.maxExecutions,
        endDate: updates.endDate,
      })
    },
    [updateConfigMutation]
  )

  return {
    create,
    activate,
    pause,
    resume,
    stop,
    updateConfig,
  }
}

// ============================================
// STATS HELPERS
// ============================================

export function useStrategyStats(strategyId: Id<'dcaStrategies'> | null) {
  const stats = useQuery(
    api.dca.getStats,
    strategyId ? { strategyId } : 'skip'
  )

  return {
    stats,
    isLoading: stats === undefined && strategyId !== null,
  }
}

// ============================================
// STATUS HELPERS
// ============================================

export function isActiveStatus(status: DCAStatus): boolean {
  return status === 'active'
}

export function canPause(status: DCAStatus): boolean {
  return status === 'active'
}

export function canResume(status: DCAStatus): boolean {
  return status === 'paused'
}

export function canEdit(status: DCAStatus): boolean {
  return status === 'draft' || status === 'paused'
}

export function canActivate(status: DCAStatus): boolean {
  return status === 'draft' || status === 'pending_session'
}

export function canStop(status: DCAStatus): boolean {
  return status === 'active' || status === 'paused'
}

export function isTerminal(status: DCAStatus): boolean {
  return status === 'completed' || status === 'failed' || status === 'expired'
}

// ============================================
// TIME HELPERS
// ============================================

export function formatNextExecution(timestamp: number | undefined): string {
  if (!timestamp) return 'Not scheduled'

  const now = Date.now()
  const diff = timestamp - now

  if (diff < 0) return 'Overdue'
  if (diff < 60000) return 'In less than a minute'
  if (diff < 3600000) {
    const mins = Math.round(diff / 60000)
    return `In ${mins} minute${mins > 1 ? 's' : ''}`
  }
  if (diff < 86400000) {
    const hours = Math.round(diff / 3600000)
    return `In ${hours} hour${hours > 1 ? 's' : ''}`
  }

  const days = Math.round(diff / 86400000)
  return `In ${days} day${days > 1 ? 's' : ''}`
}

export function formatLastExecution(timestamp: number | undefined): string {
  if (!timestamp) return 'Never'

  const now = Date.now()
  const diff = now - timestamp

  if (diff < 60000) return 'Just now'
  if (diff < 3600000) {
    const mins = Math.round(diff / 60000)
    return `${mins} minute${mins > 1 ? 's' : ''} ago`
  }
  if (diff < 86400000) {
    const hours = Math.round(diff / 3600000)
    return `${hours} hour${hours > 1 ? 's' : ''} ago`
  }

  const days = Math.round(diff / 86400000)
  return `${days} day${days > 1 ? 's' : ''} ago`
}
