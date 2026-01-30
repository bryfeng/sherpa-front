/**
 * Execution Signing Hook - Phase 13.6
 *
 * Watches for strategy executions that are ready for wallet signing.
 * When an execution enters "executing" state, this hook provides the
 * transaction data and signing flow.
 *
 * Flow:
 * 1. Backend approves execution via chat → state becomes "executing"
 * 2. This hook detects the new execution
 * 3. Fetches quote and builds transaction
 * 4. Prompts user for wallet signature
 * 5. Records completion/failure to Convex
 */

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useQuery, useMutation } from 'convex/react'
import {
  useSendTransaction,
  useWaitForTransactionReceipt,
  useWriteContract,
  useAccount,
  usePublicClient,
} from 'wagmi'
import { type Address, type Hex } from 'viem'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { api as backendApi, type SwapQuoteResponse } from '../../services/api'

// ============================================
// TYPES
// ============================================

export interface ExecutionReadyToSign {
  _id: Id<'strategyExecutions'>
  _creationTime: number
  strategyId: Id<'strategies'>
  walletAddress: string
  currentState: 'executing'
  stateEnteredAt: number
  metadata?: Record<string, unknown>
  strategy: {
    _id: Id<'strategies'>
    name: string
    strategyType: 'dca' | 'rebalance' | 'limit_order' | 'stop_loss' | 'take_profit' | 'custom'
    config: Record<string, unknown>
  } | null
}

export type SigningStatus =
  | 'idle'
  | 'fetching_quote'
  | 'awaiting_signature'
  | 'signing'
  | 'confirming'
  | 'completed'
  | 'failed'
  | 'dismissed'

export interface SigningState {
  status: SigningStatus
  execution: ExecutionReadyToSign | null
  quote: SwapQuoteResponse | null
  txHash?: string
  transactionId?: string // Convex transaction record ID
  error?: string
}

// ============================================
// CONSTANTS
// ============================================

const CHAIN_ID_TO_NAME: Record<number, string> = {
  1: 'ethereum',
  8453: 'base',
  42161: 'arbitrum',
  10: 'optimism',
  137: 'polygon',
}

function getChainName(chainId: number): string {
  return CHAIN_ID_TO_NAME[chainId] || 'ethereum'
}

// ERC20 ABI for token approvals
const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
  },
] as const

const MAX_UINT256 = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')

// ============================================
// HOOK
// ============================================

