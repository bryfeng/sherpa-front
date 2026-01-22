import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useCallback, useMemo } from 'react'
import type { RiskPolicyConfig } from '../types/policy'
import { RISK_POLICY_DEFAULTS, RISK_PRESETS, type RiskPresetKey } from '../types/policy'

export interface UseRiskPolicyOptions {
  walletAddress?: string
}

export interface UseRiskPolicyReturn {
  // Data
  config: RiskPolicyConfig | null
  hasPolicy: boolean
  isLoading: boolean
  isSaving: boolean

  // Actions
  save: (config: RiskPolicyConfig) => Promise<void>
  reset: () => Promise<void>
  applyPreset: (preset: RiskPresetKey) => Promise<void>

  // Status
  error: string | null
}

/**
 * Hook for managing user's risk policy configuration.
 * Fetches from Convex and provides mutations for updating.
 */
export function useRiskPolicy({ walletAddress }: UseRiskPolicyOptions): UseRiskPolicyReturn {
  // Query the policy from Convex
  const policyData = useQuery(
    api.riskPolicies.getOrDefault,
    walletAddress ? { walletAddress } : 'skip'
  )

  // Mutations
  const upsertMutation = useMutation(api.riskPolicies.upsert)
  const resetMutation = useMutation(api.riskPolicies.reset)

  // Derive state
  const isLoading = policyData === undefined && walletAddress !== undefined
  const config = useMemo(() => {
    return policyData?.config ? (policyData.config as RiskPolicyConfig) : null
  }, [policyData])

  const hasPolicy = !!policyData?.config

  // Save handler
  const save = useCallback(
    async (newConfig: RiskPolicyConfig) => {
      if (!walletAddress) {
        throw new Error('Wallet address required to save policy')
      }
      await upsertMutation({
        walletAddress,
        config: newConfig,
      })
    },
    [walletAddress, upsertMutation]
  )

  // Reset handler
  const reset = useCallback(async () => {
    if (!walletAddress) {
      throw new Error('Wallet address required to reset policy')
    }
    await resetMutation({ walletAddress })
  }, [walletAddress, resetMutation])

  // Apply preset handler
  const applyPreset = useCallback(
    async (presetKey: RiskPresetKey) => {
      if (!walletAddress) {
        throw new Error('Wallet address required to apply preset')
      }
      const preset = RISK_PRESETS[presetKey]
      const newConfig: RiskPolicyConfig = {
        ...RISK_POLICY_DEFAULTS,
        ...preset.config,
      }
      await upsertMutation({
        walletAddress,
        config: newConfig,
      })
    },
    [walletAddress, upsertMutation]
  )

  return {
    config,
    hasPolicy,
    isLoading,
    isSaving: false, // Convex mutations are instant
    save,
    reset,
    applyPreset,
    error: null,
  }
}

/**
 * Simpler hook that just returns the config without mutation capabilities.
 * Useful for read-only displays.
 */
export function useRiskPolicyConfig(
  walletAddress?: string
): { config: RiskPolicyConfig | null; hasPolicy: boolean } {
  const policyData = useQuery(
    api.riskPolicies.getOrDefault,
    walletAddress ? { walletAddress } : 'skip'
  )

  return useMemo(
    () => ({
      config: policyData?.config ? (policyData.config as RiskPolicyConfig) : null,
      hasPolicy: !!policyData?.config,
    }),
    [policyData],
  )
}
