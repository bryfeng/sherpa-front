/**
 * FundSmartWalletCard
 *
 * UI for transferring tokens from the user's EOA to their smart wallet.
 * Shown as a step in the StrategyActivationFlow between deploy and session grant.
 *
 * Uses: frontend/src/hooks/useFundSmartWallet.ts
 * Called by: frontend/src/components/strategies/StrategyActivationFlow.tsx
 */

import React, { useState, useCallback } from 'react'
import {
  Wallet,
  Copy,
  CheckCircle2,
  Loader2,
  ArrowRight,
  ArrowDownToLine,
  XCircle,
  ChevronDown,
} from 'lucide-react'
import {
  useFundSmartWallet,
  type FundingToken,
} from '../../hooks/useFundSmartWallet'

// ============================================
// DEFAULT TOKENS (Base chain)
// ============================================

const DEFAULT_TOKENS: FundingToken[] = [
  { symbol: 'ETH', address: 'native', decimals: 18 },
  {
    symbol: 'USDC',
    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base
    decimals: 6,
  },
]

// ============================================
// PROPS
// ============================================

export interface FundSmartWalletCardProps {
  smartWalletAddress: string
  onContinue: () => void
  onCancel: () => void
  onSkip?: () => void
}

// ============================================
// COMPONENT
// ============================================

export function FundSmartWalletCard({
  smartWalletAddress,
  onContinue,
  onCancel,
  onSkip,
}: FundSmartWalletCardProps) {
  const [amount, setAmount] = useState('')
  const [selectedToken, setSelectedToken] = useState<FundingToken>(DEFAULT_TOKENS[0])
  const [showTokenDropdown, setShowTokenDropdown] = useState(false)
  const [copied, setCopied] = useState(false)

  const { status, txHash, error, fund, reset } = useFundSmartWallet()

  const truncatedAddress = `${smartWalletAddress.slice(0, 6)}...${smartWalletAddress.slice(-4)}`

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(smartWalletAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [smartWalletAddress])

  const handleFund = useCallback(() => {
    fund({
      smartWalletAddress,
      token: selectedToken,
      amount,
    })
  }, [fund, smartWalletAddress, selectedToken, amount])

  const handleRetry = useCallback(() => {
    reset()
    setAmount('')
  }, [reset])

  const isActionDisabled = status === 'signing' || status === 'confirming'

  // Confirmed state — show success and continue button
  if (status === 'confirmed') {
    return (
      <div>
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text)' }}>
          Fund Smart Wallet
        </h3>

        <div className="text-center py-4">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3"
            style={{ background: 'var(--success-muted)' }}
          >
            <CheckCircle2 className="h-7 w-7" style={{ color: 'var(--success)' }} />
          </div>

          <h4 className="font-medium mb-1" style={{ color: 'var(--text)' }}>
            Wallet Funded
          </h4>
          <p className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>
            {amount} {selectedToken.symbol} sent to your smart wallet.
          </p>
          {txHash && (
            <p className="text-xs font-mono break-all" style={{ color: 'var(--text-muted)' }}>
              Tx: {txHash.slice(0, 10)}...{txHash.slice(-8)}
            </p>
          )}
        </div>

        <button
          onClick={onContinue}
          className="w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
          style={{ background: 'var(--accent)', color: 'white' }}
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    )
  }

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text)' }}>
        Fund Smart Wallet
      </h3>

      <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
        Transfer tokens from your connected wallet to your smart wallet. The smart wallet needs funds
        to execute trades autonomously.
      </p>

      {/* Smart Wallet Address */}
      <div className="mb-4 p-3 rounded-lg" style={{ background: 'var(--surface-2)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4" style={{ color: 'var(--accent)' }} />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Smart Wallet
            </span>
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-xs transition-colors"
            style={{ color: 'var(--accent)' }}
          >
            <Copy className="h-3 w-3" />
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <p className="text-sm font-mono mt-1" style={{ color: 'var(--text)' }}>
          {truncatedAddress}
        </p>
      </div>

      {/* Token + Amount Input */}
      <div className="mb-4">
        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
          Amount
        </label>
        <div
          className="flex items-center gap-2 p-2 rounded-lg"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--line)' }}
        >
          {/* Token Selector */}
          <div className="relative">
            <button
              onClick={() => setShowTokenDropdown(!showTokenDropdown)}
              disabled={isActionDisabled}
              className="flex items-center gap-1 px-2 py-1 rounded text-sm font-medium transition-colors disabled:opacity-50"
              style={{ background: 'var(--surface-3)', color: 'var(--text)' }}
            >
              {selectedToken.symbol}
              <ChevronDown className="h-3 w-3" />
            </button>
            {showTokenDropdown && (
              <div
                className="absolute top-full left-0 mt-1 py-1 rounded-lg shadow-lg z-10 min-w-[100px]"
                style={{ background: 'var(--surface-3)', border: '1px solid var(--line)' }}
              >
                {DEFAULT_TOKENS.map((token) => (
                  <button
                    key={token.symbol}
                    onClick={() => {
                      setSelectedToken(token)
                      setShowTokenDropdown(false)
                    }}
                    className="w-full text-left px-3 py-1.5 text-sm transition-colors hover:opacity-80"
                    style={{
                      color:
                        token.symbol === selectedToken.symbol
                          ? 'var(--accent)'
                          : 'var(--text)',
                    }}
                  >
                    {token.symbol}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Amount Input */}
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.0"
            disabled={isActionDisabled}
            className="flex-1 bg-transparent text-sm text-right outline-none disabled:opacity-50"
            style={{ color: 'var(--text)' }}
            min="0"
            step="any"
          />
        </div>
      </div>

      {/* Error Display */}
      {error && status === 'failed' && (
        <div
          className="mb-4 p-3 rounded-lg flex items-start gap-2"
          style={{ background: 'var(--error-muted)', border: '1px solid var(--error)' }}
        >
          <XCircle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: 'var(--error)' }} />
          <div>
            <p className="text-sm" style={{ color: 'var(--error)' }}>
              {error}
            </p>
            <button
              onClick={handleRetry}
              className="text-xs mt-1 underline"
              style={{ color: 'var(--error)' }}
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Status Feedback */}
      {(status === 'signing' || status === 'confirming') && (
        <div className="mb-4 p-3 rounded-lg flex items-center gap-2" style={{ background: 'var(--surface-2)' }}>
          <Loader2 className="h-4 w-4 animate-spin" style={{ color: 'var(--accent)' }} />
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {status === 'signing' ? 'Confirm in your wallet...' : 'Waiting for confirmation...'}
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          disabled={isActionDisabled}
          className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          style={{ background: 'var(--surface-2)', color: 'var(--text)' }}
        >
          Cancel
        </button>
        <button
          onClick={handleFund}
          disabled={isActionDisabled || !amount || parseFloat(amount) <= 0}
          className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          style={{ background: 'var(--accent)', color: 'white' }}
        >
          {isActionDisabled ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {status === 'signing' ? 'Signing...' : 'Confirming...'}
            </>
          ) : (
            <>
              <ArrowDownToLine className="h-4 w-4" />
              Fund Wallet
            </>
          )}
        </button>
      </div>

      {/* Skip option */}
      {onSkip && (
        <button
          onClick={onSkip}
          disabled={isActionDisabled}
          className="w-full mt-3 text-xs text-center transition-colors disabled:opacity-50"
          style={{ color: 'var(--text-muted)' }}
        >
          Skip — I&apos;ll fund my wallet later
        </button>
      )}
    </div>
  )
}

export default FundSmartWalletCard
