/**
 * useQuoteExecution - Ad-hoc swap/bridge execution via wagmi hooks
 *
 * Manages the full lifecycle of executing a Relay quote from chat:
 *   idle -> checking_allowance -> approving -> awaiting_signature -> signing -> confirming -> confirmed | failed
 *
 * Uses wagmi's useSendTransaction + useWriteContract for reactive state.
 * This is the React-hook counterpart to handleRelayExecution in useDeFiChatController
 * (which uses walletClient imperatively).
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import {
  useSendTransaction,
  useWaitForTransactionReceipt,
  useWriteContract,
  useAccount,
  usePublicClient,
  useSwitchChain,
} from 'wagmi'
import { type Address, type Hex, erc20Abi } from 'viem'

// ============================================
// TYPES
// ============================================

export type QuoteExecutionStatus =
  | 'idle'
  | 'switching_chain'
  | 'checking_allowance'
  | 'approving'
  | 'awaiting_signature'
  | 'signing'
  | 'confirming'
  | 'confirmed'
  | 'failed'

export interface QuoteExecutionState {
  status: QuoteExecutionStatus
  txHash?: string
  error?: string
}

/** The tx object embedded in a Relay quote widget payload */
export interface RelayTxData {
  to: string
  data: string
  value?: string
  chainId?: number
  gas?: string
  gasLimit?: string
  maxFeePerGas?: string
  maxPriorityFeePerGas?: string
}

/** Approval data from Relay quote */
export interface ApprovalData {
  tokenAddress: string
  spenderAddress: string
  amount: string
}

export interface QuotePayload {
  tx?: RelayTxData
  status?: string
  quote_expiry?: any
  wallet?: { address?: string }
  quote_type?: string
  approval_data?: ApprovalData
  amounts?: {
    input_amount_wei?: string
    input_base_units?: string
  }
  breakdown?: {
    input?: {
      token_address?: string
      symbol?: string
    }
  }
}

// ============================================
// HELPERS
// ============================================

function ensureBigInt(value: any): bigint | undefined {
  if (typeof value === 'bigint') return value
  if (typeof value === 'string' && value.trim().length) {
    try { return BigInt(value) } catch { return undefined }
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return BigInt(Math.trunc(value))
  }
  return undefined
}

function resolveExpiryMs(input: any): number | undefined {
  if (!input) return undefined
  if (typeof input === 'string') {
    const parsed = Date.parse(input)
    return Number.isNaN(parsed) ? undefined : parsed
  }
  const iso = input.iso || input.ISO
  if (iso) {
    const parsed = Date.parse(String(iso))
    if (!Number.isNaN(parsed)) return parsed
  }
  const epoch = input.epoch ?? input.EPOCH
  if (typeof epoch !== 'undefined') {
    const epochNum = Number(epoch)
    if (Number.isFinite(epochNum)) {
      return epochNum > 1e12 ? epochNum : epochNum * 1000
    }
  }
  return undefined
}

// ============================================
// HOOK
// ============================================

