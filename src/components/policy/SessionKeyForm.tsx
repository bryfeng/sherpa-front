import React, { useState, useCallback } from 'react'
import { Key, Plus, AlertCircle } from 'lucide-react'
import type { Permission, SessionKeyConfig } from '../../types/policy'
import { PERMISSIONS, SUPPORTED_CHAINS, SESSION_DURATIONS, formatUsd } from '../../types/policy'

interface SessionKeyFormProps {
  onSubmit: (config: SessionKeyConfig) => Promise<void>
  onCancel: () => void
}

export function SessionKeyForm({ onSubmit, onCancel }: SessionKeyFormProps) {
  // Permissions
  const [permissions, setPermissions] = useState<Permission[]>(['swap'])

  // Value limits
  const [maxValuePerTxUsd, setMaxValuePerTxUsd] = useState(100)
  const [maxTotalValueUsd, setMaxTotalValueUsd] = useState(5000)
  const [maxTransactions, setMaxTransactions] = useState<number | undefined>(undefined)
  const [unlimitedTxs, setUnlimitedTxs] = useState(true)

  // Chains
  const [chainAllowlist, setChainAllowlist] = useState<number[]>([1]) // Default to Ethereum

  // Duration
  const [durationDays, setDurationDays] = useState(90)

  // State
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const togglePermission = useCallback((perm: Permission) => {
    setPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    )
    setError(null)
  }, [])

  const toggleChain = useCallback((chainId: number) => {
    setChainAllowlist((prev) =>
      prev.includes(chainId) ? prev.filter((c) => c !== chainId) : [...prev, chainId]
    )
    setError(null)
  }, [])

  const handleSubmit = async () => {
    // Validation
    if (permissions.length === 0) {
      setError('Select at least one permission')
      return
    }
    if (chainAllowlist.length === 0) {
      setError('Select at least one chain')
      return
    }
    if (maxValuePerTxUsd <= 0) {
      setError('Per-transaction limit must be greater than 0')
      return
    }
    if (maxTotalValueUsd <= 0) {
      setError('Total budget must be greater than 0')
      return
    }
    if (maxValuePerTxUsd > maxTotalValueUsd) {
      setError('Per-transaction limit cannot exceed total budget')
      return
    }

    const config: SessionKeyConfig = {
      permissions,
      valueLimits: {
        maxValuePerTxUsd,
        maxTotalValueUsd,
        maxTransactions: unlimitedTxs ? undefined : maxTransactions,
      },
      chainAllowlist,
      tokenAllowlist: [], // All tokens for now
      contractAllowlist: [], // All contracts for now
      expiresAt: Date.now() + durationDays * 24 * 60 * 60 * 1000,
      durationDays,
    }

    setIsSubmitting(true)
    try {
      await onSubmit(config)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session key')
    } finally {
      setIsSubmitting(false)
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
          <Key className="h-5 w-5" style={{ color: 'var(--accent)' }} />
        </div>
        <div>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
            Create Session Key
          </h3>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Define what this agent can do autonomously
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          className="flex items-center gap-2 rounded-lg border px-3 py-2"
          style={{
            borderColor: 'var(--error)',
            background: 'var(--error)/10',
            color: 'var(--error)',
          }}
        >
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <p className="text-xs">{error}</p>
        </div>
      )}

      {/* Permissions */}
      <div>
        <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--text)' }}>
          Allowed Actions
        </label>
        <div className="grid grid-cols-2 gap-2">
          {PERMISSIONS.map((perm) => (
            <button
              key={perm.key}
              type="button"
              onClick={() => togglePermission(perm.key)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition ${
                permissions.includes(perm.key)
                  ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                  : 'border-[var(--line)] hover:border-[var(--accent)]/50'
              }`}
            >
              <div
                className={`h-4 w-4 rounded border flex items-center justify-center ${
                  permissions.includes(perm.key)
                    ? 'border-[var(--accent)] bg-[var(--accent)]'
                    : 'border-[var(--line)]'
                }`}
              >
                {permissions.includes(perm.key) && (
                  <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <div>
                <p className="text-xs font-medium" style={{ color: 'var(--text)' }}>
                  {perm.label}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Spending Limits */}
      <div>
        <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--text)' }}>
          Spending Limits
        </label>
        <div className="space-y-3">
          <div>
            <label className="text-[11px] mb-1 block" style={{ color: 'var(--text-muted)' }}>
              Max per transaction
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
                value={maxValuePerTxUsd}
                onChange={(e) => {
                  setMaxValuePerTxUsd(parseFloat(e.target.value) || 0)
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
          </div>
          <div>
            <label className="text-[11px] mb-1 block" style={{ color: 'var(--text-muted)' }}>
              Total session budget
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
                value={maxTotalValueUsd}
                onChange={(e) => {
                  setMaxTotalValueUsd(parseFloat(e.target.value) || 0)
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
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                Max transactions
              </label>
              <label className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                <input
                  type="checkbox"
                  checked={unlimitedTxs}
                  onChange={(e) => setUnlimitedTxs(e.target.checked)}
                  className="rounded"
                />
                Unlimited
              </label>
            </div>
            <input
              type="number"
              value={maxTransactions || ''}
              onChange={(e) => setMaxTransactions(parseInt(e.target.value) || undefined)}
              disabled={unlimitedTxs}
              placeholder="e.g., 52"
              className="w-full rounded-lg border py-2 px-3 text-sm disabled:opacity-50"
              style={{
                borderColor: 'var(--line)',
                background: 'var(--surface-2)',
                color: 'var(--text)',
              }}
            />
          </div>
        </div>
      </div>

      {/* Chains */}
      <div>
        <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--text)' }}>
          Allowed Chains
        </label>
        <div className="flex flex-wrap gap-2">
          {SUPPORTED_CHAINS.map((chain) => (
            <button
              key={chain.chainId}
              type="button"
              onClick={() => toggleChain(chain.chainId)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                chainAllowlist.includes(chain.chainId)
                  ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                  : 'border-[var(--line)] hover:border-[var(--accent)]/50'
              }`}
              style={{
                color: chainAllowlist.includes(chain.chainId) ? 'var(--accent)' : 'var(--text)',
              }}
            >
              {chain.name}
            </button>
          ))}
        </div>
      </div>

      {/* Duration */}
      <div>
        <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--text)' }}>
          Session expires in
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
          Expires: {expiryDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      {/* Summary */}
      <div
        className="rounded-xl border p-3"
        style={{ borderColor: 'var(--line)', background: 'var(--surface-2)' }}
      >
        <p className="text-xs font-medium mb-2" style={{ color: 'var(--text)' }}>
          Summary
        </p>
        <ul className="space-y-1 text-xs" style={{ color: 'var(--text-muted)' }}>
          <li>
            {permissions.length > 0
              ? `Can ${permissions.join(', ')}`
              : 'No permissions selected'}
          </li>
          <li>Up to {formatUsd(maxValuePerTxUsd)} per transaction</li>
          <li>Maximum {formatUsd(maxTotalValueUsd)} total</li>
          <li>
            On {chainAllowlist.length > 0
              ? chainAllowlist.map((id) => SUPPORTED_CHAINS.find((c) => c.chainId === id)?.name).join(', ')
              : 'no chains selected'}
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
          disabled={isSubmitting || permissions.length === 0 || chainAllowlist.length === 0}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-medium transition disabled:opacity-50"
          style={{ background: 'var(--accent)', color: 'white' }}
        >
          <Plus className="h-3.5 w-3.5" />
          {isSubmitting ? 'Creating...' : 'Create Session Key'}
        </button>
      </div>
    </div>
  )
}
