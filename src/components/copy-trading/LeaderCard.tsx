import React from 'react'
import {
  TrendingUp,
  TrendingDown,
  Users,
  Activity,
} from 'lucide-react'
import type { LeaderProfile } from '../../types/copy-trading'

interface LeaderCardProps {
  leader: LeaderProfile
  rank?: number
  onCopy: (leader: LeaderProfile) => void
  onViewProfile: (leader: LeaderProfile) => void
  isAlreadyCopying?: boolean
}

function formatUsd(value: number | undefined): string {
  if (value === undefined || value === null) return '$0'
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`
  return `$${value.toFixed(0)}`
}

function formatPercent(value: number | undefined): string {
  if (value === undefined || value === null) return '0%'
  return `${value.toFixed(1)}%`
}

function truncateAddress(address: string, chars = 4): string {
  if (!address) return ''
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  if (diff < 3600000) return `${Math.round(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.round(diff / 3600000)}h ago`
  return `${Math.round(diff / 86400000)}d ago`
}

export function LeaderCard({
  leader,
  rank,
  onCopy,
  onViewProfile,
  isAlreadyCopying = false,
}: LeaderCardProps) {
  const isProfitable = (leader.totalPnlUsd ?? 0) >= 0
  const PnlIcon = isProfitable ? TrendingUp : TrendingDown

  return (
    <div
      className="rounded-lg p-4 transition-all hover:scale-[1.01] cursor-pointer"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--line)',
      }}
      onClick={() => onViewProfile(leader)}
    >
      {/* Header with rank and address */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          {rank && (
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
              style={{
                background: rank <= 3 ? 'var(--accent)' : 'var(--surface-alt)',
                color: rank <= 3 ? 'var(--surface)' : 'var(--text-muted)',
              }}
            >
              {rank}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium" style={{ color: 'var(--text)' }}>
                {leader.label || truncateAddress(leader.address)}
              </span>
              {leader.isActive && (
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: 'var(--success)' }}
                  title="Active"
                />
              )}
            </div>
            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
              <span>{leader.chain}</span>
              <span>·</span>
              <span>Last active {formatRelativeTime(leader.lastActiveAt)}</span>
            </div>
          </div>
        </div>

        <button
          className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
          style={{
            background: isAlreadyCopying ? 'var(--surface-alt)' : 'var(--accent)',
            color: isAlreadyCopying ? 'var(--text-muted)' : 'var(--surface)',
          }}
          onClick={(e) => {
            e.stopPropagation()
            if (!isAlreadyCopying) onCopy(leader)
          }}
          disabled={isAlreadyCopying}
        >
          {isAlreadyCopying ? 'Copying' : 'Copy'}
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-3 mb-3">
        <div>
          <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
            Win Rate
          </div>
          <div className="font-medium" style={{ color: 'var(--text)' }}>
            {formatPercent(leader.winRate)}
          </div>
        </div>
        <div>
          <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
            Total P&L
          </div>
          <div
            className="font-medium flex items-center gap-1"
            style={{ color: isProfitable ? 'var(--success)' : 'var(--error)' }}
          >
            <PnlIcon size={14} />
            {formatUsd(Math.abs(leader.totalPnlUsd ?? 0))}
          </div>
        </div>
        <div>
          <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
            Sharpe
          </div>
          <div className="font-medium" style={{ color: 'var(--text)' }}>
            {leader.sharpeRatio?.toFixed(2) ?? '-'}
          </div>
        </div>
        <div>
          <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
            Trades
          </div>
          <div className="font-medium" style={{ color: 'var(--text)' }}>
            {leader.totalTrades}
          </div>
        </div>
      </div>

      {/* Footer with additional info */}
      <div
        className="flex items-center justify-between pt-3 text-xs"
        style={{ borderTop: '1px solid var(--line)', color: 'var(--text-muted)' }}
      >
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <Users size={12} />
            {leader.followerCount} copiers
          </span>
          <span className="flex items-center gap-1">
            <Activity size={12} />
            {leader.avgTradesPerDay?.toFixed(1) ?? 0}/day
          </span>
        </div>
        <div className="flex items-center gap-2">
          {leader.mostTradedTokens.slice(0, 3).map((token) => (
            <span
              key={token}
              className="px-1.5 py-0.5 rounded text-xs"
              style={{ background: 'var(--surface-alt)' }}
            >
              {token}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

// Compact version for lists
export function LeaderCardCompact({
  leader,
  onCopy,
  isAlreadyCopying = false,
}: Omit<LeaderCardProps, 'onViewProfile' | 'rank'>) {
  const isProfitable = (leader.totalPnlUsd ?? 0) >= 0

  return (
    <div
      className="flex items-center justify-between p-3 rounded-lg"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--line)',
      }}
    >
      <div className="flex items-center gap-3">
        <div>
          <div className="font-medium" style={{ color: 'var(--text)' }}>
            {leader.label || truncateAddress(leader.address)}
          </div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {leader.chain} · {leader.totalTrades} trades
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <div
            className="font-medium text-sm"
            style={{ color: isProfitable ? 'var(--success)' : 'var(--error)' }}
          >
            {isProfitable ? '+' : ''}{formatUsd(leader.totalPnlUsd ?? 0)}
          </div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {formatPercent(leader.winRate)} win
          </div>
        </div>

        <button
          className="px-3 py-1.5 rounded text-sm font-medium"
          style={{
            background: isAlreadyCopying ? 'var(--surface-alt)' : 'var(--accent)',
            color: isAlreadyCopying ? 'var(--text-muted)' : 'var(--surface)',
          }}
          onClick={() => !isAlreadyCopying && onCopy(leader)}
          disabled={isAlreadyCopying}
        >
          {isAlreadyCopying ? 'Copying' : 'Copy'}
        </button>
      </div>
    </div>
  )
}
