import React, { useState } from 'react'
import { Plus, Search, TrendingUp } from 'lucide-react'
import { StrategyCard } from './StrategyCard'
import type { StrategyFilters } from '../../types/strategy'
import type { GenericStrategy } from '../../hooks/useStrategies'

interface StrategyListProps {
  strategies: GenericStrategy[]
  isLoading: boolean
  isEmpty: boolean
  filters: StrategyFilters
  onFiltersChange: (filters: StrategyFilters) => void
  onCreateNew: () => void
  onPause: (id: string) => Promise<void>
  onResume: (id: string) => Promise<void>
  onStop: (id: string) => Promise<void>
  onEdit: (id: string) => void
  onViewDetails: (id: string) => void
}

type GenericStatus = GenericStrategy['status'] | 'all'

const STATUS_OPTIONS: Array<{ value: GenericStatus; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending_session', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
]

export function StrategyList({
  strategies,
  isLoading,
  isEmpty,
  filters,
  onFiltersChange,
  onCreateNew,
  onPause,
  onResume,
  onStop,
  onEdit,
  onViewDetails,
}: StrategyListProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredStrategies = strategies.filter((s) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    const config = s.config as Record<string, unknown>
    const fromToken = (config.from_token as string) || ''
    const toToken = (config.to_token as string) || ''
    return (
      s.name.toLowerCase().includes(query) ||
      fromToken.toLowerCase().includes(query) ||
      toToken.toLowerCase().includes(query) ||
      s.strategyType.toLowerCase().includes(query)
    )
  })

  const activeCount = strategies.filter((s) => s.status === 'active').length
  const pendingCount = strategies.filter((s) => s.status === 'pending_session').length

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 px-4 pt-4 pb-3" style={{ borderBottom: '1px solid var(--line)' }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
              Strategies
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {activeCount} active{pendingCount > 0 ? ` · ${pendingCount} pending` : ''} · {strategies.length} total
            </p>
          </div>
          <button
            onClick={onCreateNew}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: 'var(--accent)',
              color: 'var(--text-inverse)',
            }}
          >
            <Plus className="h-4 w-4" />
            New Strategy
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <div
            className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--line)' }}
          >
            <Search className="h-4 w-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search strategies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: 'var(--text)' }}
            />
          </div>

          {/* Status Filter */}
          <select
            value={filters.status ?? 'all'}
            onChange={(e) => onFiltersChange({ ...filters, status: e.target.value as StrategyFilters['status'] })}
            className="px-3 py-2 rounded-lg text-sm outline-none cursor-pointer"
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--line)',
              color: 'var(--text)',
            }}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-lg p-4 animate-pulse"
                style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-5 w-32 rounded" style={{ background: 'var(--surface-2)' }} />
                  <div className="h-5 w-16 rounded-full" style={{ background: 'var(--surface-2)' }} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[1, 2, 3, 4].map((j) => (
                    <div key={j} className="h-10 rounded" style={{ background: 'var(--surface-2)' }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : isEmpty ? (
          <EmptyState onCreateNew={onCreateNew} />
        ) : filteredStrategies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Search className="h-8 w-8 mb-3" style={{ color: 'var(--text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              No strategies match your search
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredStrategies.map((strategy) => (
              <StrategyCard
                key={strategy._id}
                strategy={strategy}
                onPause={onPause}
                onResume={onResume}
                onStop={onStop}
                onEdit={onEdit}
                onViewDetails={onViewDetails}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyState({ onCreateNew }: { onCreateNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div
        className="h-16 w-16 rounded-full flex items-center justify-center mb-4"
        style={{ background: 'var(--accent-muted)' }}
      >
        <TrendingUp className="h-8 w-8" style={{ color: 'var(--accent)' }} />
      </div>
      <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--text)' }}>
        No strategies yet
      </h3>
      <p className="text-sm mb-4 max-w-xs" style={{ color: 'var(--text-muted)' }}>
        Create automated trading strategies to execute your investment rules.
      </p>
      <button
        onClick={onCreateNew}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        style={{
          background: 'var(--accent)',
          color: 'var(--text-inverse)',
        }}
      >
        <Plus className="h-4 w-4" />
        Create Strategy
      </button>
    </div>
  )
}
