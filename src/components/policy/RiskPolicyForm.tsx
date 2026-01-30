import React, { useState, useCallback, useEffect } from 'react'
import { Shield, RotateCcw, Save, ChevronDown, ChevronRight } from 'lucide-react'
import type { RiskPolicyConfig, RiskPresetKey } from '../../types/policy'
import { RISK_PRESETS } from '../../types/policy'

interface RiskPolicyFormProps {
  config: RiskPolicyConfig
  hasPolicy: boolean
  isSaving?: boolean
  onSave: (config: RiskPolicyConfig) => Promise<void>
  onReset: () => Promise<void>
  onApplyPreset: (preset: RiskPresetKey) => Promise<void>
}

interface FormSectionProps {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}

function FormSection({ title, children, defaultOpen = true }: FormSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="border rounded-xl" style={{ borderColor: 'var(--line)' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
          {title}
        </span>
        {isOpen ? (
          <ChevronDown className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
        ) : (
          <ChevronRight className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
        )}
      </button>
      {isOpen && (
        <div className="border-t px-4 pb-4 pt-3 space-y-4" style={{ borderColor: 'var(--line)' }}>
          {children}
        </div>
      )}
    </div>
  )
}

interface SliderFieldProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  hint?: string
  onChange: (value: number) => void
}

