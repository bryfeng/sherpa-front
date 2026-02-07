/**
 * Execution Signing Modal - Phase 13.6
 *
 * Displays when a strategy execution is ready for wallet signing.
 * Shows quote details and prompts user to sign the transaction.
 */

import React from 'react'
import { ModalBase } from '../../components/modals/ModalBase'
import { useExecutionSigning, type SigningStatus } from '../hooks/useExecutionSigning'
import { formatStrategyType } from '../hooks/usePendingApprovals'
import { useSourceIntents } from '../../hooks/useSmartSessionIntents'
import { IntentProgressCard } from '../../components/intents/IntentProgressCard'

// ============================================
// TYPES
// ============================================

interface ExecutionSigningModalProps {
  onClose?: () => void
}

// ============================================
// STATUS DISPLAY
// ============================================

function StatusIndicator({ status }: { status: SigningStatus }) {
  const getStatusConfig = () => {
    switch (status) {
      case 'fetching_quote':
        return {
          color: 'bg-blue-500',
          text: 'Preparing',
          animate: true,
        }
      case 'awaiting_signature':
        return {
          color: 'bg-amber-500',
          text: 'Ready',
          animate: false,
        }
      case 'signing':
        return {
          color: 'bg-amber-500',
          text: 'Signing',
          animate: true,
        }
      case 'confirming':
        return {
          color: 'bg-blue-500',
          text: 'Confirming',
          animate: true,
        }
      case 'completed':
        return {
          color: 'bg-green-500',
          text: 'Complete',
          animate: false,
        }
      case 'failed':
        return {
          color: 'bg-red-500',
          text: 'Failed',
          animate: false,
        }
      case 'intent_tracking':
        return {
          color: 'bg-blue-500',
          text: 'Autonomous',
          animate: true,
        }
      default:
        return {
          color: 'bg-slate-400',
          text: '',
          animate: false,
        }
    }
  }

  const config = getStatusConfig()

  return (
    <div className="flex items-center gap-2">
      <div className={`h-2 w-2 rounded-full ${config.color} ${config.animate ? 'animate-pulse' : ''}`} />
      <span className="text-sm text-slate-600">{config.text}</span>
    </div>
  )
}

// ============================================
// QUOTE DETAILS
// ============================================

function QuoteDetails({ quote }: { quote: any }) {
  if (!quote) return null

  return (
    <div className="space-y-3 py-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-500">You send</span>
        <span className="font-medium text-slate-900">
          {quote.amount_in} {quote.token_in}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-500">You receive (est.)</span>
        <span className="font-medium text-slate-900">
          ~{quote.amount_out_est?.toFixed(4)} {quote.token_out}
        </span>
      </div>
      {quote.price_impact && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">Price impact</span>
          <span className={`text-sm ${quote.price_impact > 1 ? 'text-amber-600' : 'text-slate-600'}`}>
            {quote.price_impact.toFixed(2)}%
          </span>
        </div>
      )}
      {quote.gas_estimate && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">Est. gas</span>
          <span className="text-sm text-slate-600">
            {quote.gas_estimate} gwei
          </span>
        </div>
      )}
    </div>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================

