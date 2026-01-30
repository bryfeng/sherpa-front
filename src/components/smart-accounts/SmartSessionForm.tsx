/**
 * Smart Session Grant Form
 *
 * Form for configuring and granting a new Rhinestone Smart Session.
 * Follows ERC-7715 permission request format.
 */

import React, { useState, useCallback } from 'react'
import { Shield, AlertCircle, ChevronDown, ChevronUp, Zap } from 'lucide-react'
import type { SmartSessionConfig, SmartSessionAction } from '../../hooks/useSmartSessions'
import { SUPPORTED_CHAINS, SESSION_DURATIONS, formatUsd } from '../../types/policy'

// Actions available for Smart Sessions
const SMART_SESSION_ACTIONS: {
  key: SmartSessionAction
  label: string
  description: string
}[] = [
  { key: 'swap', label: 'Swap tokens', description: 'Exchange one token for another' },
  { key: 'bridge', label: 'Bridge across chains', description: 'Move tokens between networks' },
  { key: 'transfer', label: 'Transfer tokens', description: 'Send tokens to other addresses' },
  { key: 'approve', label: 'Approve spending', description: 'Allow contracts to spend tokens' },
  { key: 'stake', label: 'Stake tokens', description: 'Lock tokens for rewards' },
  { key: 'unstake', label: 'Unstake tokens', description: 'Unlock staked tokens' },
]

