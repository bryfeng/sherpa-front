import React, { useState, useCallback } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Info,
  AlertCircle,
} from 'lucide-react'
import type {
  CopyConfigFormData,
  SizingMode,
  LeaderProfile,
} from '../../types/copy-trading'
import { truncateAddress } from '../../hooks/useCopyTrading'

interface CopyConfigFormProps {
  leader: LeaderProfile
  onSubmit: (config: CopyConfigFormData) => Promise<void>
  onCancel: () => void
  isSubmitting?: boolean
}

type Step = 1 | 2 | 3 | 4

const STEP_TITLES: Record<Step, string> = {
  1: 'Position Sizing',
  2: 'Risk Limits',
  3: 'Token Filters',
  4: 'Review & Confirm',
}

const DEFAULT_FORM_DATA: CopyConfigFormData = {
  leaderAddress: '',
  leaderChain: '',
  leaderLabel: '',
  sizingMode: 'percentage',
  sizeValue: '100',
  minTradeUsd: '10',
  maxTradeUsd: '1000',
  maxDailyTrades: 10,
  maxDailyVolumeUsd: '5000',
  maxSlippageBps: 100, // 1%
  delaySeconds: 5,
  maxDelaySeconds: 60,
  filterMode: 'all',
  tokenWhitelist: [],
  tokenBlacklist: [],
  allowedActions: ['swap'],
  executionMode: 'manual',
}

export function CopyConfigForm({
  leader,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: CopyConfigFormProps) {
  const [step, setStep] = useState<Step>(1)
  const [formData, setFormData] = useState<CopyConfigFormData>({
    ...DEFAULT_FORM_DATA,
    leaderAddress: leader.address,
    leaderChain: leader.chain,
    leaderLabel: leader.label || '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const updateField = useCallback(<K extends keyof CopyConfigFormData>(
    field: K,
    value: CopyConfigFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setErrors(prev => ({ ...prev, [field]: '' }))
  }, [])

  const validateStep = (currentStep: Step): boolean => {
    const newErrors: Record<string, string> = {}

    if (currentStep === 1) {
      if (!formData.sizeValue || parseFloat(formData.sizeValue) <= 0) {
        newErrors.sizeValue = 'Size must be greater than 0'
      }
      if (formData.sizingMode === 'percentage' && parseFloat(formData.sizeValue) > 100) {
        newErrors.sizeValue = 'Percentage cannot exceed 100%'
      }
    }

    if (currentStep === 2) {
      if (parseFloat(formData.minTradeUsd) < 0) {
        newErrors.minTradeUsd = 'Min trade must be >= 0'
      }
      if (parseFloat(formData.maxTradeUsd) <= parseFloat(formData.minTradeUsd)) {
        newErrors.maxTradeUsd = 'Max trade must be greater than min'
      }
      if (formData.maxDailyTrades < 1) {
        newErrors.maxDailyTrades = 'Must allow at least 1 trade/day'
      }
      if (formData.maxSlippageBps < 10 || formData.maxSlippageBps > 1000) {
        newErrors.maxSlippageBps = 'Slippage must be 0.1% - 10%'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(prev => Math.min(prev + 1, 4) as Step)
    }
  }

  const handleBack = () => {
    setStep(prev => Math.max(prev - 1, 1) as Step)
  }

  const handleSubmit = async () => {
    if (validateStep(4)) {
      await onSubmit(formData)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Progress bar */}
      <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--line)' }}>
        <div className="flex items-center justify-between mb-2">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className="flex items-center"
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium"
                style={{
                  background: s <= step ? 'var(--accent)' : 'var(--surface-alt)',
                  color: s <= step ? 'var(--surface)' : 'var(--text-muted)',
                }}
              >
                {s < step ? <Check size={16} /> : s}
              </div>
              {s < 4 && (
                <div
                  className="w-12 h-0.5 mx-1"
                  style={{
                    background: s < step ? 'var(--accent)' : 'var(--line)',
                  }}
                />
              )}
            </div>
          ))}
        </div>
        <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>
          Step {step}: {STEP_TITLES[step]}
        </div>
      </div>

      {/* Form content */}
      <div className="flex-1 overflow-y-auto p-4">
        {step === 1 && (
          <SizingStep
            formData={formData}
            errors={errors}
            onChange={updateField}
          />
        )}
        {step === 2 && (
          <RiskLimitsStep
            formData={formData}
            errors={errors}
            onChange={updateField}
          />
        )}
        {step === 3 && (
          <TokenFiltersStep
            formData={formData}
            errors={errors}
            onChange={updateField}
          />
        )}
        {step === 4 && (
          <ReviewStep formData={formData} leader={leader} />
        )}
      </div>

      {/* Navigation */}
      <div
        className="flex items-center justify-between px-4 py-3 border-t"
        style={{ borderColor: 'var(--line)' }}
      >
        <button
          className="px-4 py-2 rounded-lg text-sm font-medium"
          style={{
            background: 'var(--surface-alt)',
            color: 'var(--text)',
          }}
          onClick={step === 1 ? onCancel : handleBack}
          disabled={isSubmitting}
        >
          {step === 1 ? 'Cancel' : (
            <>
              <ArrowLeft size={14} className="inline mr-1" />
              Back
            </>
          )}
        </button>

        <button
          className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1"
          style={{
            background: 'var(--accent)',
            color: 'var(--surface)',
            opacity: isSubmitting ? 0.6 : 1,
          }}
          onClick={step === 4 ? handleSubmit : handleNext}
          disabled={isSubmitting}
        >
          {step === 4 ? (
            isSubmitting ? 'Starting...' : 'Start Copying'
          ) : (
            <>
              Next
              <ArrowRight size={14} />
            </>
          )}
        </button>
      </div>
    </div>
  )
}

