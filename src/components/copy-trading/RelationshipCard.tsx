import React, { useState } from 'react'
import {
  Pause,
  Play,
  Settings,
  Trash2,
  MoreVertical,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react'
import type { CopyRelationship } from '../../types/copy-trading'
import {
  getRelationshipStatus,
  formatRelativeTime,
  formatUsdValue,
  formatSizingMode,
  truncateAddress,
} from '../../hooks/useCopyTrading'

interface RelationshipCardProps {
  relationship: CopyRelationship
  onPause: (id: string, reason?: string) => Promise<void>
  onResume: (id: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onEdit: (id: string) => void
  onViewHistory: (id: string) => void
}

const STATUS_COLORS: Record<string, string> = {
  active: 'var(--success)',
  paused: 'var(--warning)',
  inactive: 'var(--text-muted)',
  error: 'var(--error)',
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  paused: 'Paused',
  inactive: 'Inactive',
  error: 'Error',
}

export function RelationshipCard({
  relationship,
  onPause,
  onResume,
  onDelete,
  onEdit,
  onViewHistory,
}: RelationshipCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const status = getRelationshipStatus(relationship)
  const isProfitable = parseFloat(relationship.totalPnlUsd ?? '0') >= 0
  const successRate =
    relationship.totalTrades > 0
      ? ((relationship.successfulTrades / (relationship.successfulTrades + relationship.failedTrades)) * 100).toFixed(0)
      : '0'

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
      className="rounded-lg p-4 transition-colors relative"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        opacity: status === 'inactive' ? 0.6 : 1,
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: STATUS_COLORS[status] }}
            />
            <h3 className="font-medium truncate" style={{ color: 'var(--text)' }}>
              {relationship.config.leaderLabel || truncateAddress(relationship.config.leaderAddress)}
            </h3>
            <span
              className="px-2 py-0.5 text-xs font-medium rounded-full shrink-0"
              style={{
                background: `${STATUS_COLORS[status]}20`,
                color: STATUS_COLORS[status],
              }}
            >
              {STATUS_LABELS[status]}
            </span>
          </div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {relationship.config.leaderChain} · {formatSizingMode(relationship.config.sizingMode, relationship.config.sizeValue)}
          </div>
        </div>

        {/* Actions menu */}
        <div className="relative">
          <button
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onClick={() => setShowMenu(!showMenu)}
            disabled={isLoading}
          >
            <MoreVertical size={16} />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div
                className="absolute right-0 top-full mt-1 py-1 rounded-lg shadow-lg z-20 min-w-[140px]"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--line)',
                }}
              >
                {status === 'active' && (
                  <button
                    className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-opacity-80"
                    style={{ color: 'var(--text)' }}
                    onClick={() => handleAction(() => onPause(relationship.id))}
                  >
                    <Pause size={14} />
                    Pause
                  </button>
                )}
                {status === 'paused' && (
                  <button
                    className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-opacity-80"
                    style={{ color: 'var(--text)' }}
                    onClick={() => handleAction(() => onResume(relationship.id))}
                  >
                    <Play size={14} />
                    Resume
                  </button>
                )}
                <button
                  className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-opacity-80"
                  style={{ color: 'var(--text)' }}
                  onClick={() => {
                    setShowMenu(false)
                    onEdit(relationship.id)
                  }}
                >
                  <Settings size={14} />
                  Settings
                </button>
                <button
                  className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-opacity-80"
                  style={{ color: 'var(--text)' }}
                  onClick={() => {
                    setShowMenu(false)
                    onViewHistory(relationship.id)
                  }}
                >
                  <Clock size={14} />
                  History
                </button>
                <div style={{ borderTop: '1px solid var(--line)', margin: '4px 0' }} />
                <button
                  className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-opacity-80"
                  style={{ color: 'var(--error)' }}
                  onClick={() => handleAction(() => onDelete(relationship.id))}
                >
                  <Trash2 size={14} />
                  Stop Copying
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Pause reason warning */}
      {relationship.isPaused && relationship.pauseReason && (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg mb-3 text-sm"
          style={{
            background: 'var(--warning-bg)',
            color: 'var(--warning)',
          }}
        >
          <AlertTriangle size={14} />
          {relationship.pauseReason}
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3 mb-3">
        <div>
          <div className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>
            Today
          </div>
          <div className="font-medium text-sm" style={{ color: 'var(--text)' }}>
            {relationship.dailyTradeCount} / {formatUsdValue(relationship.dailyVolumeUsd)}
          </div>
        </div>
        <div>
          <div className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>
            Total
          </div>
          <div className="font-medium text-sm" style={{ color: 'var(--text)' }}>
            {formatUsdValue(relationship.totalVolumeUsd)}
          </div>
        </div>
        <div>
          <div className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>
            Success
          </div>
          <div className="font-medium text-sm" style={{ color: 'var(--text)' }}>
            {successRate}%
          </div>
        </div>
        <div>
          <div className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>
            P&L
          </div>
          <div
            className="font-medium text-sm flex items-center gap-1"
            style={{ color: isProfitable ? 'var(--success)' : 'var(--error)' }}
          >
            {isProfitable ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {formatUsdValue(relationship.totalPnlUsd)}
          </div>
        </div>
      </div>

      {/* Last copy info */}
      <div
        className="flex items-center justify-between text-xs pt-3"
        style={{ borderTop: '1px solid var(--line)', color: 'var(--text-muted)' }}
      >
        <span>
          Last: {relationship.lastCopyAt ? formatRelativeTime(relationship.lastCopyAt) : 'Never'}
        </span>
        <button
          className="flex items-center gap-1 hover:underline"
          onClick={() => onViewHistory(relationship.id)}
        >
          View History
          <ExternalLink size={10} />
        </button>
      </div>

      {/* Loading overlay */}
      {isLoading && (
        <div
          className="absolute inset-0 flex items-center justify-center rounded-lg"
          style={{ background: 'var(--surface)', opacity: 0.8 }}
        >
          <div className="animate-spin w-5 h-5 border-2 rounded-full" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
        </div>
      )}
    </div>
  )
}
