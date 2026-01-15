import React, { useState } from 'react'
import { Shield, Settings, Check, AlertTriangle } from 'lucide-react'
import type { Widget } from '../../types/widgets'
import { useRiskPolicy } from '../../hooks/useRiskPolicy'
import { RiskPolicyForm } from './RiskPolicyForm'
import { formatUsd } from '../../types/policy'

interface RiskPolicyWidgetProps {
  widget?: Widget
  walletAddress?: string
}

interface StatRowProps {
  label: string
  value: string
  status?: 'ok' | 'warning'
}

function StatRow({ label, value, status }: StatRowProps) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
        {label}
      </span>
      <span
        className="text-xs font-medium flex items-center gap-1"
        style={{ color: status === 'warning' ? 'var(--warning)' : 'var(--text)' }}
      >
        {value}
        {status === 'ok' && <Check className="h-3 w-3" style={{ color: 'var(--success)' }} />}
        {status === 'warning' && <AlertTriangle className="h-3 w-3" />}
      </span>
    </div>
  )
}

export function RiskPolicyWidget({ widget, walletAddress }: RiskPolicyWidgetProps) {
  const [showForm, setShowForm] = useState(false)
  const { config, isDefault, isLoading, save, reset, applyPreset } = useRiskPolicy({
    walletAddress,
  })

  if (!walletAddress) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-3 rounded-xl border p-6 text-center"
        style={{ borderColor: 'var(--line)', background: 'var(--surface-2)' }}
      >
        <Shield className="h-8 w-8" style={{ color: 'var(--text-muted)' }} />
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
            Connect Wallet
          </p>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            Connect your wallet to configure risk policies
          </p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3 p-4">
        <div className="h-10 rounded-lg" style={{ background: 'var(--surface-3)' }} />
        <div className="h-24 rounded-lg" style={{ background: 'var(--surface-3)' }} />
        <div className="h-8 rounded-lg" style={{ background: 'var(--surface-3)' }} />
      </div>
    )
  }

  if (showForm) {
    return (
      <div className="p-4">
        <RiskPolicyForm
          config={config}
          isDefault={isDefault}
          onSave={async (newConfig) => {
            await save(newConfig)
            setShowForm(false)
          }}
          onReset={reset}
          onApplyPreset={applyPreset}
        />
        <button
          type="button"
          onClick={() => setShowForm(false)}
          className="mt-4 w-full rounded-lg border py-2 text-xs font-medium transition hover:bg-[var(--surface-2)]"
          style={{ borderColor: 'var(--line)', color: 'var(--text-muted)' }}
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: config.enabled ? 'var(--accent)/10' : 'var(--surface-3)' }}
          >
            <Shield
              className="h-5 w-5"
              style={{ color: config.enabled ? 'var(--accent)' : 'var(--text-muted)' }}
            />
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
              Risk Policy
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {config.enabled ? 'Active' : 'Disabled'}
              {isDefault && ' (defaults)'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition hover:bg-[var(--surface-2)]"
          style={{ borderColor: 'var(--line)', color: 'var(--text)' }}
        >
          <Settings className="h-3.5 w-3.5" />
          Edit
        </button>
      </div>

      {/* Summary Stats */}
      <div
        className="rounded-xl border divide-y"
        style={{ borderColor: 'var(--line)', background: 'var(--surface-2)' }}
      >
        <div className="px-3" style={{ borderColor: 'var(--line)' }}>
          <StatRow
            label="Max single transaction"
            value={formatUsd(config.maxSingleTxUsd)}
            status="ok"
          />
        </div>
        <div className="px-3" style={{ borderColor: 'var(--line)' }}>
          <StatRow
            label="Daily volume limit"
            value={formatUsd(config.maxDailyVolumeUsd)}
            status="ok"
          />
        </div>
        <div className="px-3" style={{ borderColor: 'var(--line)' }}>
          <StatRow
            label="Max position size"
            value={`${config.maxPositionPercent}%`}
            status="ok"
          />
        </div>
        <div className="px-3" style={{ borderColor: 'var(--line)' }}>
          <StatRow
            label="Approval required above"
            value={formatUsd(config.requireApprovalAboveUsd)}
          />
        </div>
        <div className="px-3" style={{ borderColor: 'var(--line)' }}>
          <StatRow
            label="Max slippage"
            value={`${config.maxSlippagePercent}%`}
            status={config.maxSlippagePercent > 3 ? 'warning' : 'ok'}
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-2">
        {(['conservative', 'moderate', 'aggressive'] as const).map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => applyPreset(preset)}
            className="rounded-lg border px-2 py-1.5 text-[11px] font-medium capitalize transition hover:bg-[var(--surface-2)]"
            style={{ borderColor: 'var(--line)', color: 'var(--text-muted)' }}
          >
            {preset}
          </button>
        ))}
      </div>

      {/* Status */}
      {!config.enabled && (
        <div
          className="flex items-center gap-2 rounded-lg border px-3 py-2"
          style={{ borderColor: 'var(--warning)', background: 'var(--warning)/5' }}
        >
          <AlertTriangle className="h-4 w-4" style={{ color: 'var(--warning)' }} />
          <p className="text-xs" style={{ color: 'var(--warning)' }}>
            Risk policies are disabled. Your trades will not be protected.
          </p>
        </div>
      )}
    </div>
  )
}