// Step 1: Sizing
function SizingStep({
  formData,
  errors,
  onChange,
}: {
  formData: CopyConfigFormData
  errors: Record<string, string>
  onChange: <K extends keyof CopyConfigFormData>(field: K, value: CopyConfigFormData[K]) => void
}) {
  return (
    <div className="space-y-4">
      <InfoBox>
        Choose how to size your trades relative to the leader&apos;s trades.
      </InfoBox>

      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
          Sizing Mode
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(['percentage', 'fixed', 'proportional'] as SizingMode[]).map((mode) => (
            <button
              key={mode}
              className="p-3 rounded-lg text-sm text-left transition-colors"
              style={{
                background: formData.sizingMode === mode ? 'var(--accent)' : 'var(--surface-alt)',
                color: formData.sizingMode === mode ? 'var(--surface)' : 'var(--text)',
                border: `1px solid ${formData.sizingMode === mode ? 'var(--accent)' : 'var(--line)'}`,
              }}
              onClick={() => onChange('sizingMode', mode)}
            >
              <div className="font-medium capitalize">{mode}</div>
              <div className="text-xs opacity-70 mt-1">
                {mode === 'percentage' && '% of leader size'}
                {mode === 'fixed' && 'Fixed $ amount'}
                {mode === 'proportional' && 'Match portfolio %'}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
          {formData.sizingMode === 'percentage' && 'Percentage of Leader Trade'}
          {formData.sizingMode === 'fixed' && 'Fixed Amount per Trade (USD)'}
          {formData.sizingMode === 'proportional' && 'Portfolio Percentage'}
        </label>
        <div className="relative">
          <input
            type="number"
            value={formData.sizeValue}
            onChange={(e) => onChange('sizeValue', e.target.value)}
            className="w-full px-4 py-2 rounded-lg text-sm"
            style={{
              background: 'var(--surface-alt)',
              border: errors.sizeValue ? '1px solid var(--error)' : '1px solid var(--line)',
              color: 'var(--text)',
            }}
            placeholder={formData.sizingMode === 'fixed' ? '100' : '50'}
          />
          <span
            className="absolute right-3 top-1/2 -translate-y-1/2 text-sm"
            style={{ color: 'var(--text-muted)' }}
          >
            {formData.sizingMode === 'fixed' ? 'USD' : '%'}
          </span>
        </div>
        {errors.sizeValue && (
          <p className="text-xs mt-1" style={{ color: 'var(--error)' }}>{errors.sizeValue}</p>
        )}
      </div>

      <ExampleCalculation formData={formData} />
    </div>
  )
}

// Step 2: Risk Limits
function RiskLimitsStep({
  formData,
  errors,
  onChange,
}: {
  formData: CopyConfigFormData
  errors: Record<string, string>
  onChange: <K extends keyof CopyConfigFormData>(field: K, value: CopyConfigFormData[K]) => void
}) {
  return (
    <div className="space-y-4">
      <InfoBox>
        Set limits to protect yourself from large losses or excessive trading.
      </InfoBox>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>
            Min Trade (USD)
          </label>
          <input
            type="number"
            value={formData.minTradeUsd}
            onChange={(e) => onChange('minTradeUsd', e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{
              background: 'var(--surface-alt)',
              border: errors.minTradeUsd ? '1px solid var(--error)' : '1px solid var(--line)',
              color: 'var(--text)',
            }}
          />
          {errors.minTradeUsd && (
            <p className="text-xs mt-1" style={{ color: 'var(--error)' }}>{errors.minTradeUsd}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>
            Max Trade (USD)
          </label>
          <input
            type="number"
            value={formData.maxTradeUsd}
            onChange={(e) => onChange('maxTradeUsd', e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{
              background: 'var(--surface-alt)',
              border: errors.maxTradeUsd ? '1px solid var(--error)' : '1px solid var(--line)',
              color: 'var(--text)',
            }}
          />
          {errors.maxTradeUsd && (
            <p className="text-xs mt-1" style={{ color: 'var(--error)' }}>{errors.maxTradeUsd}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>
            Max Trades / Day
          </label>
          <input
            type="number"
            value={formData.maxDailyTrades}
            onChange={(e) => onChange('maxDailyTrades', parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{
              background: 'var(--surface-alt)',
              border: errors.maxDailyTrades ? '1px solid var(--error)' : '1px solid var(--line)',
              color: 'var(--text)',
            }}
          />
          {errors.maxDailyTrades && (
            <p className="text-xs mt-1" style={{ color: 'var(--error)' }}>{errors.maxDailyTrades}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>
            Max Volume / Day (USD)
          </label>
          <input
            type="number"
            value={formData.maxDailyVolumeUsd}
            onChange={(e) => onChange('maxDailyVolumeUsd', e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{
              background: 'var(--surface-alt)',
              border: '1px solid var(--line)',
              color: 'var(--text)',
            }}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>
          Max Slippage ({(formData.maxSlippageBps / 100).toFixed(1)}%)
        </label>
        <input
          type="range"
          min="10"
          max="500"
          step="10"
          value={formData.maxSlippageBps}
          onChange={(e) => onChange('maxSlippageBps', parseInt(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
          <span>0.1%</span>
          <span>5%</span>
        </div>
        {errors.maxSlippageBps && (
          <p className="text-xs mt-1" style={{ color: 'var(--error)' }}>{errors.maxSlippageBps}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>
          Execution Delay ({formData.delaySeconds}s)
        </label>
        <input
          type="range"
          min="0"
          max="60"
          step="5"
          value={formData.delaySeconds}
          onChange={(e) => onChange('delaySeconds', parseInt(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
          <span>Instant</span>
          <span>60s</span>
        </div>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          Small delay can help avoid front-running by the leader
        </p>
      </div>
    </div>
  )
}

// Step 3: Token Filters
function TokenFiltersStep({
  formData,
  errors: _errors,
  onChange,
}: {
  formData: CopyConfigFormData
  errors: Record<string, string>
  onChange: <K extends keyof CopyConfigFormData>(field: K, value: CopyConfigFormData[K]) => void
}) {
  const [tokenInput, setTokenInput] = useState('')

  const addToken = (list: 'whitelist' | 'blacklist') => {
    if (!tokenInput.trim()) return
    const field = list === 'whitelist' ? 'tokenWhitelist' : 'tokenBlacklist'
    const current = formData[field]
    if (!current.includes(tokenInput.toUpperCase())) {
      onChange(field, [...current, tokenInput.toUpperCase()])
    }
    setTokenInput('')
  }

  const removeToken = (list: 'whitelist' | 'blacklist', token: string) => {
    const field = list === 'whitelist' ? 'tokenWhitelist' : 'tokenBlacklist'
    onChange(field, formData[field].filter(t => t !== token))
  }

  return (
    <div className="space-y-4">
      <InfoBox>
        Control which tokens you want to copy trades for.
      </InfoBox>

      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
          Filter Mode
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(['all', 'whitelist', 'blacklist'] as const).map((mode) => (
            <button
              key={mode}
              className="p-2 rounded-lg text-sm transition-colors"
              style={{
                background: formData.filterMode === mode ? 'var(--accent)' : 'var(--surface-alt)',
                color: formData.filterMode === mode ? 'var(--surface)' : 'var(--text)',
                border: `1px solid ${formData.filterMode === mode ? 'var(--accent)' : 'var(--line)'}`,
              }}
              onClick={() => onChange('filterMode', mode)}
            >
              {mode === 'all' && 'All Tokens'}
              {mode === 'whitelist' && 'Whitelist Only'}
              {mode === 'blacklist' && 'Blacklist'}
            </button>
          ))}
        </div>
      </div>

      {formData.filterMode !== 'all' && (
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>
            {formData.filterMode === 'whitelist' ? 'Allowed Tokens' : 'Blocked Tokens'}
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="Enter token symbol (e.g., ETH)"
              className="flex-1 px-3 py-2 rounded-lg text-sm"
              style={{
                background: 'var(--surface-alt)',
                border: '1px solid var(--line)',
                color: 'var(--text)',
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addToken(formData.filterMode as 'whitelist' | 'blacklist')
                }
              }}
            />
            <button
              className="px-3 py-2 rounded-lg text-sm font-medium"
              style={{
                background: 'var(--accent)',
                color: 'var(--surface)',
              }}
              onClick={() => addToken(formData.filterMode as 'whitelist' | 'blacklist')}
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {(formData.filterMode === 'whitelist' ? formData.tokenWhitelist : formData.tokenBlacklist).map((token) => (
              <span
                key={token}
                className="px-2 py-1 rounded text-sm flex items-center gap-1"
                style={{
                  background: 'var(--surface-alt)',
                  color: 'var(--text)',
                }}
              >
                {token}
                <button
                  className="ml-1 hover:opacity-70"
                  onClick={() => removeToken(formData.filterMode as 'whitelist' | 'blacklist', token)}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
          Allowed Actions
        </label>
        <div className="flex gap-2">
          {['swap', 'bridge'].map((action) => (
            <button
              key={action}
              className="px-3 py-1.5 rounded-lg text-sm transition-colors"
              style={{
                background: formData.allowedActions.includes(action) ? 'var(--accent)' : 'var(--surface-alt)',
                color: formData.allowedActions.includes(action) ? 'var(--surface)' : 'var(--text)',
                border: `1px solid ${formData.allowedActions.includes(action) ? 'var(--accent)' : 'var(--line)'}`,
              }}
              onClick={() => {
                const current = formData.allowedActions
                if (current.includes(action)) {
                  if (current.length > 1) {
                    onChange('allowedActions', current.filter(a => a !== action))
                  }
                } else {
                  onChange('allowedActions', [...current, action])
                }
              }}
            >
              {action.charAt(0).toUpperCase() + action.slice(1)}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// Step 4: Review
function ReviewStep({
  formData,
  leader,
}: {
  formData: CopyConfigFormData
  leader: LeaderProfile
}) {
  return (
    <div className="space-y-4">
      <div
        className="p-4 rounded-lg"
        style={{ background: 'var(--surface-alt)', border: '1px solid var(--line)' }}
      >
        <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
          Leader
        </h3>
        <div className="text-sm" style={{ color: 'var(--text)' }}>
          {leader.label || truncateAddress(leader.address)}
        </div>
        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {leader.chain} · {leader.totalTrades} trades · {leader.winRate?.toFixed(0)}% win rate
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <ReviewItem
          label="Sizing Mode"
          value={`${formData.sizingMode === 'fixed' ? '$' : ''}${formData.sizeValue}${formData.sizingMode !== 'fixed' ? '%' : ''}`}
        />
        <ReviewItem label="Min/Max Trade" value={`$${formData.minTradeUsd} - $${formData.maxTradeUsd}`} />
        <ReviewItem label="Daily Limits" value={`${formData.maxDailyTrades} trades / $${formData.maxDailyVolumeUsd}`} />
        <ReviewItem label="Max Slippage" value={`${(formData.maxSlippageBps / 100).toFixed(1)}%`} />
        <ReviewItem label="Delay" value={`${formData.delaySeconds}s`} />
        <ReviewItem
          label="Token Filter"
          value={
            formData.filterMode === 'all'
              ? 'All tokens'
              : formData.filterMode === 'whitelist'
                ? `${formData.tokenWhitelist.length} whitelisted`
                : `${formData.tokenBlacklist.length} blacklisted`
          }
        />
      </div>

      <div
        className="p-3 rounded-lg flex items-start gap-2"
        style={{ background: 'var(--warning-bg)' }}
      >
        <AlertCircle size={16} style={{ color: 'var(--warning)', marginTop: 2 }} />
        <div className="text-sm" style={{ color: 'var(--warning)' }}>
          <strong>Manual Approval Mode:</strong> You will need to approve each trade before execution.
          Session keys for autonomous execution coming soon.
        </div>
      </div>
    </div>
  )
}

// Helper components
function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="p-3 rounded-lg flex items-start gap-2 text-sm"
      style={{ background: 'var(--surface-alt)', color: 'var(--text-muted)' }}
    >
      <Info size={16} className="shrink-0 mt-0.5" />
      {children}
    </div>
  )
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="p-3 rounded-lg"
      style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
    >
      <div className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>{label}</div>
      <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>{value}</div>
    </div>
  )
}

function ExampleCalculation({ formData }: { formData: CopyConfigFormData }) {
  const exampleLeaderTrade = 1000 // $1000 leader trade
  let yourTrade = 0

  if (formData.sizingMode === 'percentage') {
    yourTrade = exampleLeaderTrade * (parseFloat(formData.sizeValue) / 100)
  } else if (formData.sizingMode === 'fixed') {
    yourTrade = parseFloat(formData.sizeValue)
  } else {
    yourTrade = exampleLeaderTrade // Proportional simplified
  }

  return (
    <div
      className="p-3 rounded-lg text-sm"
      style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
    >
      <div className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Example</div>
      <div style={{ color: 'var(--text)' }}>
        Leader trades <strong>${exampleLeaderTrade}</strong> → You trade <strong>${yourTrade.toFixed(0)}</strong>
      </div>
    </div>
  )
}
