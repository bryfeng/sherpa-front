import React, { useState } from 'react'
import {
  Play,
  Pause,
  Square,
  Settings,
  MoreVertical,
  TrendingUp,
  Clock,
  DollarSign,
  Repeat,
  AlertTriangle,
  Check,
  X,
} from 'lucide-react'
import type { DCAStrategy } from '../../types/strategy'
import {
  STATUS_LABELS,
  STATUS_COLORS,
  FREQUENCY_LABELS,
} from '../../types/strategy'
import {
  canPause,
  canResume,
  canStop,
  canEdit,
  formatNextExecution,
  formatLastExecution,
} from '../../hooks/useStrategies'

interface StrategyCardProps {
  strategy: DCAStrategy
  onPause: (id: string) => Promise<void>
  onResume: (id: string) => Promise<void>
  onStop: (id: string) => Promise<void>
  onEdit: (id: string) => void
  onViewDetails: (id: string) => void
}

function formatUsd(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

function formatTokenAmount(amount: string, symbol: string): string {
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
  onEdit,
  onViewDetails,
}: StrategyCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const successRate =
    strategy.totalExecutions > 0
      ? (strategy.successfulExecutions / strategy.totalExecutions) * 100
      : 0

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
      className="rounded-lg p-4 transition-colors hover:bg-opacity-80 cursor-pointer"
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
            </span>
          </div>
          <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
            {strategy.fromToken.symbol} → {strategy.toToken.symbol}
          </p>
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
                    Resume
                  </button>
                )}
                {canEdit(strategy.status) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowMenu(false)
                      onEdit(strategy._id)
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-black/5"
                    style={{ color: 'var(--text)' }}
                  >
                    <Settings className="h-4 w-4" />
                    Edit
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
                    Stop
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        {/* Amount per execution */}
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 shrink-0" style={{ color: 'var(--accent)' }} />
          <div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Per Buy
            </p>
            <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
              {formatUsd(strategy.amountPerExecutionUsd)}
            </p>
          </div>
        </div>

        {/* Frequency */}
        <div className="flex items-center gap-2">
          <Repeat className="h-4 w-4 shrink-0" style={{ color: 'var(--accent)' }} />
          <div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Frequency
            </p>
            <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
              {FREQUENCY_LABELS[strategy.frequency]}
            </p>
          </div>
        </div>

        {/* Total Spent */}
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 shrink-0" style={{ color: 'var(--success)' }} />
          <div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Total Spent
            </p>
            <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
              {formatUsd(strategy.totalAmountSpentUsd)}
            </p>
          </div>
        </div>

        {/* Tokens Acquired */}
        <div className="flex items-center gap-2">
          <div
            className="h-4 w-4 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold"
            style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}
          >
            {strategy.toToken.symbol.charAt(0)}
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Acquired
            </p>
            <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
              {formatTokenAmount(strategy.totalTokensAcquired, strategy.toToken.symbol)}
            </p>
          </div>
        </div>
      </div>

      {/* Execution Stats */}
      <div
        className="flex items-center justify-between pt-3 text-xs"
        style={{ borderTop: '1px solid var(--line)' }}
      >
        <div className="flex items-center gap-4">
          {/* Success Rate */}
          <div className="flex items-center gap-1">
            {successRate >= 90 ? (
              <Check className="h-3 w-3" style={{ color: 'var(--success)' }} />
            ) : successRate >= 70 ? (
              <AlertTriangle className="h-3 w-3" style={{ color: 'var(--warning)' }} />
            ) : (
              <X className="h-3 w-3" style={{ color: 'var(--error)' }} />
            )}
            <span style={{ color: 'var(--text-muted)' }}>
              {strategy.successfulExecutions}/{strategy.totalExecutions} executions
            </span>
          </div>
        </div>

        {/* Next Execution */}
        <div className="flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
          <Clock className="h-3 w-3" />
          <span>
            {strategy.status === 'active'
              ? formatNextExecution(strategy.nextExecutionAt)
              : formatLastExecution(strategy.lastExecutionAt)}
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
