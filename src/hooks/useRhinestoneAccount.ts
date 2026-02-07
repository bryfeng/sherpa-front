/**
 * useRhinestoneAccount Hook
 *
 * Manages the Rhinestone smart account lifecycle:
 * - Queries Convex for existing smart account record
 * - Creates RhinestoneAccount object (deterministic address, no on-chain tx)
 * - Deploys smart account on-chain when requested
 * - Records deployment in Convex
 *
 * Called by: frontend/src/components/strategies/StrategyActivationFlow.tsx
 * Uses: frontend/src/services/rhinestone.ts
 */

import { useState, useCallback, useRef } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { useWalletClient, useAccount } from 'wagmi'
import { api } from '../../convex/_generated/api'
import {
  createSmartAccount,
  DEFAULT_DEPLOY_CHAIN,
  type RhinestoneAccount,
} from '../services/rhinestone'
import type { Chain } from 'viem'

// ============================================
// TYPES
// ============================================

export interface UseRhinestoneAccountReturn {
  /** Deterministic smart account address (available before deploy) */
  smartAccountAddress: string | null
  /** Whether the account is deployed on-chain */
  isDeployed: boolean
  /** Whether a deploy transaction is in progress */
  isDeploying: boolean
  /** Whether the account object is being initialized */
  isInitializing: boolean
  /** The RhinestoneAccount instance (null until initialize() called) */
  account: RhinestoneAccount | null
  /** Error from last operation */
  error: string | null
  /** Initialize the account object (no on-chain tx) */
  initialize: () => Promise<RhinestoneAccount>
  /** Deploy on-chain (user signs tx) */
  deploy: (chain?: Chain) => Promise<boolean>
}

// ============================================
// HOOK
// ============================================

export function useRhinestoneAccount(): UseRhinestoneAccountReturn {
  const { address: walletAddress } = useAccount()
  const { data: walletClient } = useWalletClient()

  const [account, setAccount] = useState<RhinestoneAccount | null>(null)
  const [smartAccountAddress, setSmartAccountAddress] = useState<string | null>(null)
  const [isDeploying, setIsDeploying] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Ref to prevent duplicate initialization
  const initPromiseRef = useRef<Promise<RhinestoneAccount> | null>(null)

  // Query Convex for existing smart account record
  const existingAccount = useQuery(
    api.smartAccounts.getByOwner,
    walletAddress ? { ownerAddress: walletAddress } : 'skip',
  )

  // Convex mutations
  const createAccountRecord = useMutation(api.smartAccounts.create)
  const updateDeployment = useMutation(api.smartAccounts.updateDeployment)

  // Derive deployed status from Convex record
  const isDeployed = !!(
    existingAccount &&
    existingAccount.deployedChains.length > 0
  )

  // If we have a Convex record, use its address
  const resolvedAddress =
    smartAccountAddress ?? existingAccount?.smartAccountAddress ?? null

  /**
   * Initialize the RhinestoneAccount object.
   * This is deterministic and does NOT send any on-chain transaction.
   * The address is available immediately after initialization.
   */
  const initialize = useCallback(async (): Promise<RhinestoneAccount> => {
    // Return existing if already initialized
    if (account) return account

    // Deduplicate concurrent calls
    if (initPromiseRef.current) return initPromiseRef.current

    if (!walletClient) {
      throw new Error('Wallet not connected')
    }

    setIsInitializing(true)
    setError(null)

    const promise = (async () => {
      try {
        const rhinestoneAccount = await createSmartAccount(walletClient)
        const address = rhinestoneAccount.getAddress()

        setAccount(rhinestoneAccount)
        setSmartAccountAddress(address)

        return rhinestoneAccount
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to initialize smart account'
        setError(message)
        throw err
      } finally {
        setIsInitializing(false)
        initPromiseRef.current = null
      }
    })()

    initPromiseRef.current = promise
    return promise
  }, [walletClient, account])

  /**
   * Deploy the smart account on-chain.
   * The user will be prompted to sign a transaction.
   * Records deployment in Convex.
   */
  const deploy = useCallback(
    async (chain: Chain = DEFAULT_DEPLOY_CHAIN): Promise<boolean> => {
      setError(null)
      setIsDeploying(true)

      try {
        // Initialize if not yet done
        let acc = account
        if (!acc) {
          acc = await initialize()
        }

        // Check if already deployed on this chain
        const alreadyDeployed = await acc.isDeployed(chain)
        if (alreadyDeployed) {
          // Record in Convex if not already
          if (walletAddress) {
            const address = acc.getAddress()
            await createAccountRecord({
              ownerAddress: walletAddress,
              smartAccountAddress: address,
              deployedChains: [chain.id],
              installedModules: ['smart-sessions'],
            })
          }
          return true
        }

        // Deploy on-chain (user signs transaction)
        const success = await acc.deploy(chain)

        if (success && walletAddress) {
          const address = acc.getAddress()

          if (existingAccount) {
            // Update existing Convex record with new chain
            await updateDeployment({
              ownerAddress: walletAddress,
              addChains: [chain.id],
            })
          } else {
            // Create new Convex record
            await createAccountRecord({
              ownerAddress: walletAddress,
              smartAccountAddress: address,
              deployedChains: [chain.id],
              installedModules: ['smart-sessions'],
            })
          }
        }

        return success
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to deploy smart account'
        setError(message)
        return false
      } finally {
        setIsDeploying(false)
      }
    },
    [account, initialize, walletAddress, existingAccount, createAccountRecord, updateDeployment],
  )

  return {
    smartAccountAddress: resolvedAddress,
    isDeployed,
    isDeploying,
    isInitializing,
    account,
    error,
    initialize,
    deploy,
  }
}
