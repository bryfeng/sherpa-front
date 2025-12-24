import React from 'react'
import { ArrowRight, ArrowUpRight, Info, Loader2, RefreshCw, Wallet, X } from 'lucide-react'
import { motion } from 'framer-motion'
import type { PortfolioSummaryViewModel, WorkspaceRequestStatus } from '../../workspace/types'
import { formatRelativeTime } from '../../utils/time'
import { Badge, Button } from '../ui/primitives'

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
  // Don't fall back to allocationPercent - it's not a gain/loss metric
  return undefined
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
        className="chip flex min-w-[150px] flex-1 items-center justify-between gap-[var(--s1)]"
      >
        <div className="flex items-center gap-[var(--s-1)]">
          <Badge className="uppercase tracking-wide badge--outline" variant="outline">
            {entry.sym?.toUpperCase() || entry.symbol?.toUpperCase() || 'TOK'}
          </Badge>
          {pct && <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{pct}</span>}
        </div>
        <span className="font-medium" style={{ color: 'var(--text)' }}>
          {amount}
        </span>
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
      className="relative overflow-hidden card"
    >
      <div
        className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[rgba(90,164,255,.45)] via-[rgba(41,127,240,.4)] to-transparent"
        aria-hidden="true"
      />
      <div className="flex items-start justify-between gap-3 px-[var(--s3)] pt-[var(--s3)]">
        <div className="flex items-center gap-[var(--s2)]">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl subtle text-[var(--text)]">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>
              Portfolio snapshot
            </div>
            <div className="mt-1 flex items-center gap-2 text-2xl font-semibold" style={{ color: 'var(--text)' }}>
              {loading ? (
                <span className="flex items-center gap-2 text-base">
                  <Loader2 className="h-4 w-4 animate-spin" style={{ color: 'var(--text-muted)' }} />
                  Updating…
                </span>
              ) : (
                <>{summary.totalUsdFormatted}</>
              )}
            </div>
            <div className="mt-[var(--s-1)] text-xs" style={{ color: 'var(--text-muted)' }}>
              Updated {updatedLabel}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="rounded-md border border-[var(--line)] p-2 text-[var(--text-muted)] transition hover:bg-[var(--hover)]"
              title="Refresh portfolio"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          )}
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="rounded-md border border-[var(--line)] p-2 text-[var(--text-muted)] transition hover:bg-[var(--hover)]"
              title="Hide snapshot"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      <div className="px-[var(--s3)] pb-[var(--s3)]">
        <div className="mt-[var(--s2)] flex flex-col gap-[var(--s2)] md:flex-row">
          {positions.length > 0 ? (
            <div className="flex flex-1 flex-col gap-[var(--s1)] md:flex-row">
              {positions.map((entry, idx) => renderChip(entry, idx))}
            </div>
          ) : (
            <div className="chip flex flex-1 items-center gap-[var(--s1)]" style={{ color: 'var(--text-muted)' }}>
              <Info className="h-4 w-4" />
              <span>No token positions available yet.</span>
            </div>
          )}
          <div className="flex w-full max-w-[160px] flex-col items-start justify-center rounded-xl subtle px-[var(--s2)] py-[var(--s1)]">
            <div className="flex items-center gap-[var(--s-1)] text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Trend
              <ArrowUpRight
                className={`h-3.5 w-3.5 ${changePositive === false ? 'rotate-90' : ''}`}
                style={{ color: changePositive === false ? 'var(--danger)' : 'var(--success)' }}
              />
            </div>
            <div
              className="mt-[var(--s-1)] text-lg font-semibold"
              style={{ color: changePositive === false ? 'var(--danger)' : 'var(--success)' }}
            >
              {typeof change === 'number' ? `${change.toFixed(1)}%` : '—'}
            </div>
            <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              24h outlook
            </div>
          </div>
        </div>
        <div className="mt-[var(--s2)] flex flex-wrap items-center justify-between gap-[var(--s1)] text-sm" style={{ color: 'var(--text-muted)' }}>
          <p className="flex-1">{resolvedDescription}</p>
          <Button size="sm" variant="secondary" onClick={onOpenWorkspace} className="rounded-md">
            View details
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  )
}

export default PortfolioInlineCard
