/**
 * Strategy Execution Hook
 *
 * Handles the wallet signing flow for strategy executions.
 * Integrates with wagmi for transaction signing and Convex for status updates.
 * Uses Relay API for swap/bridge transaction data.
 */

import { useState, useCallback } from 'react'
import {
  useSendTransaction,
  useWaitForTransactionReceipt,
  useWriteContract,
  useAccount,
  usePublicClient,
} from 'wagmi'
import { parseEther, parseUnits, encodeFunctionData, type Address, type Hex } from 'viem'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { api as backendApi, type SwapQuoteResponse, type TransactionData } from '../services/api'

// ============================================
// TYPES
// ============================================

export interface ExecutionTransaction {
  to: Address
  data?: Hex
  value?: bigint
  chainId: number
}

export interface ExecutionStep {
  type: 'approval' | 'swap' | 'bridge' | 'transfer' | 'custom'
  description: string
  transaction: ExecutionTransaction
  tokenAddress?: Address // For approval steps
  spenderAddress?: Address // For approval steps
}

export interface ExecutionPlan {
  strategyId: string
  executionId: string
  strategyType: string
  steps: ExecutionStep[]
  estimatedGas?: bigint
  warnings?: string[]
}

export type ExecutionStatus =
  | 'idle'
  | 'preparing'
  | 'awaiting_approval_tx'
  | 'approving'
  | 'awaiting_main_tx'
  | 'executing'
  | 'confirming'
  | 'completed'
  | 'failed'
  | 'cancelled'

export interface ExecutionState {
  status: ExecutionStatus
  currentStep: number
  totalSteps: number
  txHash?: string
  error?: string
  plan?: ExecutionPlan
}

// ============================================
// ERC20 ABI (for approvals)
// ============================================

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

// ============================================
// CONSTANTS
// ============================================

// Common DEX router addresses (for reference)
const DEX_ROUTERS: Record<string, Record<number, Address>> = {
  uniswapV3: {
    1: '0xE592427A0AEce92De3Edee1F18E0157C05861564', // Mainnet
    8453: '0x2626664c2603336E57B271c5C0b26F421741e481', // Base
    42161: '0xE592427A0AEce92De3Edee1F18E0157C05861564', // Arbitrum
  },
}

// Native token address (used for ETH)
const NATIVE_TOKEN = '0x0000000000000000000000000000000000000000' as Address

// Max uint256 for unlimited approval
const MAX_UINT256 = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')

// Chain ID to name mapping for backend API
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

// ============================================
// HOOK
// ============================================

