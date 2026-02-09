/**
 * QuoteExecuteButton - Self-contained execute button for Relay quote widgets.
 *
 * Uses the useQuoteExecution hook to manage the full transaction lifecycle
 * with reactive wagmi state. Renders status feedback (spinner, wallet prompt,
 * confirmation, success with tx link, error with retry).
 *
 * Drop this into any quote widget that has a payload.tx object.
 */

import React, { useCallback } from 'react'
import { Loader2, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react'
import { useQuoteExecution, type QuotePayload } from '../../hooks/useQuoteExecution'

// Chain explorers (matches RelayQuoteWidget's CHAIN_META)
const CHAIN_EXPLORERS: Record<number, string> = {
  1: 'https://etherscan.io',
  10: 'https://optimistic.etherscan.io',
  137: 'https://polygonscan.com',
  8453: 'https://basescan.org',
  42161: 'https://arbiscan.io',
  57073: 'https://explorer.inkonchain.com',
}

function getExplorerTxUrl(hash: string, chainId?: number): string | null {
  const base = chainId ? CHAIN_EXPLORERS[chainId] : CHAIN_EXPLORERS[1]
  return base ? `${base}/tx/${hash}` : null
}

interface QuoteExecuteButtonProps {
  /** The widget payload containing tx, status, wallet, quote_expiry, etc. */
  payload: QuotePayload
  /** Label: "Swap", "Bridge", or "Send" */
  label?: string
  /** Whether the wallet is connected and ready */
  walletReady?: boolean
  /** Reason the button should be disabled (from parent validation) */
  disableReason?: string | null
  /** Additional className for the button container */
  className?: string
}

export function QuoteExecuteButton({
  payload,
  label = 'Execute',
  walletReady = false,
  disableReason: parentDisableReason,
  className = '',
}: QuoteExecuteButtonProps) {
  const { state, execute, reset, isLoading, isSuccess, isFailed, txHash } = useQuoteExecution()

  const handleClick = useCallback(() => {
    if (isSuccess || isFailed) {
      reset()
      return
    }
    execute(payload)
  }, [execute, reset, payload, isSuccess, isFailed])

  const chainId = payload.tx?.chainId ? Number(payload.tx.chainId) : undefined

  // Status message mapping
  const statusMessage = (() => {
    switch (state.status) {
      case 'switching_chain': return 'Switching chain...'
      case 'checking_allowance': return 'Checking allowance...'
      case 'approving': return 'Approve in wallet...'
      case 'signing': return 'Sign in wallet...'
      case 'confirming': return 'Confirming...'
      case 'confirmed': return 'Confirmed!'
      case 'failed': return state.error || 'Failed'
      default: return null
    }
  })()

  // When idle, check if parent provides a disable reason
  const disabled = !walletReady || !!parentDisableReason || isLoading
  const buttonDisableReason = !walletReady ? 'Connect wallet' : parentDisableReason

  // ---- CONFIRMED STATE ----
  if (isSuccess && txHash) {
    const explorerUrl = getExplorerTxUrl(txHash, chainId)
    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        <div className="flex items-center gap-2 text-sm">
          <CheckCircle className="h-4 w-4 text-[var(--success)]" />
          <span className="font-medium text-[var(--success)]">Transaction Confirmed</span>
        </div>
        <div className="flex items-center gap-2">
          <code className="text-xs text-[var(--text-muted)] font-mono truncate flex-1">
            {txHash.slice(0, 10)}...{txHash.slice(-8)}
          </code>
          {explorerUrl && (
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-[var(--accent)] hover:underline"
            >
              View <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>
    )
  }

  // ---- FAILED STATE ----
  if (isFailed) {
    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        <div className="flex items-center gap-2 text-sm">
          <AlertCircle className="h-4 w-4 text-[var(--danger)]" />
          <span className="text-[var(--danger)] text-xs line-clamp-2">{state.error || 'Transaction failed'}</span>
        </div>
        <button
          type="button"
          onClick={handleClick}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-[var(--text-inverse)] shadow-sm transition hover:bg-[var(--accent-600)]"
        >
          Retry {label}
        </button>
      </div>
    )
  }

  // ---- LOADING / SIGNING STATE ----
  if (isLoading) {
    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        <button
          type="button"
          disabled
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-[var(--text-inverse)] shadow-sm opacity-80 cursor-not-allowed"
        >
          <Loader2 className="h-4 w-4 animate-spin" />
          {statusMessage}
        </button>
      </div>
    )
  }

  // ---- IDLE STATE ----
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-[var(--text-inverse)] shadow-sm transition hover:bg-[var(--accent-600)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {label}
      </button>
      {buttonDisableReason && (
        <span className="text-xs text-[var(--text-muted)]">{buttonDisableReason}</span>
      )}
    </div>
  )
}

export default QuoteExecuteButton
