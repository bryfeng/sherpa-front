/**
 * useFundSmartWallet Hook
 *
 * Manages transferring tokens from the connected EOA to a smart wallet.
 * Supports native ETH transfers and ERC20 token transfers.
 *
 * Used by: frontend/src/components/smart-wallet/FundSmartWalletCard.tsx
 * Called from: StrategyActivationFlow (funding step between deploy and grant)
 */

import { useState, useCallback, useEffect } from 'react'
import {
  useSendTransaction,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi'
import { parseEther, parseUnits, type Address } from 'viem'

// ============================================
// TYPES
// ============================================

export type FundingStatus = 'idle' | 'signing' | 'confirming' | 'confirmed' | 'failed'

/** A token option for the funding UI */
export interface FundingToken {
  symbol: string
  address: string // "native" for ETH
  decimals: number
}

export interface UseFundSmartWalletReturn {
  status: FundingStatus
  txHash: string | null
  error: string | null
  fund: (params: {
    smartWalletAddress: string
    token: FundingToken
    amount: string
  }) => void
  reset: () => void
}

// ============================================
// ABI
// ============================================

const ERC20_TRANSFER_ABI = [
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
] as const

// ============================================
// HOOK
// ============================================

export function useFundSmartWallet(): UseFundSmartWalletReturn {
  const [status, setStatus] = useState<FundingStatus>('idle')
  const [txHash, setTxHash] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Native ETH transfer
  const { sendTransaction } = useSendTransaction({
    mutation: {
      onMutate: () => setStatus('signing'),
      onSuccess: (hash) => {
        setTxHash(hash)
        setStatus('confirming')
      },
      onError: (err) => {
        const msg = err.message?.includes('User rejected')
          ? 'Transaction rejected in wallet.'
          : err.message || 'Transfer failed'
        setError(msg)
        setStatus('failed')
      },
    },
  })

  // ERC20 transfer
  const { writeContract } = useWriteContract({
    mutation: {
      onMutate: () => setStatus('signing'),
      onSuccess: (hash) => {
        setTxHash(hash)
        setStatus('confirming')
      },
      onError: (err) => {
        const msg = err.message?.includes('User rejected')
          ? 'Transaction rejected in wallet.'
          : err.message || 'Transfer failed'
        setError(msg)
        setStatus('failed')
      },
    },
  })

  // Wait for tx confirmation
  const { data: receipt } = useWaitForTransactionReceipt({
    hash: txHash as `0x${string}` | undefined,
    query: {
      enabled: !!txHash && status === 'confirming',
    },
  })

  // Update status when receipt arrives
  useEffect(() => {
    if (!receipt || status !== 'confirming') return
    if (receipt.status === 'success') {
      setStatus('confirmed')
    } else {
      setError('Transaction reverted on-chain.')
      setStatus('failed')
    }
  }, [receipt, status])

  const fund = useCallback(
    ({
      smartWalletAddress,
      token,
      amount,
    }: {
      smartWalletAddress: string
      token: FundingToken
      amount: string
    }) => {
      setError(null)
      setTxHash(null)

      if (!amount || parseFloat(amount) <= 0) {
        setError('Enter a valid amount.')
        setStatus('failed')
        return
      }

      if (token.address === 'native') {
        sendTransaction({
          to: smartWalletAddress as Address,
          value: parseEther(amount),
        })
      } else {
        writeContract({
          address: token.address as Address,
          abi: ERC20_TRANSFER_ABI,
          functionName: 'transfer',
          args: [
            smartWalletAddress as Address,
            parseUnits(amount, token.decimals),
          ],
        })
      }
    },
    [sendTransaction, writeContract],
  )

  const reset = useCallback(() => {
    setStatus('idle')
    setTxHash(null)
    setError(null)
  }, [])

  return { status, txHash, error, fund, reset }
}
