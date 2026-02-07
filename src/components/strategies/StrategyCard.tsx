import React, { useState } from 'react'
import {
  Play,
  Pause,
  Square,
  MoreVertical,
  Clock,
  DollarSign,
  Repeat,
  AlertTriangle,
  Check,
  Zap,
  Shield,
  Key,
} from 'lucide-react'
import type { GenericStrategy } from '../../hooks/useStrategies'
import {
  formatNextExecution,
  formatLastExecution,
} from '../../hooks/useStrategies'

interface StrategyCardProps {
  strategy: GenericStrategy
  onPause: (id: string) => Promise<void>
  onResume: (id: string) => Promise<void>
  onStop: (id: string) => Promise<void>
  onEdit: (id: string) => void
  onViewDetails: (id: string) => void
  onGrantSession?: (id: string) => void
  hasSmartSession?: boolean
  smartSessionId?: string
}

// Status display helpers
const STATUS_LABELS: Record<GenericStrategy['status'], string> = {
  draft: 'Draft',
  pending_session: 'Pending Setup',
  active: 'Active',
  paused: 'Paused',
  completed: 'Completed',
  failed: 'Failed',
  expired: 'Expired',
  archived: 'Archived',
}

const STATUS_COLORS: Record<GenericStrategy['status'], string> = {
  draft: 'var(--text-muted)',
  pending_session: 'var(--warning)',
  active: 'var(--success)',
  paused: 'var(--warning)',
  completed: 'var(--text-muted)',
  failed: 'var(--error)',
  expired: 'var(--error)',
  archived: 'var(--text-muted)',
}

const STRATEGY_TYPE_LABELS: Record<GenericStrategy['strategyType'], string> = {
  dca: 'DCA',
  rebalance: 'Rebalance',
  limit_order: 'Limit',
  stop_loss: 'Stop Loss',
  take_profit: 'Take Profit',
  custom: 'Custom',
}

// Permission helpers
function canPause(status: GenericStrategy['status']): boolean {
  return status === 'active'
}

function canResume(status: GenericStrategy['status']): boolean {
  return status === 'paused' || status === 'pending_session'
}

function canStop(status: GenericStrategy['status']): boolean {
  return status === 'active' || status === 'paused' || status === 'pending_session'
}

