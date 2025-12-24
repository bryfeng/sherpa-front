import React from 'react'
import { ArrowUpRight, Loader2, RefreshCw, Wallet } from 'lucide-react'
import type { PortfolioSummaryViewModel, WorkspaceRequestStatus } from '../../workspace/types'

interface PortfolioRailChipProps {
  summary?: PortfolioSummaryViewModel | null
  status: WorkspaceRequestStatus
  refreshing?: boolean
  onOpenWorkspace: () => void
  onRefresh?: () => void
}

function resolveChange(summary?: PortfolioSummaryViewModel | null) {
  if (!summary) return undefined
  const raw = summary.raw as any
  if (typeof raw?.change_24h_percent === 'number') return raw.change_24h_percent
  const metrics = raw?.performance ?? raw?.metrics ?? raw?.delta
  if (typeof metrics?.change_24h_percent === 'number') return metrics.change_24h_percent
  if (typeof metrics?.day_change_percent === 'number') return metrics.day_change_percent
  // Don't fall back to allocationPercent - it's not a gain/loss metric
  return undefined
}

export function PortfolioRailChip({ summary, status, refreshing = false, onOpenWorkspace, onRefresh }: PortfolioRailChipProps) {
  const change = resolveChange(summary)
  const changePositive = typeof change === 'number' ? change >= 0 : undefined
  const loading = status === 'loading'
  const errored = status === 'error'

  const handleClick = () => {
    if (errored && onRefresh) {
      onRefresh()
      return
    }
    onOpenWorkspace()
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`group relative flex min-w-[220px] max-w-xs items-center gap-[var(--s1)] rounded-lg border px-[var(--s1)] py-[var(--s-1)] text-left transition ${
        errored
          ? 'border-[var(--warning)] bg-[rgba(255,204,102,.12)] text-[var(--warning)]'
          : 'border-[var(--line)] bg-[var(--surface-2)] text-[var(--text)]'
      }`}
      title={errored ? 'Portfolio unavailable. Tap to retry.' : 'Open portfolio workspace'}
    >
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-md ${
          errored ? 'bg-[rgba(255,204,102,.25)] text-[var(--warning)]' : 'bg-[rgba(90,164,255,.12)] text-[var(--accent)]'
        } shadow-inner`}
        aria-hidden="true"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
      </div>
      <div className="min-w-0 flex-1">
        <div
          className="text-[11px] font-semibold uppercase tracking-[0.2em] group-hover:opacity-80"
          style={{ color: errored ? 'var(--warning)' : 'var(--text-muted)' }}
        >
          Portfolio
        </div>
        <div className="flex items-baseline gap-[var(--s-1)]">
          <span className="truncate text-sm font-semibold" style={{ color: errored ? 'var(--warning)' : 'var(--text)' }}>
            {summary?.totalUsdFormatted ?? '—'}
          </span>
          {typeof change === 'number' && (
            <span
              className="text-xs font-medium"
              style={{ color: changePositive === false ? 'var(--danger)' : 'var(--success)' }}
            >
              {change.toFixed(1)}%
            </span>
          )}
        </div>
        {summary?.topPositions?.[0] && (
          <div className="truncate text-[11px] group-hover:text-[var(--text)]" style={{ color: 'var(--text-muted)' }}>
            Top: {summary.topPositions[0].sym?.toUpperCase() || summary.topPositions[0].symbol?.toUpperCase()} · {summary.topPositions[0].usdFormatted}
          </div>
        )}
      </div>
      <div
        className={`flex h-7 w-7 items-center justify-center rounded-md border ${
          errored
            ? 'border-[var(--warning)] bg-[rgba(255,204,102,.18)] text-[var(--warning)]'
            : 'border-[var(--accent)]/40 bg-[rgba(90,164,255,.1)] text-[var(--accent)]'
        }`}
        aria-hidden="true"
      >
        {errored ? <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> : <ArrowUpRight className="h-4 w-4" />}
      </div>
    </button>
  )
}

export default PortfolioRailChip
