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
  const top = summary.topPositions?.[0]
  return typeof top?.allocationPercent === 'number' ? top.allocationPercent : undefined
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
      className={`group relative flex min-w-[220px] max-w-xs items-center gap-3 rounded-full px-3 py-2 text-left shadow-sm transition ${
        errored
          ? 'border border-amber-400 bg-amber-50 text-amber-900'
          : 'border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 text-white'
      }`}
      title={errored ? 'Portfolio unavailable. Tap to retry.' : 'Open portfolio workspace'}
    >
      <div className={`flex h-9 w-9 items-center justify-center rounded-full ${errored ? 'bg-white/60 text-amber-700' : 'bg-white/10'} shadow-inner`}
        aria-hidden="true"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${errored ? 'text-amber-700' : 'text-white/70'} group-hover:opacity-80`}>Portfolio</div>
        <div className="flex items-baseline gap-2">
          <span className={`truncate text-sm font-semibold ${errored ? 'text-amber-900' : 'text-white'}`}>
            {summary?.totalUsdFormatted ?? '—'}
          </span>
          {typeof change === 'number' && (
            <span className={`text-xs font-medium ${changePositive === false ? 'text-emerald-200/80 group-hover:text-emerald-100' : 'text-emerald-200 group-hover:text-emerald-100'}`}>
              {change.toFixed(1)}%
            </span>
          )}
        </div>
        {summary?.topPositions?.[0] && (
          <div className={`truncate text-[11px] ${errored ? 'text-amber-700/80' : 'text-white/70'} group-hover:text-white/80`}>
            Top: {summary.topPositions[0].sym?.toUpperCase() || summary.topPositions[0].symbol?.toUpperCase()} · {summary.topPositions[0].usdFormatted}
          </div>
        )}
      </div>
      <div className={`flex h-7 w-7 items-center justify-center rounded-full border ${errored ? 'border-amber-400 bg-amber-100 text-amber-700' : 'border-white/40 bg-white/10 text-white'}`} aria-hidden="true">
        {errored ? <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> : <ArrowUpRight className="h-4 w-4" />}
      </div>
    </button>
  )
}

export default PortfolioRailChip