function formatUsd(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

function _formatTokenAmount(amount: string, symbol: string): string {
  const num = parseFloat(amount)
  if (num === 0) return `0 ${symbol}`
  if (num < 0.001) return `<0.001 ${symbol}`
  if (num < 1) return `${num.toFixed(4)} ${symbol}`
  if (num < 1000) return `${num.toFixed(2)} ${symbol}`
  return `${num.toLocaleString('en-US', { maximumFractionDigits: 2 })} ${symbol}`
}

export function StrategyCard({
  strategy,
  onPause,
  onResume,
  onStop,
  onEdit: _onEdit,
  onViewDetails,
  onGrantSession,
  hasSmartSession = false,
  smartSessionId,
}: StrategyCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Extract config values
  const config = strategy.config as Record<string, unknown>
  const amountUsd = config.amount_usd as number | undefined
  const frequency = config.frequency as string | undefined
  const fromToken = config.from_token as string | undefined
  const toToken = config.to_token as string | undefined

  const totalExecutions = strategy.totalExecutions ?? 0
  const successfulExecutions = strategy.successfulExecutions ?? 0
  const successRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0
  const requiresManualApproval = (strategy as unknown as { requiresManualApproval?: boolean }).requiresManualApproval

  // Check if strategy has smart session linked
  const strategySmartSessionId = (strategy as unknown as { smartSessionId?: string }).smartSessionId || smartSessionId
  const hasLinkedSession = !!strategySmartSessionId || hasSmartSession
  const needsSession = strategy.status === 'pending_session' && !hasLinkedSession

  const handleAction = async (action: () => Promise<void>) => {
    setIsLoading(true)
    setShowMenu(false)
    try {
      await action()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      className="rounded-lg p-4 transition-colors hover:bg-opacity-80 cursor-pointer relative"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--line)',
      }}
      onClick={() => onViewDetails(strategy._id)}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium truncate" style={{ color: 'var(--text)' }}>
              {strategy.name}
            </h3>
            <span
              className="px-2 py-0.5 text-xs font-medium rounded-full shrink-0"
              style={{
                background: `${STATUS_COLORS[strategy.status]}20`,
                color: STATUS_COLORS[strategy.status],
              }}
            >
              {STATUS_LABELS[strategy.status]}
              {strategy.status === 'active' && requiresManualApproval && ' (Manual)'}
            </span>
          </div>
          <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
            {STRATEGY_TYPE_LABELS[strategy.strategyType]}
            {fromToken && toToken && ` · ${fromToken} → ${toToken}`}
          </p>
          {/* Smart Session Indicator */}
          {hasLinkedSession && (
            <div className="flex items-center gap-1 mt-1">
              <Shield className="h-3 w-3" style={{ color: 'var(--success)' }} />
              <span className="text-xs" style={{ color: 'var(--success)' }}>
                Smart Session Active
                {strategy.lastExecutedAt && ` · Last auto-execution ${formatLastExecution(strategy.lastExecutedAt)}`}
              </span>
            </div>
          )}
        </div>

        {/* Menu Button */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowMenu(!showMenu)
            }}
            className="p-1.5 rounded-md hover:bg-black/5 transition-colors"
            disabled={isLoading}
          >
            <MoreVertical className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowMenu(false)
                }}
              />
              <div
                className="absolute right-0 top-full mt-1 z-20 rounded-lg py-1 min-w-[140px] shadow-lg"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--line)',
                }}
              >
                {canPause(strategy.status) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleAction(() => onPause(strategy._id))
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-black/5"
                    style={{ color: 'var(--text)' }}
                  >
                    <Pause className="h-4 w-4" />
                    Pause
                  </button>
                )}
                {canResume(strategy.status) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleAction(() => onResume(strategy._id))
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-black/5"
                    style={{ color: 'var(--text)' }}
                  >
                    <Play className="h-4 w-4" />
                    Activate
                  </button>
                )}
                {canStop(strategy.status) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleAction(() => onStop(strategy._id))
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-black/5"
                    style={{ color: 'var(--error)' }}
                  >
                    <Square className="h-4 w-4" />
                    Delete
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        {/* Strategy Type */}
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 shrink-0" style={{ color: 'var(--accent)' }} />
          <div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Type
            </p>
            <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
              {STRATEGY_TYPE_LABELS[strategy.strategyType]}
            </p>
          </div>
        </div>

        {/* Amount (if available) */}
        {amountUsd && (
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 shrink-0" style={{ color: 'var(--accent)' }} />
            <div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Amount
              </p>
              <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                {formatUsd(amountUsd)}
              </p>
            </div>
          </div>
        )}

        {/* Frequency (if available) */}
        {frequency && (
          <div className="flex items-center gap-2">
            <Repeat className="h-4 w-4 shrink-0" style={{ color: 'var(--accent)' }} />
            <div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Frequency
              </p>
              <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                {frequency}
              </p>
            </div>
          </div>
        )}

        {/* Executions */}
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 shrink-0" style={{ color: 'var(--success)' }} />
          <div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Executions
            </p>
            <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
              {successfulExecutions}/{totalExecutions}
            </p>
          </div>
        </div>
      </div>

      {/* Grant Session Button (for pending_session status) */}
      {needsSession && onGrantSession && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onGrantSession(strategy._id)
          }}
          className="w-full mt-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
          style={{
            background: 'var(--accent)',
            color: 'white',
          }}
        >
          <Key className="h-4 w-4" />
          Grant Smart Session
        </button>
      )}

      {/* Execution Stats */}
      <div
        className="flex items-center justify-between pt-3 text-xs"
        style={{ borderTop: '1px solid var(--line)' }}
      >
        <div className="flex items-center gap-4">
          {/* Success Rate */}
          <div className="flex items-center gap-1">
            {totalExecutions === 0 ? (
              <Clock className="h-3 w-3" style={{ color: 'var(--text-muted)' }} />
            ) : successRate >= 90 ? (
              <Check className="h-3 w-3" style={{ color: 'var(--success)' }} />
            ) : (
              <AlertTriangle className="h-3 w-3" style={{ color: 'var(--warning)' }} />
            )}
            <span style={{ color: 'var(--text-muted)' }}>
              {totalExecutions === 0 ? 'No executions yet' : `${successRate.toFixed(0)}% success`}
            </span>
          </div>
        </div>

        {/* Next/Last Execution */}
        <div className="flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
          <Clock className="h-3 w-3" />
          <span>
            {strategy.status === 'active'
              ? formatNextExecution(strategy.nextExecutionAt)
              : formatLastExecution(strategy.lastExecutedAt)}
          </span>
        </div>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/10">
          <div className="h-5 w-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)' }} />
        </div>
      )}
    </div>
  )
}