export function useQuoteExecution() {
  const { address: walletAddress, chainId: connectedChainId } = useAccount()
  const publicClient = usePublicClient()
  const { switchChainAsync } = useSwitchChain()

  const [state, setState] = useState<QuoteExecutionState>({ status: 'idle' })
  const executingRef = useRef(false)

  // wagmi hooks for sending the main tx
  const {
    sendTransaction,
    data: txHash,
    isPending: _isSending,
    error: sendError,
    reset: resetSend,
  } = useSendTransaction()

  // wagmi hook for ERC20 approval
  const {
    writeContract,
    data: approvalTxHash,
    isPending: _isApproving,
    error: approvalError,
    reset: resetApproval,
  } = useWriteContract()

  // Wait for approval tx to confirm before sending main tx
  const { isSuccess: approvalConfirmed } = useWaitForTransactionReceipt({
    hash: approvalTxHash,
  })

  // Wait for main tx confirmation
  const { isLoading: _isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  })

  // Track main tx hash in state
  useEffect(() => {
    if (txHash && state.status === 'signing') {
      setState((s) => ({ ...s, status: 'confirming', txHash }))
    }
  }, [txHash, state.status])

  // Track confirmation
  useEffect(() => {
    if (isConfirmed && txHash && state.status === 'confirming') {
      setState((s) => ({ ...s, status: 'confirmed', txHash }))
      executingRef.current = false
    }
  }, [isConfirmed, txHash, state.status])

  // Track send errors
  useEffect(() => {
    if (sendError && state.status === 'signing') {
      const message = (sendError as any)?.shortMessage || sendError.message || 'Transaction rejected'
      setState({ status: 'failed', error: message })
      executingRef.current = false
    }
  }, [sendError, state.status])

  // Track approval errors
  useEffect(() => {
    if (approvalError && state.status === 'approving') {
      const message = (approvalError as any)?.shortMessage || approvalError.message || 'Approval rejected'
      setState({ status: 'failed', error: message })
      executingRef.current = false
    }
  }, [approvalError, state.status])

  /**
   * After approval confirms, re-store the pending tx params and send the main tx.
   * We stash these in a ref so the effect can access them.
   */
  const pendingTxRef = useRef<{ to: Address; data: Hex; value: bigint } | null>(null)

  useEffect(() => {
    if (approvalConfirmed && state.status === 'approving' && pendingTxRef.current) {
      setState((s) => ({ ...s, status: 'signing' }))
      const { to, data, value } = pendingTxRef.current
      sendTransaction({ to, data, value })
      pendingTxRef.current = null
    }
  }, [approvalConfirmed, state.status, sendTransaction])

  /**
   * Execute a quote: validate, handle chain switching, approvals, and send tx.
   */
  const execute = useCallback(async (payload: QuotePayload) => {
    if (executingRef.current) return
    executingRef.current = true

    resetSend()
    resetApproval()

    try {
      // Validate wallet
      if (!walletAddress) {
        throw new Error('Connect a wallet to execute.')
      }

      const tx = payload.tx
      if (!tx || !tx.to || !tx.data) {
        throw new Error('Quote has no transaction data. Request a new quote.')
      }

      if (payload.status && payload.status !== 'ok') {
        throw new Error('Quote is incomplete. Ask for a refresh.')
      }

      // Check expiry
      const expiryMs = resolveExpiryMs(payload.quote_expiry)
      if (typeof expiryMs === 'number' && expiryMs <= Date.now()) {
        throw new Error('Quote has expired. Please refresh before executing.')
      }

      // Check wallet match
      const quoteWallet = payload.wallet?.address
      if (quoteWallet && walletAddress.toLowerCase() !== quoteWallet.toLowerCase()) {
        throw new Error('Connected wallet does not match the quote wallet.')
      }

      // Chain switching if needed
      const desiredChainId = typeof tx.chainId === 'number' ? tx.chainId : (tx.chainId ? Number(tx.chainId) : undefined)
      if (desiredChainId && connectedChainId !== desiredChainId && switchChainAsync) {
        setState({ status: 'switching_chain' })
        try {
          await switchChainAsync({ chainId: desiredChainId })
        } catch {
          throw new Error(`Switch your wallet to chain ID ${desiredChainId} to continue.`)
        }
      }

      // Check if ERC20 approval is needed
      const approvalData = payload.approval_data
      const to = tx.to as Address
      const data = tx.data as Hex
      const value = ensureBigInt(tx.value) ?? 0n

      if (approvalData && approvalData.tokenAddress && approvalData.spenderAddress) {
        setState({ status: 'checking_allowance' })

        const approveAmount = ensureBigInt(approvalData.amount)
        if (typeof approveAmount === 'undefined') {
          throw new Error('Approval amount is invalid.')
        }

        // Check current allowance
        let needsApproval = true
        if (publicClient) {
          try {
            const currentAllowance = await publicClient.readContract({
              address: approvalData.tokenAddress as Address,
              abi: erc20Abi,
              functionName: 'allowance',
              args: [walletAddress as Address, approvalData.spenderAddress as Address],
            })
            needsApproval = (currentAllowance as bigint) < approveAmount
          } catch {
            // If we can't check, assume we need approval
          }
        }

        if (needsApproval) {
          setState({ status: 'approving' })
          pendingTxRef.current = { to, data, value }
          writeContract({
            address: approvalData.tokenAddress as Address,
            abi: erc20Abi,
            functionName: 'approve',
            args: [approvalData.spenderAddress as Address, approveAmount],
          })
          // The useEffect for approvalConfirmed will handle sending the main tx
          return
        }
      }

      // No approval needed — send the main tx directly
      setState({ status: 'signing' })
      sendTransaction({ to, data, value })
    } catch (err: any) {
      setState({ status: 'failed', error: err.message || 'Execution failed' })
      executingRef.current = false
    }
  }, [walletAddress, connectedChainId, publicClient, switchChainAsync, sendTransaction, writeContract, resetSend, resetApproval])

  /**
   * Reset to idle state
   */
  const reset = useCallback(() => {
    setState({ status: 'idle' })
    resetSend()
    resetApproval()
    pendingTxRef.current = null
    executingRef.current = false
  }, [resetSend, resetApproval])

  return {
    state,
    execute,
    reset,
    isIdle: state.status === 'idle',
    isLoading: ['switching_chain', 'checking_allowance', 'approving', 'awaiting_signature', 'signing', 'confirming'].includes(state.status),
    isSuccess: state.status === 'confirmed',
    isFailed: state.status === 'failed',
    txHash: txHash || state.txHash,
  }
}