export function useStrategyExecution() {
  const { address: walletAddress, chainId } = useAccount()
  const publicClient = usePublicClient()

  // State
  const [state, setState] = useState<ExecutionState>({
    status: 'idle',
    currentStep: 0,
    totalSteps: 0,
  })

  // Convex mutations
  const completeExecution = useMutation(api.strategyExecutions.complete)
  const failExecution = useMutation(api.strategyExecutions.fail)

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
  // PREPARE EXECUTION PLAN
  // ============================================

  const prepareExecutionPlan = useCallback(
    async (
      executionId: Id<'strategyExecutions'>,
      strategyId: Id<'strategies'>,
      strategyType: string,
      config: Record<string, unknown>
    ): Promise<ExecutionPlan> => {
      setState((s) => ({ ...s, status: 'preparing' }))

      const steps: ExecutionStep[] = []
      const warnings: string[] = []

      if (!walletAddress) {
        throw new Error('Wallet not connected')
      }

      switch (strategyType) {
        case 'dca': {
          // DCA: Swap from token to target token using Relay
          const fromToken = config.fromToken as { symbol: string; address: string; decimals: number } | undefined
          const toToken = config.toToken as { symbol: string; address: string; decimals: number } | undefined
          const amountPerExecution = config.amountPerExecution as number | undefined
          const amountUsd = amountPerExecution || (config.amount_usd as number) || 10

          if (!fromToken || !toToken) {
            throw new Error('DCA strategy missing token configuration')
          }

          const isNativeToken = fromToken.address.toLowerCase() === NATIVE_TOKEN.toLowerCase()

          // Fetch swap quote from Relay via backend
          let swapQuote: SwapQuoteResponse
          try {
            swapQuote = await backendApi.swapQuote({
              token_in: fromToken.symbol,
              token_out: toToken.symbol,
              amount_in: amountUsd,
              chain: getChainName(chainId || 1),
              slippage_bps: (config.maxSlippageBps as number) || 50,
              wallet_address: walletAddress,
            })
          } catch (error: any) {
            throw new Error(`Failed to get swap quote: ${error.message || 'Unknown error'}`)
          }

          if (!swapQuote.success) {
            throw new Error('Swap quote failed - no route available')
          }

          // Add any warnings from the quote
          if (swapQuote.warnings?.length) {
            warnings.push(...swapQuote.warnings)
          }

          // Extract transaction data from Relay response
          const txData = swapQuote.route?.primary_tx || swapQuote.route?.tx
          if (!txData) {
            throw new Error('Relay did not return executable transaction data')
          }

          // If not native token, may need approval first
          // Check if approval step is in the Relay response
          const relaySteps = swapQuote.route?.steps || []
          const hasApprovalStep = relaySteps.some(
            (step: any) => step.id === 'approve' || step.action === 'approve'
          )

          if (!isNativeToken && hasApprovalStep) {
            // Find approval transaction in steps
            const approvalStep = relaySteps.find(
              (step: any) => step.id === 'approve' || step.action === 'approve'
            )
            const approvalTx = approvalStep?.items?.[0]?.data

            if (approvalTx) {
              steps.push({
                type: 'approval',
                description: `Approve ${fromToken.symbol} for swap`,
                transaction: {
                  to: approvalTx.to as Address,
                  data: approvalTx.data as Hex,
                  chainId: chainId || 1,
                },
                tokenAddress: fromToken.address as Address,
              })
            }
          }

          // Add main swap step
          steps.push({
            type: 'swap',
            description: `Swap ${swapQuote.amount_in} ${fromToken.symbol} to ~${swapQuote.amount_out_est.toFixed(4)} ${toToken.symbol}`,
            transaction: {
              to: txData.to as Address,
              data: txData.data as Hex,
              value: txData.value ? BigInt(txData.value) : BigInt(0),
              chainId: txData.chainId || chainId || 1,
            },
          })
          break
        }

        case 'limit_order':
        case 'stop_loss':
        case 'take_profit': {
          // These require price conditions to be met first
          // For Phase 1, user approves when they see the execution is ready
          const fromToken = config.fromToken as { symbol: string; address?: string } | undefined
          const toToken = config.toToken as { symbol: string; address?: string } | undefined
          const amount = (config.amount as number) || (config.amountPerExecution as number) || 10

          if (!fromToken || !toToken) {
            throw new Error(`${strategyType} strategy missing token configuration`)
          }

          // Fetch swap quote
          let swapQuote: SwapQuoteResponse
          try {
            swapQuote = await backendApi.swapQuote({
              token_in: fromToken.symbol,
              token_out: toToken.symbol,
              amount_in: amount,
              chain: getChainName(chainId || 1),
              slippage_bps: (config.maxSlippageBps as number) || 50,
              wallet_address: walletAddress,
            })
          } catch (error: any) {
            throw new Error(`Failed to get quote: ${error.message}`)
          }

          const txData = swapQuote.route?.primary_tx || swapQuote.route?.tx
          if (!txData) {
            throw new Error('No executable transaction data available')
          }

          steps.push({
            type: 'swap',
            description: `Execute ${strategyType.replace('_', ' ')}: ${fromToken.symbol} → ${toToken.symbol}`,
            transaction: {
              to: txData.to as Address,
              data: txData.data as Hex,
              value: txData.value ? BigInt(txData.value) : BigInt(0),
              chainId: txData.chainId || chainId || 1,
            },
          })
          break
        }

        case 'rebalance': {
          // Rebalance would involve multiple swaps - needs more complex logic
          warnings.push('Rebalance execution requires multiple transactions')
          steps.push({
            type: 'custom',
            description: 'Rebalance portfolio (multi-step)',
            transaction: {
              to: NATIVE_TOKEN,
              data: '0x' as Hex,
              chainId: chainId || 1,
            },
          })
          break
        }

        default: {
          warnings.push(`Strategy type "${strategyType}" execution not fully implemented`)
          steps.push({
            type: 'custom',
            description: `Execute ${strategyType}`,
            transaction: {
              to: NATIVE_TOKEN,
              data: '0x' as Hex,
              chainId: chainId || 1,
            },
          })
        }
      }

      const plan: ExecutionPlan = {
        strategyId,
        executionId,
        strategyType,
        steps,
        warnings: warnings.length > 0 ? warnings : undefined,
      }

      setState((s) => ({ ...s, plan, totalSteps: steps.length }))
      return plan
    },
    [chainId, walletAddress]
  )

  // ============================================
  // CHECK & EXECUTE APPROVAL
  // ============================================

  const checkAndExecuteApproval = useCallback(
    async (step: ExecutionStep, amount: bigint): Promise<boolean> => {
      if (step.type !== 'approval' || !step.tokenAddress || !step.spenderAddress || !walletAddress) {
        return true // No approval needed
      }

      setState((s) => ({ ...s, status: 'awaiting_approval_tx' }))

      // Check current allowance
      const allowance = await publicClient?.readContract({
        address: step.tokenAddress,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [walletAddress, step.spenderAddress],
      })

      if (allowance && allowance >= amount) {
        return true // Already approved
      }

      // Need to approve
      setState((s) => ({ ...s, status: 'approving' }))

      writeContract({
        address: step.tokenAddress,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [step.spenderAddress, MAX_UINT256],
      })

      // Wait for approval to complete (handled by caller watching approvalTxHash)
      return false
    },
    [walletAddress, publicClient, writeContract]
  )

  // ============================================
  // EXECUTE STRATEGY
  // ============================================

  const execute = useCallback(
    async (
      executionId: Id<'strategyExecutions'>,
      strategyId: Id<'strategies'>,
      strategyType: string,
      config: Record<string, unknown>
    ) => {
      if (!walletAddress) {
        setState({
          status: 'failed',
          currentStep: 0,
          totalSteps: 0,
          error: 'Wallet not connected',
        })
        return
      }

      try {
        // 1. Prepare execution plan (fetches quotes from Relay)
        const plan = await prepareExecutionPlan(executionId, strategyId, strategyType, config)

        if (plan.steps.length === 0) {
          throw new Error('No execution steps generated')
        }

        // 2. Execute each step sequentially
        for (let i = 0; i < plan.steps.length; i++) {
          const step = plan.steps[i]
          setState((s) => ({ ...s, currentStep: i + 1 }))

          if (step.type === 'approval') {
            // Handle token approval
            setState((s) => ({ ...s, status: 'awaiting_approval_tx' }))

            // If approval has its own tx data from Relay, send it directly
            if (step.transaction.data && step.transaction.data !== '0x') {
              setState((s) => ({ ...s, status: 'approving' }))
              sendTransaction({
                to: step.transaction.to,
                data: step.transaction.data,
                value: step.transaction.value,
              })
              // Note: In a full implementation, we'd wait for this tx to confirm
              // before proceeding to the next step. For now, the UI handles this.
              return
            }

            // Otherwise, use the standard approval flow
            const approved = await checkAndExecuteApproval(step, MAX_UINT256)
            if (!approved) {
              // Approval tx sent, waiting for user signature
              return
            }
          } else {
            // Execute main transaction (swap, bridge, etc.)
            setState((s) => ({ ...s, status: 'awaiting_main_tx' }))

            // Validate transaction data
            if (!step.transaction.data || step.transaction.data === '0x') {
              throw new Error(
                `No transaction data for step: ${step.description}. ` +
                'The strategy may not be fully configured or the quote failed.'
              )
            }

            // Send transaction
            setState((s) => ({ ...s, status: 'executing' }))
            sendTransaction({
              to: step.transaction.to,
              data: step.transaction.data,
              value: step.transaction.value,
            })

            // Transaction sent - UI will track confirmation via txHash
            return
          }
        }
      } catch (error: any) {
        console.error('Strategy execution error:', error)

        setState({
          status: 'failed',
          currentStep: 0,
          totalSteps: 0,
          error: error.message || 'Execution failed',
        })

        try {
          await failExecution({
            executionId,
            errorMessage: error.message || 'Execution failed',
            errorCode: 'EXECUTION_ERROR',
            recoverable: true,
          })
        } catch (convexError) {
          console.error('Failed to update execution status:', convexError)
        }
      }
    },
    [
      walletAddress,
      prepareExecutionPlan,
      checkAndExecuteApproval,
      sendTransaction,
      failExecution,
    ]
  )

  // ============================================
  // COMPLETE EXECUTION (called after tx confirms)
  // ============================================

  const handleTransactionConfirmed = useCallback(
    async (executionId: Id<'strategyExecutions'>, txHashValue: string) => {
      setState((s) => ({ ...s, status: 'completed', txHash: txHashValue }))

      await completeExecution({
        executionId,
        txHash: txHashValue,
        outputData: { confirmedAt: Date.now() },
      })
    },
    [completeExecution]
  )

  // ============================================
  // RESET STATE
  // ============================================

  const reset = useCallback(() => {
    setState({
      status: 'idle',
      currentStep: 0,
      totalSteps: 0,
    })
    resetSend()
    resetApproval()
  }, [resetSend, resetApproval])

  // ============================================
  // CANCEL EXECUTION
  // ============================================

  const cancel = useCallback(() => {
    setState((s) => ({ ...s, status: 'cancelled' }))
    reset()
  }, [reset])

  return {
    // State
    state,
    isLoading: state.status === 'preparing' || isSending || isApproving || isConfirming,
    isSuccess: state.status === 'completed',
    error: state.error || sendError?.message || approvalError?.message,

    // Transaction hashes
    txHash: txHash || state.txHash,
    approvalTxHash,

    // Actions
    execute,
    handleTransactionConfirmed,
    reset,
    cancel,

    // Helpers
    prepareExecutionPlan,
  }
}

// ============================================
// HELPER: Format execution status for display
// ============================================

export function formatExecutionStatus(status: ExecutionStatus): string {
  const labels: Record<ExecutionStatus, string> = {
    idle: 'Ready',
    preparing: 'Preparing transaction...',
    awaiting_approval_tx: 'Approve token spending',
    approving: 'Approving...',
    awaiting_main_tx: 'Confirm transaction',
    executing: 'Executing...',
    confirming: 'Confirming...',
    completed: 'Completed',
    failed: 'Failed',
    cancelled: 'Cancelled',
  }
  return labels[status] || status
}

// ============================================
// HELPER: Get status color
// ============================================

export function getExecutionStatusColor(status: ExecutionStatus): string {
  switch (status) {
    case 'completed':
      return 'var(--success)'
    case 'failed':
    case 'cancelled':
      return 'var(--danger)'
    case 'preparing':
    case 'approving':
    case 'executing':
    case 'confirming':
      return 'var(--warning)'
    default:
      return 'var(--text-muted)'
  }
}
