/**
 * Smart Session Intents Hook
 *
 * Provides real-time intent tracking for Smart Session transactions.
 */

import { useQuery, useMutation } from 'convex/react'
import { useCallback, useMemo } from 'react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import type {
  SmartSessionIntent,
  IntentStatus,
  CreateIntentData,
} from '../types/smart-session-intent'

// ============================================
// HOOK OPTIONS
// ============================================

export interface UseSmartSessionIntentsOptions {
  smartAccountAddress: string | null
  limit?: number
  includeCompleted?: boolean
}

// ============================================
// MAIN HOOK
// ============================================

export function useSmartSessionIntents({
  smartAccountAddress,
  limit = 50,
  includeCompleted = true,
}: UseSmartSessionIntentsOptions) {
  // Query intents from Convex
  const intentsData = useQuery(
    api.smartSessionIntents.listBySmartAccount,
    smartAccountAddress
      ? { smartAccountAddress, limit, includeCompleted }
      : 'skip'
  )

  // Mutations
  const createMutation = useMutation(api.smartSessionIntents.create)
  const markExecutingMutation = useMutation(api.smartSessionIntents.markExecuting)
  const markSubmittedMutation = useMutation(api.smartSessionIntents.markSubmitted)
  const markConfirmedMutation = useMutation(api.smartSessionIntents.markConfirmed)
  const markFailedMutation = useMutation(api.smartSessionIntents.markFailed)

  // Transform to typed intents
  const intents: SmartSessionIntent[] = useMemo(() => {
    if (!intentsData) return []
    return intentsData as SmartSessionIntent[]
  }, [intentsData])

  // Calculate pending count
  const pendingCount = useMemo(() => {
    return intents.filter(
      (i) => i.status === 'pending' || i.status === 'executing' || i.status === 'confirming'
    ).length
  }, [intents])

  // Get pending intents
  const pendingIntents = useMemo(() => {
    return intents.filter(
      (i) => i.status === 'pending' || i.status === 'executing' || i.status === 'confirming'
    )
  }, [intents])

  const isLoading = intentsData === undefined && smartAccountAddress !== null

  // Create intent
  const create = useCallback(
    async (data: CreateIntentData): Promise<Id<'smartSessionIntents'>> => {
      return await createMutation({
        smartSessionId: data.smartSessionId,
        smartAccountAddress: data.smartAccountAddress,
        intentType: data.intentType,
        chainId: data.chainId,
        sourceType: data.sourceType,
        sourceId: data.sourceId,
        estimatedValueUsd: data.estimatedValueUsd,
        tokenIn: data.tokenIn,
        tokenOut: data.tokenOut,
      })
    },
    [createMutation]
  )

  // Update intent status
  const markExecuting = useCallback(
    async (id: Id<'smartSessionIntents'>) => {
      await markExecutingMutation({ id })
    },
    [markExecutingMutation]
  )

  const markSubmitted = useCallback(
    async (id: Id<'smartSessionIntents'>, txHash: string) => {
      await markSubmittedMutation({ id, txHash })
    },
    [markSubmittedMutation]
  )

  const markConfirmed = useCallback(
    async (
      id: Id<'smartSessionIntents'>,
      options?: { actualValueUsd?: number; gasUsd?: number; tokenOutAmount?: string }
    ) => {
      await markConfirmedMutation({
        id,
        actualValueUsd: options?.actualValueUsd,
        gasUsd: options?.gasUsd,
        tokenOutAmount: options?.tokenOutAmount,
      })
    },
    [markConfirmedMutation]
  )

  const markFailed = useCallback(
    async (id: Id<'smartSessionIntents'>, errorMessage: string) => {
      await markFailedMutation({ id, errorMessage })
    },
    [markFailedMutation]
  )

  // Get intent by ID
  const getIntent = useCallback(
    (id: string) => intents.find((i) => i._id === id),
    [intents]
  )

  return {
    // Data
    intents,
    pendingIntents,
    pendingCount,
    isLoading,

    // Actions
    create,
    markExecuting,
    markSubmitted,
    markConfirmed,
    markFailed,

    // Helpers
    getIntent,
  }
}

// ============================================
// PENDING COUNT HOOK
// ============================================

export function usePendingIntentsCount(smartAccountAddress: string | null) {
  const pendingData = useQuery(
    api.smartSessionIntents.getPending,
    smartAccountAddress ? { smartAccountAddress } : 'skip'
  )

  return {
    count: pendingData?.count ?? 0,
    isLoading: pendingData === undefined && smartAccountAddress !== null,
  }
}

// ============================================
// SOURCE-SPECIFIC HOOK
// ============================================

export function useSourceIntents(
  sourceType: 'dca_strategy' | 'manual' | null,
  sourceId: string | null,
  limit = 20
) {
  const intentsData = useQuery(
    api.smartSessionIntents.getBySource,
    sourceType && sourceId ? { sourceType, sourceId, limit } : 'skip'
  )

  return {
    intents: (intentsData ?? []) as SmartSessionIntent[],
    isLoading: intentsData === undefined && sourceType !== null && sourceId !== null,
  }
}

// ============================================
// SINGLE INTENT HOOK
// ============================================

export function useIntent(intentId: Id<'smartSessionIntents'> | null) {
  const intent = useQuery(
    api.smartSessionIntents.get,
    intentId ? { id: intentId } : 'skip'
  )

  return {
    intent: intent as SmartSessionIntent | null | undefined,
    isLoading: intent === undefined && intentId !== null,
  }
}

// ============================================
// STATUS HELPERS
// ============================================

export function isIntentPending(status: IntentStatus): boolean {
  return status === 'pending' || status === 'executing' || status === 'confirming'
}

export function isIntentTerminal(status: IntentStatus): boolean {
  return status === 'completed' || status === 'failed'
}

export function getIntentProgress(status: IntentStatus): number {
  switch (status) {
    case 'pending':
      return 0
    case 'executing':
      return 33
    case 'confirming':
      return 66
    case 'completed':
      return 100
    case 'failed':
      return 100
    default:
      return 0
  }
}