export function ExecutionSigningModal({ onClose }: ExecutionSigningModalProps) {
  const {
    state,
    isActive,
    isIntentBacked,
    statusMessage,
    isLoading: _isLoading,
    isSuccess: _isSuccess,
    txHash,
    quote,
    execution,
    smartSessionId: _smartSessionId,
    error,
    signTransaction,
    dismiss,
    reset,
  } = useExecutionSigning()

  // Query intents for this strategy when intent-backed
  const strategyId = execution?.strategyId
  const { intents } = useSourceIntents(
    isIntentBacked ? 'dca_strategy' : null,
    isIntentBacked && strategyId ? String(strategyId) : null,
  )

  // Don't render if no active signing
  if (!isActive && state.status !== 'completed' && state.status !== 'failed') {
    return null
  }

  const strategy = execution?.strategy
  const strategyType = strategy ? formatStrategyType(strategy.strategyType) : 'Strategy'
  const strategyName = strategy?.name || 'Unnamed Strategy'

  const handleClose = () => {
    if (state.status === 'completed' || state.status === 'failed') {
      reset()
    } else {
      dismiss()
    }
    onClose?.()
  }

  // Intent-backed execution: show intent progress instead of signing UI
  if (isIntentBacked) {
    const latestIntent = intents[0]

    return (
      <ModalBase
        title="Autonomous Execution"
        onClose={handleClose}
        footer={
          <div className="flex gap-2">
            <button
              onClick={handleClose}
              className="flex-1 py-2.5 px-4 border border-slate-300 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors"
            >
              Close
            </button>
          </div>
        }
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-slate-900">{strategyName}</h3>
            <p className="text-sm text-slate-500">{strategyType}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-sm text-slate-600">Smart Session</span>
          </div>
        </div>

        {/* Status */}
        <div className="text-center py-2 mb-4">
          <p className="text-slate-600">{statusMessage}</p>
          <p className="text-xs text-slate-400 mt-1">No wallet signature required</p>
        </div>

        {/* Intent Progress */}
        {latestIntent ? (
          <IntentProgressCard intent={latestIntent} />
        ) : (
          <div className="flex items-center justify-center py-6">
            <div className="h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="ml-2 text-sm text-slate-500">Waiting for intent...</span>
          </div>
        )}
      </ModalBase>
    )
  }

  const getActionButton = () => {
    switch (state.status) {
      case 'awaiting_signature':
        return (
          <button
            onClick={signTransaction}
            className="flex-1 py-2.5 px-4 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
          >
            Sign Transaction
          </button>
        )
      case 'signing':
      case 'confirming':
        return (
          <button
            disabled
            className="flex-1 py-2.5 px-4 bg-slate-200 text-slate-500 font-medium rounded-xl cursor-not-allowed"
          >
            {state.status === 'signing' ? 'Check wallet...' : 'Confirming...'}
          </button>
        )
      case 'completed':
        return (
          <button
            onClick={handleClose}
            className="flex-1 py-2.5 px-4 bg-green-600 text-white font-medium rounded-xl hover:bg-green-700 transition-colors"
          >
            Done
          </button>
        )
      case 'failed':
        return (
          <div className="flex gap-2 w-full">
            <button
              onClick={reset}
              className="flex-1 py-2.5 px-4 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
            <button
              onClick={handleClose}
              className="py-2.5 px-4 border border-slate-300 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors"
            >
              Close
            </button>
          </div>
        )
      default:
        return (
          <button
            disabled
            className="flex-1 py-2.5 px-4 bg-slate-200 text-slate-500 font-medium rounded-xl cursor-not-allowed"
          >
            Loading...
          </button>
        )
    }
  }

  return (
    <ModalBase
      title="Execute Strategy"
      onClose={handleClose}
      footer={
        <div className="flex gap-2">
          {state.status !== 'completed' && state.status !== 'failed' && (
            <button
              onClick={dismiss}
              className="py-2.5 px-4 border border-slate-300 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          )}
          {getActionButton()}
        </div>
      }
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-slate-900">{strategyName}</h3>
          <p className="text-sm text-slate-500">{strategyType}</p>
        </div>
        <StatusIndicator status={state.status} />
      </div>

      {/* Status Message */}
      <div className="text-center py-2 mb-4">
        <p className="text-slate-600">{statusMessage}</p>
      </div>

      {/* Quote Details */}
      {quote && <QuoteDetails quote={quote} />}

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {state.status === 'completed' && txHash && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-xl">
          <p className="text-sm text-green-700 mb-1">Transaction confirmed!</p>
          <p className="text-xs text-green-600 font-mono truncate">{txHash}</p>
        </div>
      )}

      {/* Warnings */}
      {quote?.warnings && quote.warnings.length > 0 && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-sm font-medium text-amber-700 mb-1">Warnings</p>
          <ul className="text-xs text-amber-600 space-y-1">
            {quote.warnings.map((warning: string, i: number) => (
              <li key={i}>{warning}</li>
            ))}
          </ul>
        </div>
      )}
    </ModalBase>
  )
}

// ============================================
// NOTIFICATION BADGE (for use in header/sidebar)
// ============================================

export function ExecutionSigningBadge() {
  const { pendingCount, isActive } = useExecutionSigning()

  if (pendingCount === 0 && !isActive) return null

  return (
    <div className="relative">
      {pendingCount > 0 && (
        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
          {pendingCount}
        </span>
      )}
      {isActive && (
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
        </span>
      )}
    </div>
  )
}
