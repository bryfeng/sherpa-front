import React from 'react'
import { Activity, CheckCircle, AlertTriangle, XCircle, Loader2 } from 'lucide-react'
import { usePolicyStatus } from '../../hooks/usePolicyStatus'
import { SUPPORTED_CHAINS } from '../../types/policy'

interface PolicyStatusWidgetProps {
  compact?: boolean
}

function StatusBadge({ level, label }: { level: 'ok' | 'warning' | 'error'; label: string }) {
  const colors = {
    ok: { bg: 'var(--success)/10', text: 'var(--success)', icon: CheckCircle },
    warning: { bg: 'var(--warning)/10', text: 'var(--warning)', icon: AlertTriangle },
    error: { bg: 'var(--error)/10', text: 'var(--error)', icon: XCircle },
  }

  const config = colors[level]
  const Icon = config.icon

  return (
    <div
      className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
      style={{ background: config.bg }}
    >
      <Icon className="h-3.5 w-3.5" style={{ color: config.text }} />
      <span className="text-xs font-medium" style={{ color: config.text }}>
        {label}
      </span>
    </div>
  )
}

export function PolicyStatusWidget({ compact = false }: PolicyStatusWidgetProps) {
  const { status, isLoading, isOperational, canTrade, statusMessage, statusLevel } = usePolicyStatus()

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center gap-2 rounded-xl border p-4"
        style={{ borderColor: 'var(--line)', background: 'var(--surface-2)' }}
      >
        <Loader2 className="h-4 w-4 animate-spin" style={{ color: 'var(--text-muted)' }} />
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Checking status...
        </span>
      </div>
    )
  }

  if (compact) {
    return (
      <div
        className="flex items-center justify-between rounded-xl border px-4 py-3"
        style={{ borderColor: 'var(--line)', background: 'var(--surface-2)' }}
      >
        <div className="flex items-center gap-2">
          <Activity
            className="h-4 w-4"
            style={{ color: isOperational ? 'var(--success)' : 'var(--error)' }}
          />
          <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
            System Status
          </span>
        </div>
        <StatusBadge
          level={statusLevel}
          label={isOperational ? 'Operational' : status.emergencyStop ? 'Emergency Stop' : 'Maintenance'}
        />
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
            style={{
              background: isOperational ? 'var(--success)/10' : 'var(--error)/10',
            }}
          >
            <Activity
              className="h-5 w-5"
              style={{ color: isOperational ? 'var(--success)' : 'var(--error)' }}
            />
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
              Policy Status
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              System-wide controls
            </p>
          </div>
        </div>
        <StatusBadge
          level={statusLevel}
          label={isOperational ? 'Operational' : status.emergencyStop ? 'Stopped' : 'Maintenance'}
        />
      </div>

      {/* Status Message */}
      {statusMessage && (
        <div
          className="flex items-start gap-2 rounded-lg border px-3 py-2"
          style={{
            borderColor: status.emergencyStop ? 'var(--error)' : 'var(--warning)',
            background: status.emergencyStop ? 'var(--error)/5' : 'var(--warning)/5',
          }}
        >
          {status.emergencyStop ? (
            <XCircle className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--error)' }} />
          ) : (
            <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--warning)' }} />
          )}
          <p
            className="text-xs"
            style={{ color: status.emergencyStop ? 'var(--error)' : 'var(--warning)' }}
          >
            {statusMessage}
          </p>
        </div>
      )}

      {/* Status Grid */}
      <div
        className="rounded-xl border divide-y"
        style={{ borderColor: 'var(--line)', background: 'var(--surface-2)' }}
      >
        <div className="flex items-center justify-between px-3 py-2.5">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Trading
          </span>
          <span
            className="text-xs font-medium flex items-center gap-1"
            style={{ color: canTrade ? 'var(--success)' : 'var(--error)' }}
          >
            {canTrade ? (
              <>
                <CheckCircle className="h-3 w-3" />
                Enabled
              </>
            ) : (
              <>
                <XCircle className="h-3 w-3" />
                Disabled
              </>
            )}
          </span>
        </div>
        <div className="flex items-center justify-between px-3 py-2.5">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Emergency Stop
          </span>
          <span
            className="text-xs font-medium"
            style={{ color: status.emergencyStop ? 'var(--error)' : 'var(--success)' }}
          >
            {status.emergencyStop ? 'Active' : 'Off'}
          </span>
        </div>
        <div className="flex items-center justify-between px-3 py-2.5">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Maintenance Mode
          </span>
          <span
            className="text-xs font-medium"
            style={{ color: status.inMaintenance ? 'var(--warning)' : 'var(--success)' }}
          >
            {status.inMaintenance ? 'Active' : 'Off'}
          </span>
        </div>
      </div>

      {/* Allowed Chains */}
      {isOperational && (
        <div>
          <p className="text-xs font-medium mb-2" style={{ color: 'var(--text)' }}>
            Supported Chains
          </p>
          <div className="flex flex-wrap gap-1.5">
            {SUPPORTED_CHAINS.map((chain) => (
              <span
                key={chain.chainId}
                className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                style={{
                  background: 'var(--surface-3)',
                  color: 'var(--text)',
                }}
              >
                {chain.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <p className="text-center text-[10px]" style={{ color: 'var(--text-muted)' }}>
        System policies are managed by Sherpa administrators
      </p>
    </div>
  )
}