function SliderField({ label, value, min, max, step = 1, unit = '', hint, onChange }: SliderFieldProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
          {label}
        </label>
        <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${((value - min) / (max - min)) * 100}%, var(--surface-3) ${((value - min) / (max - min)) * 100}%, var(--surface-3) 100%)`,
        }}
      />
      {hint && (
        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
          {hint}
        </p>
      )}
    </div>
  )
}

interface CurrencyFieldProps {
  label: string
  value: number
  hint?: string
  onChange: (value: number) => void
}

function CurrencyField({ label, value, hint, onChange }: CurrencyFieldProps) {
  const [inputValue, setInputValue] = useState(value.toString())

  useEffect(() => {
    setInputValue(value.toString())
  }, [value])

  const handleBlur = () => {
    const parsed = parseFloat(inputValue.replace(/[^0-9.]/g, ''))
    if (!isNaN(parsed) && parsed >= 0) {
      onChange(parsed)
    } else {
      setInputValue(value.toString())
    }
  }

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
        {label}
      </label>
      <div className="relative">
        <span
          className="absolute left-3 top-1/2 -translate-y-1/2 text-sm"
          style={{ color: 'var(--text-muted)' }}
        >
          $
        </span>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={handleBlur}
          className="w-full rounded-lg border py-2 pl-7 pr-3 text-sm"
          style={{
            borderColor: 'var(--line)',
            background: 'var(--surface-2)',
            color: 'var(--text)',
          }}
        />
      </div>
      {hint && (
        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
          {hint}
        </p>
      )}
    </div>
  )
}

export function RiskPolicyForm({
  config,
  hasPolicy,
  isSaving = false,
  onSave,
  onReset,
  onApplyPreset,
}: RiskPolicyFormProps) {
  const [localConfig, setLocalConfig] = useState<RiskPolicyConfig>(config)
  const [activePreset, setActivePreset] = useState<RiskPresetKey | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Reset local config when prop changes
  useEffect(() => {
    setLocalConfig(config)
  }, [config])

  // Check if config matches a preset
  useEffect(() => {
    for (const [key, preset] of Object.entries(RISK_PRESETS)) {
      const matches = Object.entries(preset.config).every(
        ([k, v]) => localConfig[k as keyof RiskPolicyConfig] === v
      )
      if (matches) {
        setActivePreset(key as RiskPresetKey)
        return
      }
    }
    setActivePreset(null)
  }, [localConfig])

  const updateConfig = useCallback(<K extends keyof RiskPolicyConfig>(key: K, value: RiskPolicyConfig[K]) => {
    setLocalConfig((prev) => ({ ...prev, [key]: value }))
    setError(null)
  }, [])

  const handleSave = async () => {
    // Validate
    if (localConfig.warnSlippagePercent >= localConfig.maxSlippagePercent) {
      setError('Warn slippage must be less than max slippage')
      return
    }
    if (localConfig.warnGasPercent >= localConfig.maxGasPercent) {
      setError('Warn gas must be less than max gas')
      return
    }
    if (localConfig.requireApprovalAboveUsd > localConfig.maxSingleTxUsd) {
      setError('Approval threshold cannot exceed max transaction limit')
      return
    }

    try {
      await onSave(localConfig)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    }
  }

  const handlePreset = async (key: RiskPresetKey) => {
    try {
      await onApplyPreset(key)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply preset')
    }
  }

  const hasChanges =
    JSON.stringify(localConfig) !== JSON.stringify(config)

  return (
    <div className="space-y-4">
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
            Trading Risk Preferences
          </h3>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Configure limits to protect your portfolio
          </p>
        </div>
      </div>

      {/* Preset Selector */}
      <div className="flex gap-2">
        {Object.entries(RISK_PRESETS).map(([key, preset]) => (
          <button
            key={key}
            type="button"
            onClick={() => handlePreset(key as RiskPresetKey)}
            className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition ${
              activePreset === key
                ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                : 'border-[var(--line)] hover:border-[var(--accent)]/50'
            }`}
            style={{ color: activePreset === key ? 'var(--accent)' : 'var(--text)' }}
          >
            {preset.name}
          </button>
        ))}
      </div>

      {/* Error Display */}
      {error && (
        <div
          className="rounded-lg border px-3 py-2 text-xs"
          style={{
            borderColor: 'var(--error)',
            background: 'var(--error)/10',
            color: 'var(--error)',
          }}
        >
          {error}
        </div>
      )}

      {/* Form Sections */}
      <FormSection title="Position Limits">
        <SliderField
          label="Max % of portfolio in single asset"
          value={localConfig.maxPositionPercent}
          min={1}
          max={100}
          step={1}
          unit="%"
          onChange={(v) => updateConfig('maxPositionPercent', v)}
        />
        <CurrencyField
          label="Max position value"
          value={localConfig.maxPositionValueUsd}
          onChange={(v) => updateConfig('maxPositionValueUsd', v)}
        />
      </FormSection>

      <FormSection title="Daily Limits">
        <CurrencyField
          label="Max daily trading volume"
          value={localConfig.maxDailyVolumeUsd}
          onChange={(v) => updateConfig('maxDailyVolumeUsd', v)}
        />
        <CurrencyField
          label="Max daily loss (stop trading if reached)"
          value={localConfig.maxDailyLossUsd}
          hint="Trading will pause for the day if losses exceed this"
          onChange={(v) => updateConfig('maxDailyLossUsd', v)}
        />
      </FormSection>

      <FormSection title="Transaction Limits">
        <CurrencyField
          label="Max single transaction"
          value={localConfig.maxSingleTxUsd}
          onChange={(v) => updateConfig('maxSingleTxUsd', v)}
        />
        <CurrencyField
          label="Require approval above"
          value={localConfig.requireApprovalAboveUsd}
          hint="Transactions above this require manual confirmation"
          onChange={(v) => updateConfig('requireApprovalAboveUsd', v)}
        />
      </FormSection>

      <FormSection title="Advanced Settings" defaultOpen={false}>
        <SliderField
          label="Max slippage tolerance"
          value={localConfig.maxSlippagePercent}
          min={0.1}
          max={10}
          step={0.1}
          unit="%"
          onChange={(v) => updateConfig('maxSlippagePercent', v)}
        />
        <SliderField
          label="Warn slippage above"
          value={localConfig.warnSlippagePercent}
          min={0.1}
          max={localConfig.maxSlippagePercent - 0.1}
          step={0.1}
          unit="%"
          onChange={(v) => updateConfig('warnSlippagePercent', v)}
        />
        <SliderField
          label="Max gas as % of transaction"
          value={localConfig.maxGasPercent}
          min={0.1}
          max={20}
          step={0.1}
          unit="%"
          onChange={(v) => updateConfig('maxGasPercent', v)}
        />
        <SliderField
          label="Warn gas above"
          value={localConfig.warnGasPercent}
          min={0.1}
          max={localConfig.maxGasPercent - 0.1}
          step={0.1}
          unit="%"
          onChange={(v) => updateConfig('warnGasPercent', v)}
        />
        <CurrencyField
          label="Minimum pool liquidity"
          value={localConfig.minLiquidityUsd}
          hint="Skip trades in pools with less liquidity"
          onChange={(v) => updateConfig('minLiquidityUsd', v)}
        />
      </FormSection>

      {/* Master Toggle */}
      <div
        className="flex items-center justify-between rounded-xl border px-4 py-3"
        style={{ borderColor: 'var(--line)', background: 'var(--surface-2)' }}
      >
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
            Enable Risk Policies
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Apply these limits to all trading activity
          </p>
        </div>
        <button
          type="button"
          onClick={() => updateConfig('enabled', !localConfig.enabled)}
          className={`relative h-6 w-11 rounded-full transition ${
            localConfig.enabled ? 'bg-[var(--accent)]' : 'bg-[var(--surface-3)]'
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
              localConfig.enabled ? 'left-5' : 'left-0.5'
            }`}
          />
        </button>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onReset}
          disabled={!hasPolicy}
          className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition hover:bg-[var(--surface-2)]"
          style={{
            borderColor: 'var(--line)',
            color: 'var(--text-muted)',
            opacity: hasPolicy ? 1 : 0.5,
            cursor: hasPolicy ? 'pointer' : 'not-allowed',
          }}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Remove Policy
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className={`ml-auto flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium transition ${
            hasChanges && !isSaving
              ? 'bg-[var(--accent)] text-white hover:opacity-90'
              : 'bg-[var(--surface-3)] text-[var(--text-muted)] cursor-not-allowed'
          }`}
        >
          <Save className="h-3.5 w-3.5" />
          {isSaving ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>

      {/* Status */}
      {!hasPolicy && (
        <p className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>
          No policy set yet. Save to create your policy.
        </p>
      )}
    </div>
  )
}
