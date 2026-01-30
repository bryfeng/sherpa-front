/**
 * Hook for managing Rhinestone Smart Accounts.
 *
 * Provides functionality to:
 * - Detect if user has a deployed Smart Account
 * - Deploy a new Smart Account
 * - Get Smart Account address and status
 *
 * @module hooks/useSmartAccount
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAccount, useWalletClient } from 'wagmi'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'

// Smart Account status
export type SmartAccountStatus =
  | 'not_connected' // No wallet connected
  | 'checking' // Checking if account exists
  | 'not_deployed' // EOA connected but no Smart Account
  | 'deploying' // Deployment in progress
  | 'deployed' // Smart Account ready
  | 'error' // Error state

export interface SmartAccountInfo {
  /** Smart Account address (ERC-7579) */
  address: string
  /** EOA owner address */
  ownerAddress: string
  /** Chains where account is deployed */
  deployedChains: number[]
  /** Installed modules (e.g., Smart Sessions) */
  installedModules: string[]
  /** Creation timestamp */
  createdAt: number
}

export interface UseSmartAccountOptions {
  /** Auto-check for existing account on mount */
  autoCheck?: boolean
}

export interface UseSmartAccountReturn {
  // State
  status: SmartAccountStatus
  account: SmartAccountInfo | null
  error: string | null
  isLoading: boolean

  // Actions
  checkAccount: () => Promise<void>
  deployAccount: () => Promise<string | null>

  // Helpers
  hasSmartAccount: boolean
  smartAccountAddress: string | null
}

/**
 * Hook for managing Rhinestone Smart Accounts.
 *
 * @example
 * ```tsx
 * function WalletSetup() {
 *   const { status, account, deployAccount, hasSmartAccount } = useSmartAccount()
 *
 *   if (!hasSmartAccount) {
 *     return <button onClick={deployAccount}>Deploy Smart Account</button>
 *   }
 *
 *   return <div>Smart Account: {account?.address}</div>
 * }
 * ```
 */
export function useSmartAccount({
  autoCheck = true,
}: UseSmartAccountOptions = {}): UseSmartAccountReturn {
  const { address: eoaAddress, isConnected, chainId } = useAccount()
  const { data: walletClient } = useWalletClient()

  const [status, setStatus] = useState<SmartAccountStatus>('not_connected')
  const [account, setAccount] = useState<SmartAccountInfo | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Query existing Smart Account from Convex
  const existingAccount = useQuery(
    api.smartAccounts.getByOwner,
    eoaAddress ? { ownerAddress: eoaAddress } : 'skip'
  )

  // Mutation to save Smart Account
  const saveSmartAccount = useMutation(api.smartAccounts.create)
  const updateSmartAccount = useMutation(api.smartAccounts.updateDeployment)

  // Check if user has existing Smart Account
  const checkAccount = useCallback(async () => {
    if (!eoaAddress) {
      setStatus('not_connected')
      setAccount(null)
      return
    }

    setStatus('checking')
    setError(null)

    try {
      // Check Convex first (faster)
      if (existingAccount) {
        setAccount({
          address: existingAccount.smartAccountAddress,
          ownerAddress: existingAccount.ownerAddress,
          deployedChains: existingAccount.deployedChains,
          installedModules: existingAccount.installedModules,
          createdAt: existingAccount.createdAt,
        })
        setStatus('deployed')
        return
      }

      // TODO: Call Rhinestone API to check for on-chain account
      // For now, assume not deployed if not in Convex
      setStatus('not_deployed')
      setAccount(null)
    } catch (err) {
      console.error('Error checking Smart Account:', err)
      setError(err instanceof Error ? err.message : 'Failed to check account')
      setStatus('error')
    }
  }, [eoaAddress, existingAccount])

  // Deploy a new Smart Account
  const deployAccount = useCallback(async (): Promise<string | null> => {
    if (!eoaAddress || !walletClient || !chainId) {
      setError('Wallet not connected')
      return null
    }

    setStatus('deploying')
    setError(null)

    try {
      // Import Rhinestone SDK dynamically to avoid SSR issues
      const { RhinestoneSDK } = await import('@rhinestone/sdk')

      // Initialize SDK
      const rhinestone = new RhinestoneSDK()

      // Create account with EOA as owner
      const smartAccount = await rhinestone.createAccount({
        owners: {
          type: 'ecdsa',
          accounts: [walletClient],
        },
      })

      // Get the account address
      const smartAccountAddress = await smartAccount.getAddress()

      // Save to Convex
      await saveSmartAccount({
        ownerAddress: eoaAddress,
        smartAccountAddress,
        deployedChains: [chainId],
        installedModules: [],
      })

      // Update local state
      const newAccount: SmartAccountInfo = {
        address: smartAccountAddress,
        ownerAddress: eoaAddress,
        deployedChains: [chainId],
        installedModules: [],
        createdAt: Date.now(),
      }
      setAccount(newAccount)
      setStatus('deployed')

      return smartAccountAddress
    } catch (err) {
      console.error('Error deploying Smart Account:', err)
      setError(err instanceof Error ? err.message : 'Failed to deploy account')
      setStatus('error')
      return null
    }
  }, [eoaAddress, walletClient, chainId, saveSmartAccount])

  // Auto-check on mount and when address changes
  useEffect(() => {
    if (!isConnected) {
      setStatus('not_connected')
      setAccount(null)
      return
    }

    if (autoCheck) {
      checkAccount()
    }
  }, [isConnected, eoaAddress, autoCheck, checkAccount])

  // Update state when Convex data changes
  useEffect(() => {
    if (existingAccount && status !== 'deploying') {
      setAccount({
        address: existingAccount.smartAccountAddress,
        ownerAddress: existingAccount.ownerAddress,
        deployedChains: existingAccount.deployedChains,
        installedModules: existingAccount.installedModules,
        createdAt: existingAccount.createdAt,
      })
      setStatus('deployed')
    }
  }, [existingAccount, status])

  // Derived state
  const hasSmartAccount = status === 'deployed' && account !== null
  const smartAccountAddress = account?.address ?? null
  const isLoading = status === 'checking' || status === 'deploying'

  return {
    status,
    account,
    error,
    isLoading,
    checkAccount,
    deployAccount,
    hasSmartAccount,
    smartAccountAddress,
  }
}

export default useSmartAccount
