import React, { useState, useCallback } from 'react'
import {
  DollarSign,
  Shield,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react'
import type { DCAFormData, DCAFrequency, TokenInfo } from '../../types/strategy'
import { DEFAULT_DCA_FORM, FREQUENCY_LABELS } from '../../types/strategy'

interface StrategyFormProps {
  initialData?: Partial<DCAFormData>
  onSubmit: (data: DCAFormData) => Promise<void>
  onCancel: () => void
  isSubmitting?: boolean
  mode?: 'create' | 'edit'
}

const FREQUENCY_OPTIONS: DCAFrequency[] = ['hourly', 'daily', 'weekly', 'biweekly', 'monthly']

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: `${i.toString().padStart(2, '0')}:00 UTC`,
}))

const DAY_OPTIONS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
]

// Common tokens for quick selection
const COMMON_TOKENS: TokenInfo[] = [
  { symbol: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', chainId: 1, decimals: 6 },
  { symbol: 'USDT', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', chainId: 1, decimals: 6 },
  { symbol: 'ETH', address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', chainId: 1, decimals: 18 },
  { symbol: 'WBTC', address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', chainId: 1, decimals: 8 },
  { symbol: 'LINK', address: '0x514910771AF9Ca656af840dff83E8264EcF986CA', chainId: 1, decimals: 18 },
]

export function StrategyForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
  mode = 'create',
}: StrategyFormProps) {
  const [formData, setFormData] = useState<DCAFormData>({
    ...DEFAULT_DCA_FORM,
    ...initialData,
  })
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const updateField = useCallback(<K extends keyof DCAFormData>(field: K, value: DCAFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: '' }))
  }, [])

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }
    if (!formData.fromToken) {
      newErrors.fromToken = 'Select a token to spend'
    }
    if (!formData.toToken) {
      newErrors.toToken = 'Select a token to buy'
    }
    if (formData.fromToken && formData.toToken && formData.fromToken.address === formData.toToken.address) {
      newErrors.toToken = 'Cannot buy the same token'
    }
    if (formData.amountPerExecutionUsd <= 0) {
      newErrors.amountPerExecutionUsd = 'Amount must be greater than 0'
    }
    if (formData.maxSlippageBps < 10 || formData.maxSlippageBps > 1000) {
      newErrors.maxSlippageBps = 'Slippage must be between 0.1% and 10%'
    }
    if (formData.maxGasUsd <= 0) {
      newErrors.maxGasUsd = 'Max gas must be greater than 0'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    await onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <section>
        <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text)' }}>
          Strategy Details
        </h3>

        {/* Name */}
        <div className="mb-4">
          <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>
            Strategy Name
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => updateField('name', e.target.value)}
            placeholder="e.g., Weekly ETH DCA"
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={{
              background: 'var(--surface-2)',
              border: errors.name ? '1px solid var(--error)' : '1px solid var(--line)',
              color: 'var(--text)',
            }}
          />
          {errors.name && (
            <p className="text-xs mt-1" style={{ color: 'var(--error)' }}>{errors.name}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>
            Description (optional)
          </label>
          <textarea
            value={formData.description ?? ''}
            onChange={(e) => updateField('description', e.target.value)}
            placeholder="What is this strategy for?"
            rows={2}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--line)',
              color: 'var(--text)',
            }}
          />
        </div>
      </section>

      {/* Token Selection */}
      <section>
        <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text)' }}>
          Tokens
        </h3>

        <div className="grid grid-cols-2 gap-4">
          {/* From Token */}
          <div>
            <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>
              Spend
            </label>
            <TokenSelect
              value={formData.fromToken}
              onChange={(token) => updateField('fromToken', token)}
              tokens={COMMON_TOKENS.filter((t) => ['USDC', 'USDT', 'ETH'].includes(t.symbol))}
              error={errors.fromToken}
            />
          </div>

          {/* To Token */}
          <div>
            <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>
              Buy
            </label>
            <TokenSelect
              value={formData.toToken}
              onChange={(token) => updateField('toToken', token)}
              tokens={COMMON_TOKENS}
              error={errors.toToken}
            />
          </div>
        </div>
      </section>

      {/* Amount & Schedule */}
      <section>
        <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text)' }}>
          Investment
        </h3>

        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Amount */}
          <div>
            <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>
              Amount per buy
            </label>
            <div className="relative">
              <DollarSign
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
                style={{ color: 'var(--text-muted)' }}
              />
              <input
                type="number"
                value={formData.amountPerExecutionUsd}
                onChange={(e) => updateField('amountPerExecutionUsd', parseFloat(e.target.value) || 0)}
                min={1}
                step={10}
                className="w-full pl-9 pr-3 py-2 rounded-lg text-sm outline-none"
                style={{
                  background: 'var(--surface-2)',
                  border: errors.amountPerExecutionUsd ? '1px solid var(--error)' : '1px solid var(--line)',
                  color: 'var(--text)',
                }}
              />
            </div>
            {errors.amountPerExecutionUsd && (
              <p className="text-xs mt-1" style={{ color: 'var(--error)' }}>{errors.amountPerExecutionUsd}</p>
            )}
          </div>

          {/* Frequency */}
          <div>
            <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>
              Frequency
            </label>
            <select
              value={formData.frequency}
              onChange={(e) => updateField('frequency', e.target.value as DCAFrequency)}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none cursor-pointer"
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--line)',
                color: 'var(--text)',
              }}
            >
              {FREQUENCY_OPTIONS.map((freq) => (
                <option key={freq} value={freq}>
                  {FREQUENCY_LABELS[freq]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Execution Hour */}
          <div>
            <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>
              Time of day
            </label>
            <select
              value={formData.executionHourUtc}
              onChange={(e) => updateField('executionHourUtc', parseInt(e.target.value))}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none cursor-pointer"
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--line)',
                color: 'var(--text)',
              }}
            >
              {HOUR_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Day of Week (for weekly) */}
          {(formData.frequency === 'weekly' || formData.frequency === 'biweekly') && (
            <div>
              <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Day of week
              </label>
              <select
                value={formData.executionDayOfWeek ?? 1}
                onChange={(e) => updateField('executionDayOfWeek', parseInt(e.target.value))}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none cursor-pointer"
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--line)',
                  color: 'var(--text)',
                }}
              >
                {DAY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </section>

      {/* Advanced Settings */}
      <section>
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm font-medium"
          style={{ color: 'var(--accent)' }}
        >
          <Shield className="h-4 w-4" />
          Advanced Settings
          {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {showAdvanced && (
          <div className="mt-4 p-4 rounded-lg space-y-4" style={{ background: 'var(--surface-2)' }}>
            {/* Slippage */}
            <div>
              <label className="flex items-center gap-1 text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Max Slippage
                <Info className="h-3 w-3" />
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  value={formData.maxSlippageBps}
                  onChange={(e) => updateField('maxSlippageBps', parseInt(e.target.value))}
                  min={10}
                  max={500}
                  step={10}
                  className="flex-1"
                />
                <span className="text-sm w-12 text-right" style={{ color: 'var(--text)' }}>
                  {(formData.maxSlippageBps / 100).toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Max Gas */}
            <div>
              <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Max gas per execution
              </label>
              <div className="relative">
                <DollarSign
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
                  style={{ color: 'var(--text-muted)' }}
                />
                <input
                  type="number"
                  value={formData.maxGasUsd}
                  onChange={(e) => updateField('maxGasUsd', parseFloat(e.target.value) || 0)}
                  min={1}
                  step={1}
                  className="w-full pl-9 pr-3 py-2 rounded-lg text-sm outline-none"
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--line)',
                    color: 'var(--text)',
                  }}
                />
              </div>
            </div>

            {/* Skip if gas too high */}
            <div>
              <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Skip execution if gas above (optional)
              </label>
              <div className="relative">
                <DollarSign
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
                  style={{ color: 'var(--text-muted)' }}
                />
                <input
                  type="number"
                  value={formData.skipIfGasAboveUsd ?? ''}
                  onChange={(e) => updateField('skipIfGasAboveUsd', e.target.value ? parseFloat(e.target.value) : undefined)}
                  min={1}
                  step={1}
                  placeholder="No limit"
                  className="w-full pl-9 pr-3 py-2 rounded-lg text-sm outline-none"
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--line)',
                    color: 'var(--text)',
                  }}
                />
              </div>
            </div>

            {/* Budget Limit */}
            <div>
              <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Total budget limit (optional)
              </label>
              <div className="relative">
                <DollarSign
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
                  style={{ color: 'var(--text-muted)' }}
                />
                <input
                  type="number"
                  value={formData.maxTotalSpendUsd ?? ''}
                  onChange={(e) => updateField('maxTotalSpendUsd', e.target.value ? parseFloat(e.target.value) : undefined)}
                  min={formData.amountPerExecutionUsd}
                  step={100}
                  placeholder="No limit"
                  className="w-full pl-9 pr-3 py-2 rounded-lg text-sm outline-none"
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--line)',
                    color: 'var(--text)',
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-4" style={{ borderTop: '1px solid var(--line)' }}>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          style={{
            background: 'var(--surface-2)',
            color: 'var(--text)',
            border: '1px solid var(--line)',
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          style={{
            background: 'var(--accent)',
            color: 'var(--text-inverse)',
          }}
        >
          {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create Strategy' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}

// Token selector component
function TokenSelect({
  value,
  onChange,
  tokens,
  error,
}: {
  value: TokenInfo | null
  onChange: (token: TokenInfo | null) => void
  tokens: TokenInfo[]
  error?: string
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm"
        style={{
          background: 'var(--surface-2)',
          border: error ? '1px solid var(--error)' : '1px solid var(--line)',
          color: value ? 'var(--text)' : 'var(--text-muted)',
        }}
      >
        <span>{value?.symbol ?? 'Select token'}</span>
        <ChevronDown className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div
            className="absolute left-0 right-0 top-full mt-1 z-20 rounded-lg py-1 shadow-lg max-h-48 overflow-y-auto"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--line)',
            }}
          >
            {tokens.map((token) => (
              <button
                key={token.address}
                type="button"
                onClick={() => {
                  onChange(token)
                  setIsOpen(false)
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-black/5 text-left"
                style={{
                  color: 'var(--text)',
                  background: value?.address === token.address ? 'var(--accent-muted)' : undefined,
                }}
              >
                <div
                  className="h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}
                >
                  {token.symbol.charAt(0)}
                </div>
                {token.symbol}
              </button>
            ))}
          </div>
        </>
      )}

      {error && (
        <p className="text-xs mt-1" style={{ color: 'var(--error)' }}>{error}</p>
      )}
    </div>
  )
}
