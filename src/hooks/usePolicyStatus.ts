import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useMemo } from 'react'
import type { SystemPolicyStatus } from '../types/policy'

export interface UsePolicyStatusReturn {
  // Status
  status: SystemPolicyStatus
  isLoading: boolean

  // Derived helpers
  isOperational: boolean
  canTrade: boolean
  statusMessage: string | null
  statusLevel: 'ok' | 'warning' | 'error'
}

/**
 * Hook for checking system policy status.
 * Returns operational status, emergency stop, and maintenance mode.
 */
export function usePolicyStatus(): UsePolicyStatusReturn {
  const statusData = useQuery(api.systemPolicy.getStatus)

  const status: SystemPolicyStatus = useMemo(() => {
    if (!statusData) {
      return {
        operational: true,
        emergencyStop: false,
        inMaintenance: false,
        message: undefined,
      }
    }
    return {
      operational: statusData.operational,
      emergencyStop: statusData.emergencyStop,
      inMaintenance: statusData.inMaintenance,
      message: statusData.message,
    }
  }, [statusData])

  const isLoading = statusData === undefined

  const isOperational = status.operational
  const canTrade = !status.emergencyStop && !status.inMaintenance

  const statusMessage = useMemo(() => {
    if (status.emergencyStop) {
      return status.message || 'Trading is temporarily disabled for safety'
    }
    if (status.inMaintenance) {
      return status.message || 'System maintenance in progress'
    }
    return null
  }, [status])

  const statusLevel = useMemo(() => {
    if (status.emergencyStop) return 'error'
    if (status.inMaintenance) return 'warning'
    return 'ok'
  }, [status])

  return {
    status,
    isLoading,
    isOperational,
    canTrade,
    statusMessage,
    statusLevel,
  }
}

/**
 * Hook to check if a specific chain is allowed.
 */
export function useIsChainAllowed(chainId: number): boolean {
  const result = useQuery(api.systemPolicy.isChainAllowed, { chainId })
  return result ?? true // Default to allowed while loading
}

/**
 * Hook to check if a token is blocked.
 */
export function useIsTokenBlocked(tokenAddress: string): boolean {
  const result = useQuery(api.systemPolicy.isTokenBlocked, { tokenAddress })
  return result ?? false // Default to not blocked while loading
}

/**
 * Hook to check if a contract is blocked.
 */
export function useIsContractBlocked(contractAddress: string): boolean {
  const result = useQuery(api.systemPolicy.isContractBlocked, { contractAddress })
  return result ?? false // Default to not blocked while loading
}
