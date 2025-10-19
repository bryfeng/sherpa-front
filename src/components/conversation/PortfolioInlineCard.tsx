import React from 'react'
import { ArrowRight, ArrowUpRight, Info, Loader2, RefreshCw, Wallet, X } from 'lucide-react'
import { motion } from 'framer-motion'
import type { PortfolioSummaryViewModel, WorkspaceRequestStatus } from '../../workspace/types'
import { formatRelativeTime } from '../../utils/time'

interface PortfolioInlineCardProps {
  summary: PortfolioSummaryViewModel
  status: WorkspaceRequestStatus
  refreshing?: boolean
  onOpenWorkspace: () => void
  onDismiss?: () => void
  onRefresh?: () => void
  description?: string
}

function metricPercent(summary: PortfolioSummaryViewModel): number | undefined {
  const raw = summary.raw as any
  const direct = typeof raw?.change_24h_percent === 'number' ? raw.change_24h_percent : undefined
  if (typeof direct === 'number') return direct
  const perf = raw?.performance ?? raw?.metrics ?? raw?.delta
  const perfPct = typeof perf?.change_24h_percent === 'number'
    ? perf.change_24h_percent
    : typeof perf?.day_change_percent === 'number'
      ? perf.day_change_percent
      : undefined
  if (typeof perfPct === 'number') return perfPct
  const top = summary.topPositions[0]
  return typeof top?.allocationPercent === 'number' ? top.allocationPercent : undefined
}

export function PortfolioInlineCard({
  summary,
  status,
  refreshing = false,
  onOpenWorkspace,
  onDismiss,
  onRefresh,
  description,
}: PortfolioInlineCardProps) {
  const positions = summary.topPositions.slice(0, 2)
  const change = metricPercent(summary)
  const changePositive = typeof change === 'number' ? change >= 0 : undefined
  const updatedLabel = formatRelativeTime(summary.fetchedAt)

  const renderChip = (entry: typeof positions[number], index: number) => {
    const amount = entry.usdFormatted
    const pct = typeof entry.allocationPercent === 'number' && Number.isFinite(entry.allocationPercent)
      ? `${entry.allocationPercent.toFixed(1)}%`
      : null
    return (
      <div
        key={`${entry.symbol}-${index}`}
        className="flex flex-1 min-w-[140px] items-center justify-between gap-3 rounded-xl bg-slate-900/5 px-3 py-2 text-xs text-slate-700"
      >
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-slate-900/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-900">
            {entry.sym?.toUpperCase() || entry.symbol?.toUpperCase() || 'TOK'}
          </span>
          {pct && <span className="text-[11px] text-slate-500">{pct}</span>}
        </div>
        <span className="font-medium text-slate-900">{amount}</span>
      </div>
    )
  }

  const resolvedDescription = description
    || 'Top holdings at a glance. Jump into the workspace for full allocation controls.'

  const loading = status === 'loading' || (refreshing && status === 'success')

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm"
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-400 via-indigo-400 to-slate-700" aria-hidden="true" />
      <div className="flex items-start justify-between gap-3 px-4 pt-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Portfolio snapshot</div>
            <div className="mt-1 flex items-center gap-2 text-2xl font-semibold text-slate-900">
              {loading ? (
                <span className="flex items-center gap-2 text-base">
                  <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                  Updating…
                </span>
              ) : (
                <>{summary.totalUsdFormatted}</>
              )}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Updated {updatedLabel}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
              title="Refresh portfolio"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          )}
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
              title="Hide snapshot"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      <div className="px-4 pb-4">
        <div className="mt-4 flex flex-col gap-3 md:flex-row">
          {positions.length > 0 ? (
            <div className="flex flex-1 flex-col gap-2 md:flex-row">
              {positions.map((entry, idx) => renderChip(entry, idx))}
            </div>
          ) : (
            <div className="flex flex-1 items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-600">
              <Info className="h-4 w-4 text-slate-400" />
              <span>No token positions available yet.</span>
            </div>
          )}
          <div className="flex w-full max-w-[140px] flex-col items-start justify-center rounded-xl bg-emerald-50 px-3 py-2 text-emerald-700">
            <div className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide">
              Trend
              <ArrowUpRight className={`h-3.5 w-3.5 ${changePositive === false ? 'rotate-90 text-rose-500' : ''}`} />
            </div>
            <div className={`mt-1 text-lg font-semibold ${changePositive === false ? 'text-rose-600' : 'text-emerald-600'}`}>
              {typeof change === 'number' ? `${change.toFixed(1)}%` : '—'}
            </div>
            <div className="text-[11px] text-emerald-700/70">24h outlook</div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
          <p className="flex-1 text-sm text-slate-600">{resolvedDescription}</p>
          <button
            type="button"
            onClick={onOpenWorkspace}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
          >
            View details
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.div>
  )
}

export default PortfolioInlineCard