// Common tokens for allowlist
const COMMON_TOKENS = [
  { symbol: 'ETH', name: 'Ethereum', address: '0x0000000000000000000000000000000000000000' },
  { symbol: 'USDC', name: 'USD Coin', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' },
  { symbol: 'USDT', name: 'Tether', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7' },
  { symbol: 'WETH', name: 'Wrapped ETH', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' },
  { symbol: 'DAI', name: 'Dai', address: '0x6B175474E89094C44Da98b954EescdeCB5BE3830' },
]

// Common DEX contracts
const COMMON_CONTRACTS = [
  { name: 'Uniswap V3 Router', address: '0xE592427A0AEce92De3Edee1F18E0157C05861564' },
  { name: '1inch Router', address: '0x1111111254EEB25477B68fb85Ed929f73A960582' },
  { name: 'CoW Protocol', address: '0x9008D19f58AAbD9eD0D60971565AA8510560ab41' },
]

interface SmartSessionFormProps {
  onSubmit: (config: SmartSessionConfig) => Promise<void>
  onCancel: () => void
  isSubmitting?: boolean
}

export function SmartSessionForm({ onSubmit, onCancel, isSubmitting = false }: SmartSessionFormProps) {
  // Actions
  const [allowedActions, setAllowedActions] = useState<SmartSessionAction[]>(['swap'])

  // Spending limit
  const [spendingLimitUsd, setSpendingLimitUsd] = useState(500)

  // Tokens
  const [allowedTokens, setAllowedTokens] = useState<string[]>([])
  const [allowAllTokens, setAllowAllTokens] = useState(true)

  // Contracts
  const [allowedContracts, setAllowedContracts] = useState<string[]>([])
  const [allowAllContracts, setAllowAllContracts] = useState(true)

  // Duration (in seconds)
  const [durationDays, setDurationDays] = useState(7)

  // UI state
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleAction = useCallback((action: SmartSessionAction) => {
    setAllowedActions((prev) =>
      prev.includes(action) ? prev.filter((a) => a !== action) : [...prev, action]
    )
    setError(null)
  }, [])

  const toggleToken = useCallback((address: string) => {
    setAllowedTokens((prev) =>
      prev.includes(address) ? prev.filter((a) => a !== address) : [...prev, address]
    )
  }, [])

  const toggleContract = useCallback((address: string) => {
    setAllowedContracts((prev) =>
      prev.includes(address) ? prev.filter((a) => a !== address) : [...prev, address]
    )
  }, [])

  const handleSubmit = async () => {
    // Validation
    if (allowedActions.length === 0) {
      setError('Select at least one action')
      return
    }
    if (spendingLimitUsd <= 0) {
      setError('Spending limit must be greater than 0')
      return
    }

    const config: SmartSessionConfig = {
      spendingLimitUsd,
      allowedActions,
      allowedTokens: allowAllTokens ? [] : allowedTokens,
      allowedContracts: allowAllContracts ? [] : allowedContracts,
      validityDuration: durationDays * 24 * 60 * 60, // Convert days to seconds
    }

    try {
      await onSubmit(config)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to grant session')
    }
  }

  const expiryDate = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ background: 'var(--surface-2)' }}
        >
          <Shield className="h-5 w-5" style={{ color: 'var(--accent)' }} />
        </div>
        <div>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
            Enable Autonomous Mode
          </h3>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Grant on-chain permissions for autonomous execution
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div
        className="flex items-start gap-2 rounded-lg border px-3 py-2"
        style={{
          borderColor: 'var(--accent)',
          background: 'rgba(var(--accent-rgb), 0.1)',
        }}
      >
        <Zap className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--accent)' }} />
        <p className="text-xs" style={{ color: 'var(--text)' }}>
          This creates an on-chain Smart Session that enforces spending limits and allowed actions
          directly in your smart account contract.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div
          className="flex items-center gap-2 rounded-lg border px-3 py-2"
          style={{
            borderColor: 'var(--error)',
            background: 'rgba(var(--error-rgb), 0.1)',
            color: 'var(--error)',
          }}
        >
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <p className="text-xs">{error}</p>
        </div>
      )}

      {/* Allowed Actions */}
      <div>
        <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--text)' }}>
          Allowed Actions
        </label>
        <div className="grid grid-cols-2 gap-2">
          {SMART_SESSION_ACTIONS.map((action) => (
            <button
              key={action.key}
              type="button"
              onClick={() => toggleAction(action.key)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition ${
                allowedActions.includes(action.key)
                  ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                  : 'border-[var(--line)] hover:border-[var(--accent)]/50'
              }`}
            >
              <div
                className={`h-4 w-4 rounded border flex items-center justify-center ${
                  allowedActions.includes(action.key)
                    ? 'border-[var(--accent)] bg-[var(--accent)]'
                    : 'border-[var(--line)]'
                }`}
              >
                {allowedActions.includes(action.key) && (
                  <svg
                    className="h-3 w-3 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>
              <div>
                <p className="text-xs font-medium" style={{ color: 'var(--text)' }}>
                  {action.label}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Spending Limit */}
      <div>
        <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--text)' }}>
          Spending Limit (USD)
        </label>
        <div className="relative">
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 text-sm"
            style={{ color: 'var(--text-muted)' }}
          >
            $
          </span>
          <input
            type="number"
            value={spendingLimitUsd}
            onChange={(e) => {
              setSpendingLimitUsd(parseFloat(e.target.value) || 0)
              setError(null)
            }}
            className="w-full rounded-lg border py-2 pl-7 pr-3 text-sm"
            style={{
              borderColor: 'var(--line)',
              background: 'var(--surface-2)',
              color: 'var(--text)',
            }}
          />
        </div>
        <p className="mt-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
          Maximum total value that can be spent during this session
        </p>
      </div>

      {/* Duration */}
      <div>
        <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--text)' }}>
          Session Duration
        </label>
        <div className="flex gap-2">
          {SESSION_DURATIONS.map((dur) => (
            <button
              key={dur.days}
              type="button"
              onClick={() => setDurationDays(dur.days)}
              className={`flex-1 rounded-lg border py-2 text-xs font-medium transition ${
                durationDays === dur.days
                  ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                  : 'border-[var(--line)] hover:border-[var(--accent)]/50'
              }`}
              style={{
                color: durationDays === dur.days ? 'var(--accent)' : 'var(--text)',
              }}
            >
              {dur.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
          Expires:{' '}
          {expiryDate.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        </p>
      </div>

      {/* Advanced Settings Toggle */}
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-1 text-xs font-medium"
        style={{ color: 'var(--accent)' }}
      >
        {showAdvanced ? (
          <ChevronUp className="h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" />
        )}
        {showAdvanced ? 'Hide' : 'Show'} Advanced Settings
      </button>

      {/* Advanced Settings */}
      {showAdvanced && (
        <div className="space-y-4 pt-2">
          {/* Token Allowlist */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium" style={{ color: 'var(--text)' }}>
                Token Allowlist
              </label>
              <label
                className="flex items-center gap-1.5 text-[11px]"
                style={{ color: 'var(--text-muted)' }}
              >
                <input
                  type="checkbox"
                  checked={allowAllTokens}
                  onChange={(e) => setAllowAllTokens(e.target.checked)}
                  className="rounded"
                />
                All tokens
              </label>
            </div>
            {!allowAllTokens && (
              <div className="flex flex-wrap gap-2">
                {COMMON_TOKENS.map((token) => (
                  <button
                    key={token.address}
                    type="button"
                    onClick={() => toggleToken(token.address)}
                    className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                      allowedTokens.includes(token.address)
                        ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                        : 'border-[var(--line)] hover:border-[var(--accent)]/50'
                    }`}
                    style={{
                      color: allowedTokens.includes(token.address)
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

          {/* Contract Allowlist */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium" style={{ color: 'var(--text)' }}>
                Contract Allowlist
              </label>
              <label
                className="flex items-center gap-1.5 text-[11px]"
                style={{ color: 'var(--text-muted)' }}
              >
                <input
                  type="checkbox"
                  checked={allowAllContracts}
                  onChange={(e) => setAllowAllContracts(e.target.checked)}
                  className="rounded"
                />
                All verified contracts
              </label>
            </div>
            {!allowAllContracts && (
              <div className="flex flex-wrap gap-2">
                {COMMON_CONTRACTS.map((contract) => (
                  <button
                    key={contract.address}
                    type="button"
                    onClick={() => toggleContract(contract.address)}
                    className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                      allowedContracts.includes(contract.address)
                        ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                        : 'border-[var(--line)] hover:border-[var(--accent)]/50'
                    }`}
                    style={{
                      color: allowedContracts.includes(contract.address)
                        ? 'var(--accent)'
                        : 'var(--text)',
                    }}
                  >
                    {contract.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Summary */}
      <div
        className="rounded-xl border p-3"
        style={{ borderColor: 'var(--line)', background: 'var(--surface-2)' }}
      >
        <p className="text-xs font-medium mb-2" style={{ color: 'var(--text)' }}>
          Session Summary
        </p>
        <ul className="space-y-1 text-xs" style={{ color: 'var(--text-muted)' }}>
          <li>
            {allowedActions.length > 0
              ? `Can ${allowedActions.join(', ')}`
              : 'No actions selected'}
          </li>
          <li>Maximum {formatUsd(spendingLimitUsd)} total spending</li>
          <li>{allowAllTokens ? 'All tokens allowed' : `${allowedTokens.length} tokens allowed`}</li>
          <li>
            {allowAllContracts
              ? 'All verified contracts allowed'
              : `${allowedContracts.length} contracts allowed`}
          </li>
          <li>Valid for {durationDays} days</li>
        </ul>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg border py-2.5 text-xs font-medium transition hover:bg-[var(--surface-2)]"
          style={{ borderColor: 'var(--line)', color: 'var(--text)' }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting || allowedActions.length === 0}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-medium transition disabled:opacity-50"
          style={{ background: 'var(--accent)', color: 'white' }}
        >
          <Shield className="h-3.5 w-3.5" />
          {isSubmitting ? 'Granting...' : 'Grant Session'}
        </button>
      </div>

      {/* Security Note */}
      <p className="text-[11px] text-center" style={{ color: 'var(--text-muted)' }}>
        This will require a wallet signature to enable on-chain permissions
      </p>
    </div>
  )
}

export default SmartSessionForm