export function useExecutionSigning() {
  const { address: walletAddress, chainId } = useAccount()
  const publicClient = usePublicClient()

  // State
  const [state, setState] = useState<SigningState>({
    status: 'idle',
    execution: null,
    quote: null,
  })
  const [processedExecutionIds, setProcessedExecutionIds] = useState<Set<string>>(new Set())

  // Convex queries and mutations
  const readyToSignExecutions = useQuery(
    api.strategyExecutions.getReadyToSign,
    walletAddress ? { walletAddress } : 'skip'
  )

  const completeMutation = useMutation(api.strategyExecutions.complete)
  const failMutation = useMutation(api.strategyExecutions.fail)

  // Transaction logging mutations
  const createTransaction = useMutation(api.transactions.createByWalletAddress)
  const markTransactionSubmitted = useMutation(api.transactions.markSubmitted)
  const markTransactionConfirmed = useMutation(api.transactions.markConfirmed)

  // Wagmi hooks
  const {
    sendTransaction,
    data: txHash,
    isPending: isSending,
    error: sendError,
    reset: resetSend,
  } = useSendTransaction()

  const {
    writeContract,
    data: approvalTxHash,
    isPending: isApproving,
    error: approvalError,
    reset: resetApproval,
  } = useWriteContract()

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  })

  // ============================================
  // DETECT NEW EXECUTIONS
  // ============================================

  // When a new execution appears in "executing" state, prepare it for signing
  useEffect(() => {
    if (!readyToSignExecutions || readyToSignExecutions.length === 0) return
    if (state.status !== 'idle' && state.status !== 'dismissed') return

    // Find first unprocessed execution
    const newExecution = readyToSignExecutions.find(
      (exec) => !processedExecutionIds.has(exec._id)
    ) as ExecutionReadyToSign | undefined

    if (newExecution) {
      setState({
        status: 'fetching_quote',
        execution: newExecution,
        quote: null,
      })
    }
  }, [readyToSignExecutions, state.status, processedExecutionIds])

  // ============================================
  // FETCH QUOTE
  // ============================================

  // When status becomes fetching_quote, get the swap quote
  useEffect(() => {
    if (state.status !== 'fetching_quote' || !state.execution) return

    const fetchQuote = async () => {
      const { execution } = state
      if (!execution) return
      const strategy = execution.strategy

      if (!strategy || !walletAddress) {
        setState((s) => ({
          ...s,
          status: 'failed',
          error: 'Missing strategy or wallet',
        }))
        return
      }

      try {
        const config = strategy.config

        // Handle multiple config formats:
        // 1. fromToken/toToken as objects with symbol/address (DCA strategies)
        // 2. from_token/to_token as strings (generic strategies from AI)
        let tokenIn: string | undefined
        let tokenOut: string | undefined
        let _tokenInAddress: string | undefined
        let _tokenOutAddress: string | undefined

        // Try camelCase object format first
        const fromTokenObj = config.fromToken as { symbol?: string; address?: string } | undefined
        const toTokenObj = config.toToken as { symbol?: string; address?: string } | undefined

        if (fromTokenObj?.symbol && toTokenObj?.symbol) {
          tokenIn = fromTokenObj.symbol
          tokenOut = toTokenObj.symbol
          _tokenInAddress = fromTokenObj.address
          _tokenOutAddress = toTokenObj.address
        } else {
          // Fall back to snake_case string format
          tokenIn = config.from_token as string | undefined
          tokenOut = config.to_token as string | undefined
        }

        // Get amount - check if it's specified in USD or token units
        // For DCA strategies, amount is typically in USD
        const amountUsd = (config.amount_usd as number) ||
                         (config.amountPerExecutionUsd as number) ||
                         (config.amountPerExecution as number) // Legacy field, assume USD for DCA
        const amountTokens = config.amount_tokens as number | undefined

        if (!tokenIn || !tokenOut) {
          console.error('Strategy config:', config)
          throw new Error(`Strategy missing token configuration. Found: from=${tokenIn}, to=${tokenOut}`)
        }

        // Use amount_usd if we have a USD amount, otherwise fall back to amount_in
        const quote = await backendApi.swapQuote({
          token_in: tokenIn,
          token_out: tokenOut,
          ...(amountUsd ? { amount_usd: amountUsd } : { amount_in: amountTokens || 10 }),
          chain: getChainName(chainId || 1),
          slippage_bps: (config.maxSlippageBps as number) || 50,
          wallet_address: walletAddress,
        })

        if (!quote.success) {
          throw new Error('Failed to get swap quote')
        }

        setState((s) => ({
          ...s,
          status: 'awaiting_signature',
          quote,
        }))
      } catch (error: any) {
        console.error('Error fetching quote:', error)
        setState((s) => ({
          ...s,
          status: 'failed',
          error: error.message || 'Failed to fetch quote',
        }))
      }
    }

    fetchQuote()
  }, [state.status, state.execution, walletAddress, chainId])

  // ============================================
  // TRANSACTION SUBMISSION & CONFIRMATION
  // ============================================

  // When we get a tx hash, mark transaction as submitted
  useEffect(() => {
    if (!txHash || !state.transactionId) return
    if (state.status === 'completed') return

    const markSubmitted = async () => {
      try {
        await markTransactionSubmitted({
          transactionId: state.transactionId as any,
          txHash,
        })
        setState((s) => ({ ...s, status: 'confirming', txHash }))
      } catch (error) {
        console.error('Failed to mark transaction submitted:', error)
      }
    }

    markSubmitted()
  }, [txHash, state.transactionId, state.status, markTransactionSubmitted])

  // When transaction confirms, record completion
  useEffect(() => {
    if (!isConfirmed || !txHash || !state.execution) return
    if (state.status === 'completed') return

    const recordCompletion = async () => {
      try {
        // Mark transaction as confirmed
        if (state.transactionId) {
          await markTransactionConfirmed({
            transactionId: state.transactionId as any,
          })
        }

        // Mark execution as complete
        await completeMutation({
          executionId: state.execution!._id,
          txHash: txHash,
          outputData: { confirmedAt: Date.now() },
        })

        // Mark as processed
        setProcessedExecutionIds((prev) => new Set([...prev, state.execution!._id]))

        setState((s) => ({
          ...s,
          status: 'completed',
          txHash,
        }))
      } catch (error) {
        console.error('Failed to record completion:', error)
      }
    }

    recordCompletion()
  }, [isConfirmed, txHash, state.execution, state.transactionId, completeMutation, markTransactionConfirmed])

  // ============================================
  // ACTIONS
  // ============================================

  /**
   * Sign and submit the transaction
   */
  const signTransaction = useCallback(async () => {
    if (!state.quote || !state.execution || !walletAddress) {
      console.error('No quote or execution to sign')
      return
    }

    setState((s) => ({ ...s, status: 'signing' }))

    try {
      const txData = state.quote.route?.primary_tx || state.quote.route?.tx
      if (!txData) {
        throw new Error('No transaction data in quote')
      }

      // Create transaction record in Convex
      const transactionId = await createTransaction({
        executionId: state.execution._id,
        walletAddress,
        chain: getChainName(chainId || 1),
        type: 'swap',
        inputData: {
          tokenIn: state.quote.from_token,
          tokenOut: state.quote.to_token,
          amountIn: state.quote.amount_in,
          expectedOut: state.quote.amount_out_est,
        },
        valueUsd: state.quote.price_in_usd * state.quote.amount_in,
      })

      setState((s) => ({ ...s, transactionId }))

      // Check if we need approval first
      const config = state.execution.strategy?.config || {}

      // Get token address from various config formats
      let fromTokenAddress: string | undefined
      const fromTokenObj = config.fromToken as { address?: string } | undefined
      if (fromTokenObj?.address) {
        fromTokenAddress = fromTokenObj.address
      } else if (config.from_token_address) {
        fromTokenAddress = config.from_token_address as string
      }

      const isNativeToken = !fromTokenAddress ||
        fromTokenAddress.toLowerCase() === '0x0000000000000000000000000000000000000000' ||
        fromTokenAddress.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'

      // For non-native tokens, check allowance
      if (!isNativeToken && fromTokenAddress && publicClient) {
        const spender = txData.to as Address
        const currentAllowance = await publicClient.readContract({
          address: fromTokenAddress as Address,
          abi: ERC20_ABI,
          functionName: 'allowance',
          args: [walletAddress as Address, spender],
        })

        // If allowance insufficient, approve first
        // This is a simplified check - in production, compare against actual amount
        if (currentAllowance < MAX_UINT256 / BigInt(2)) {
          writeContract({
            address: fromTokenAddress as Address,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [spender, MAX_UINT256],
          })
          // After approval, user will need to sign again
          // In a full implementation, we'd wait and auto-continue
          return
        }
      }

      // Send the main transaction
      sendTransaction({
        to: txData.to as Address,
        data: txData.data as Hex,
        value: txData.value ? BigInt(txData.value) : BigInt(0),
      })
    } catch (error: any) {
      console.error('Transaction error:', error)
      setState((s) => ({
        ...s,
        status: 'failed',
        error: error.message || 'Transaction failed',
      }))

      // Record failure
      if (state.execution) {
        try {
          await failMutation({
            executionId: state.execution._id,
            errorMessage: error.message || 'Transaction failed',
            errorCode: 'TX_ERROR',
            recoverable: true,
          })
        } catch (convexError) {
          console.error('Failed to record failure:', convexError)
        }
      }
    }
  }, [state.quote, state.execution, walletAddress, chainId, publicClient, writeContract, sendTransaction, failMutation, createTransaction])

  /**
   * Dismiss the current signing request
   */
  const dismiss = useCallback(async () => {
    if (state.execution) {
      // Mark as processed so we don't prompt again
      setProcessedExecutionIds((prev) => new Set([...prev, state.execution!._id]))

      // Record as failed/skipped
      try {
        await failMutation({
          executionId: state.execution._id,
          errorMessage: 'User dismissed signing request',
          errorCode: 'USER_DISMISSED',
          recoverable: true,
        })
      } catch (error) {
        console.error('Failed to record dismissal:', error)
      }
    }

    setState({
      status: 'dismissed',
      execution: null,
      quote: null,
    })
    resetSend()
    resetApproval()
  }, [state.execution, failMutation, resetSend, resetApproval])

  /**
   * Reset to idle state (for retrying)
   */
  const reset = useCallback(() => {
    setState({
      status: 'idle',
      execution: null,
      quote: null,
    })
    resetSend()
    resetApproval()
  }, [resetSend, resetApproval])

  // ============================================
  // COMPUTED VALUES
  // ============================================

  const pendingCount = useMemo(() => {
    if (!readyToSignExecutions) return 0
    return readyToSignExecutions.filter(
      (exec) => !processedExecutionIds.has(exec._id)
    ).length
  }, [readyToSignExecutions, processedExecutionIds])

  const isActive = state.status !== 'idle' && state.status !== 'dismissed' && state.status !== 'completed'

  const statusMessage = useMemo(() => {
    switch (state.status) {
      case 'fetching_quote':
        return 'Fetching swap quote...'
      case 'awaiting_signature':
        return 'Ready to sign transaction'
      case 'signing':
        return 'Please sign in your wallet...'
      case 'confirming':
        return 'Confirming transaction...'
      case 'completed':
        return 'Transaction confirmed!'
      case 'failed':
        return state.error || 'Transaction failed'
      default:
        return ''
    }
  }, [state.status, state.error])

  return {
    // State
    state,
    isActive,
    pendingCount,
    statusMessage,

    // Loading states
    isLoading: state.status === 'fetching_quote' || isSending || isApproving || isConfirming,
    isSuccess: state.status === 'completed',

    // Transaction data
    txHash: txHash || state.txHash,
    approvalTxHash,
    quote: state.quote,
    execution: state.execution,

    // Errors
    error: state.error || sendError?.message || approvalError?.message,

    // Actions
    signTransaction,
    dismiss,
    reset,
  }
}
