// @ts-nocheck
// TODO: Update to use new @swig-wallet/lib and @solana/kit APIs
/**
 * Hook for managing Swig Smart Wallets (Solana).
 *
 * Provides functionality to:
 * - Detect if user has a deployed Swig wallet
 * - Deploy a new Swig wallet
 * - Get Swig wallet address and status
 *
 * @module hooks/useSwigWallet
 */

import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'

// Swig wallet status
export type SwigWalletStatus =
  | 'not_connected' // No Solana wallet connected
  | 'checking' // Checking if wallet exists
  | 'not_deployed' // Solana wallet connected but no Swig wallet
  | 'deploying' // Deployment in progress
  | 'deployed' // Swig wallet ready
  | 'error' // Error state

export interface SwigWalletInfo {
  /** Swig wallet address */
  address: string
  /** Owner Solana wallet address */
  ownerAddress: string
  /** Creation timestamp */
  createdAt: number
}

export interface UseSwigWalletOptions {
  /** Solana wallet address (from wallet adapter) */
  solanaAddress?: string
  /** Auto-check for existing wallet on mount */
  autoCheck?: boolean
}

export interface UseSwigWalletReturn {
  // State
  status: SwigWalletStatus
  wallet: SwigWalletInfo | null
  error: string | null
  isLoading: boolean

  // Actions
  checkWallet: () => Promise<void>
  deployWallet: () => Promise<string | null>

  // Helpers
  hasSwigWallet: boolean
  swigWalletAddress: string | null
}

/**
 * Hook for managing Swig Smart Wallets on Solana.
 *
 * @example
 * ```tsx
 * function SolanaWalletSetup() {
 *   const { publicKey } = useWallet() // From @solana/wallet-adapter-react
 *   const { status, wallet, deployWallet, hasSwigWallet } = useSwigWallet({
 *     solanaAddress: publicKey?.toBase58()
 *   })
 *
 *   if (!hasSwigWallet) {
 *     return <button onClick={deployWallet}>Deploy Swig Wallet</button>
 *   }
 *
 *   return <div>Swig Wallet: {wallet?.address}</div>
 * }
 * ```
 */
export function useSwigWallet({
  solanaAddress,
  autoCheck = true,
}: UseSwigWalletOptions = {}): UseSwigWalletReturn {
  const [status, setStatus] = useState<SwigWalletStatus>('not_connected')
  const [wallet, setWallet] = useState<SwigWalletInfo | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Query existing Swig wallet from Convex
  const existingWallet = useQuery(
    api.swigWallets.getByOwner,
    solanaAddress ? { ownerAddress: solanaAddress } : 'skip'
  )

  // Mutation to save Swig wallet
  const saveSwigWallet = useMutation(api.swigWallets.create)

  // Check if user has existing Swig wallet
  const checkWallet = useCallback(async () => {
    if (!solanaAddress) {
      setStatus('not_connected')
      setWallet(null)
      return
    }

    setStatus('checking')
    setError(null)

    try {
      // Check Convex first (faster)
      if (existingWallet) {
        setWallet({
          address: existingWallet.swigWalletAddress,
          ownerAddress: existingWallet.ownerAddress,
          createdAt: existingWallet.createdAt,
        })
        setStatus('deployed')
        return
      }

      // TODO: Call Swig SDK to check for on-chain wallet
      // For now, assume not deployed if not in Convex
      setStatus('not_deployed')
      setWallet(null)
    } catch (err) {
      console.error('Error checking Swig wallet:', err)
      setError(err instanceof Error ? err.message : 'Failed to check wallet')
      setStatus('error')
    }
  }, [solanaAddress, existingWallet])

  // Deploy a new Swig wallet
  const deployWallet = useCallback(async (): Promise<string | null> => {
    if (!solanaAddress) {
      setError('Solana wallet not connected')
      return null
    }

    setStatus('deploying')
    setError(null)

    try {
      // Import Swig SDK dynamically to avoid SSR issues
      const { Swig } = await import('@swig-wallet/lib')
      const { Connection, clusterApiUrl } = await import('@solana/web3.js')

      // Create connection to Solana
      const connection = new Connection(clusterApiUrl('mainnet-beta'))

      // Create Swig wallet with owner
      const swigWallet = await Swig.create({
        connection,
        owner: solanaAddress,
      })

      // Get the wallet address
      const swigWalletAddress = swigWallet.address.toBase58()

      // Save to Convex
      await saveSwigWallet({
        ownerAddress: solanaAddress,
        swigWalletAddress,
      })

      // Update local state
      const newWallet: SwigWalletInfo = {
        address: swigWalletAddress,
        ownerAddress: solanaAddress,
        createdAt: Date.now(),
      }
      setWallet(newWallet)
      setStatus('deployed')

      return swigWalletAddress
    } catch (err) {
      console.error('Error deploying Swig wallet:', err)
      setError(err instanceof Error ? err.message : 'Failed to deploy wallet')
      setStatus('error')
      return null
    }
  }, [solanaAddress, saveSwigWallet])

  // Auto-check on mount and when address changes
  useEffect(() => {
    if (!solanaAddress) {
      setStatus('not_connected')
      setWallet(null)
      return
    }

    if (autoCheck) {
      checkWallet()
    }
  }, [solanaAddress, autoCheck, checkWallet])

  // Update state when Convex data changes
  useEffect(() => {
    if (existingWallet && status !== 'deploying') {
      setWallet({
        address: existingWallet.swigWalletAddress,
        ownerAddress: existingWallet.ownerAddress,
        createdAt: existingWallet.createdAt,
      })
      setStatus('deployed')
    }
  }, [existingWallet, status])

  // Derived state
  const hasSwigWallet = status === 'deployed' && wallet !== null
  const swigWalletAddress = wallet?.address ?? null
  const isLoading = status === 'checking' || status === 'deploying'

  return {
    status,
    wallet,
    error,
    isLoading,
    checkWallet,
    deployWallet,
    hasSwigWallet,
    swigWalletAddress,
  }
}

export default useSwigWallet
