import React from 'react'
import { AlertTriangle, Clock3, Download, Info } from 'lucide-react'

import type { Widget } from '../../../types/widgets'
import type { HistoryExportRef, HistorySummaryResponse } from '../../../types/history'
import { useHistorySummary } from '../../../hooks/useHistorySummary'
import { WidgetButton, WidgetSection, WidgetStatGrid } from '../../widgets/widget-kit'
import { HistoryTrendCard } from './HistoryTrendCard'

interface HistorySummaryPanelProps {
  widget: Widget<HistorySummaryResponse>
}

type HistoryBucket = NonNullable<HistorySummaryResponse['buckets']>[number]

export function HistorySummaryPanel({ widget }: HistorySummaryPanelProps) {
  const summary = widget.payload
  const {
    events,
    readyExports,
    pendingExports,
    nextDownloadUrl,
    metadata,
    isLimitSample,
    isWindowClamped,
    limitCount,
  } = useHistorySummary(summary)

  if (!summary) {
    return (
      <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
        No history data available for this wallet.
      </div>
    )
  }

  const totals = summary.totals
  const topBuckets = (summary.buckets ?? []).slice(0, 3)
  const headingId = `history-summary-${widget.id}`
  const subtitleId = isLimitSample ? undefined : `${headingId}-range`
  const coverageLabel = formatRange(summary.timeWindow.start, summary.timeWindow.end)
  const requestedRangeLabel = metadata.requestedWindow
    ? formatRange(metadata.requestedWindow.start, metadata.requestedWindow.end)
    : null
  const statusMessages: Array<{ tone: 'info' | 'warning'; message: string }> = []
  const noTransfersRecorded =
    totals.inflowUsd === 0 &&
    totals.outflowUsd === 0 &&
    totals.feeUsd === 0 &&
    (summary.buckets ?? []).every((bucket) => (bucket.transactionsSample?.length ?? 0) === 0)

  if (!isLimitSample && isWindowClamped && requestedRangeLabel) {
    const clampDays = metadata.clampedWindowDays ?? 90
    statusMessages.push({
      tone: 'warning',
      message: `${requestedRangeLabel ? `${requestedRangeLabel} ` : 'The requested range '}exceeds the 90-day sync limit. Showing the latest ${clampDays} days for fast summaries—request an export for the full window.`,
    })
  }

  if (pendingExports.length > 0) {
    const plural = pendingExports.length > 1 ? 's' : ''
    const etaLabel = formatEta(metadata.retryAfterSeconds)
    statusMessages.push({
      tone: 'info',
      message: `${pendingExports.length} export${plural} still generating${etaLabel ? ` (~${etaLabel})` : ''}. We'll drop the download link here when it's ready.`,
    })
  }

  if (isLimitSample && noTransfersRecorded) {
    statusMessages.push({
      tone: 'info',
      message: `No transfers found in the latest ${limitCount ?? 'requested'} transactions. Try a wider range or confirm the wallet address.`,
    })
  }

  return (
    <section
      aria-labelledby={headingId}
      {...(subtitleId ? { 'aria-describedby': subtitleId } : {})}
      className="space-y-[var(--s3)]"
    >
      <header className="flex flex-wrap items-start justify-between gap-[var(--s2)]">
        <div>
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.2em]"
            style={{ color: 'var(--text-muted)' }}
          >
            History summary
          </p>
          <h3 id={headingId} className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
            {isLimitSample && limitCount
              ? `Latest ${limitCount.toLocaleString()} transactions`
              : 'Recent activity'}
          </h3>
          {!isLimitSample && subtitleId ? (
            <p id={subtitleId} className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Window {coverageLabel}
            </p>
          ) : null}
        </div>
        <div className="text-right text-xs" style={{ color: 'var(--text-muted)' }}>
          <span role="status">Updated {timeAgo(summary.generatedAt)}</span>
          {summary.cached ? <p className="text-[11px]">served from cache</p> : null}
        </div>
      </header>

      {statusMessages.map((status, idx) => (
        <StatusBanner key={`${status.tone}-${idx}`} tone={status.tone}>
          {status.message}
        </StatusBanner>
      ))}

      <WidgetStatGrid columns={3}>
        <MetricStat label="Total inflow" value={totals.inflowUsd} tone="success" />
        <MetricStat label="Total outflow" value={totals.outflowUsd} tone="warning" />
        <MetricStat label="Fees paid" value={totals.feeUsd} tone="muted" />
      </WidgetStatGrid>

      <div className="space-y-[var(--s1)]">
        <SectionLabel>Recent buckets</SectionLabel>
        {topBuckets.length ? (
          <div className="space-y-[var(--s1)]">
            {topBuckets.map((bucket) => (
              <BucketCard key={bucket.start} bucket={bucket} />
            ))}
          </div>
        ) : (
          <WidgetSection
            tone="muted"
            padding="sm"
            className="text-sm"
            style={{ color: 'var(--text-muted)' }}
          >
            No transactions recorded.
          </WidgetSection>
        )}
      </div>

      {events.length ? (
        <div className="space-y-[var(--s1)]" aria-live="polite">
          <SectionLabel icon={<Info size={14} aria-hidden />}>Highlights</SectionLabel>
          <div className="grid gap-[var(--s1)] md:grid-cols-2">
            {events.map((event, idx) => (
              <HistoryTrendCard key={`${event.type}-${idx}`} event={event} />
            ))}
          </div>
        </div>
      ) : null}

      <div className="space-y-[var(--s1)]">
        <SectionLabel icon={<Download size={12} aria-hidden />}>Exports</SectionLabel>
        <ExportSection
          exports={summary.exportRefs}
          pendingExports={pendingExports}
          readyExports={readyExports}
          nextDownloadUrl={nextDownloadUrl}
        />
      </div>
    </section>
  )
}

const STAT_TONES: Record<'success' | 'warning' | 'muted', { accent: string; bg: string; border: string }> = {
  success: {
    accent: 'var(--success)',
    bg: 'rgba(95,211,154,.14)',
    border: 'rgba(95,211,154,.32)',
  },
  warning: {
    accent: 'var(--warning)',
    bg: 'rgba(255,204,102,.16)',
    border: 'rgba(255,204,102,.35)',
  },
  muted: {
    accent: 'var(--text)',
    bg: 'var(--surface-2)',
    border: 'var(--line)',
  },
}

function MetricStat({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'success' | 'warning' | 'muted'
}) {
  const palette = STAT_TONES[tone]
  return (
    <div
      role="listitem"
      className="rounded-2xl border px-[var(--s2)] py-[var(--s1)]"
      style={{ background: palette.bg, borderColor: palette.border }}
    >
      <p className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
        {label}
      </p>
      <p className="text-2xl font-semibold" style={{ color: palette.accent }}>
        {formatUsd(value)}
      </p>
    </div>
  )
}

function BucketCard({ bucket }: { bucket: HistoryBucket }) {
  const sample = bucket.transactionsSample ?? []
  const net = (bucket.inflowUsd ?? 0) - (bucket.outflowUsd ?? 0)
  const netColor = net > 0 ? 'var(--success)' : net < 0 ? 'var(--danger)' : 'var(--text)'
  return (
    <WidgetSection
      padding="sm"
      className="space-y-[var(--s1)]"
      aria-label={`Bucket starting ${formatDate(bucket.start)}`}
      style={{ borderColor: 'var(--line)' }}
    >
      <div className="flex items-center justify-between gap-[var(--s1)] text-sm">
        <div className="flex items-center gap-[var(--s1)]" style={{ color: 'var(--text)' }}>
          <Clock3 className="h-4 w-4" style={{ color: 'var(--text-muted)' }} aria-hidden />
          <span>{formatDate(bucket.start)}</span>
        </div>
        <div className="text-right">
          <p className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Net USD
          </p>
          <p className="font-semibold" style={{ color: netColor }}>
            {formatUsd(net)}
          </p>
        </div>
      </div>
      {sample.length > 0 && (
          <div className="grid gap-[var(--s-1)] text-xs" aria-label="Sample transactions">
          {sample.map((tx, idx) => {
            const amountColor = tx.direction === 'inflow' ? 'var(--success)' : 'var(--danger)'
            const txAny = tx as any
            const label = tx.symbol || txAny.protocol || txAny.protocol_name || txAny.tx_type || 'Txn'
            return (
              <div
                key={tx.tx_hash ?? `${bucket.start}-${idx}`}
                className="flex items-center justify-between rounded-lg border px-[var(--s1)] py-[var(--s-1)]"
                style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}
              >
                <span className="font-semibold" style={{ color: 'var(--text-muted)' }}>
                  {label}
                </span>
                <span style={{ color: amountColor }}>
                  {tx.direction === 'inflow' ? '+' : '-'}
                  {formatUsd(tx.usd_value ?? 0)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </WidgetSection>
  )
}

function ExportSection({
  exports,
  pendingExports,
  readyExports,
  nextDownloadUrl,
}: {
  exports: HistoryExportRef[]
  pendingExports: HistoryExportRef[]
  readyExports: HistoryExportRef[]
  nextDownloadUrl: string | null
}) {
  if (!exports?.length) {
    return (
      <WidgetSection
        tone="muted"
        padding="sm"
        className="text-sm"
        style={{ color: 'var(--text-muted)' }}
      >
        Request an export from chat to download CSV or JSON activity logs.
      </WidgetSection>
    )
  }
  return (
    <div className="space-y-[var(--s1)]" aria-label="History exports">
      {exports.map((ref) => {
        const expiresLabel = `Expires ${timeAgo(ref.expiresAt, true)}`
        const statusColor = ref.status === 'failed' ? 'var(--danger)' : 'var(--text-muted)'
        return (
          <WidgetSection
            key={ref.exportId}
            padding="sm"
            className="flex flex-wrap items-center justify-between gap-[var(--s1)]"
            style={{ borderColor: 'var(--line)' }}
          >
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                {ref.format.toUpperCase()} · {ref.status}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {expiresLabel}
              </p>
            </div>
            {ref.downloadUrl && ref.status === 'ready' ? (
              <a
                className="inline-flex items-center gap-[var(--s-1)] rounded-full border border-transparent bg-[var(--accent)] px-[var(--s2)] py-[var(--s-1)] text-xs font-semibold text-[var(--text-inverse)] shadow-sm transition hover:bg-[var(--accent-600)]"
                href={ref.downloadUrl}
                target="_blank"
                rel="noreferrer"
              >
                <Download size={14} aria-hidden /> Download
              </a>
            ) : (
              <span className="text-xs font-medium" style={{ color: statusColor }} role="status">
                {ref.status === 'failed' ? 'Failed' : 'Preparing...'}
              </span>
            )}
          </WidgetSection>
        )
      })}
      <div
        className="flex flex-wrap items-center justify-between gap-[var(--s1)] text-xs"
        style={{ color: 'var(--text-muted)' }}
      >
        <span>
          {pendingExports.length > 0
            ? `${pendingExports.length} export${pendingExports.length > 1 ? 's' : ''} still generating.`
            : `All ${readyExports.length || 'saved'} exports ready.`}
        </span>
        <WidgetButton
          variant="secondary"
          size="sm"
          className="font-semibold"
          disabled={!nextDownloadUrl}
          onClick={() => {
            if (nextDownloadUrl) {
              window.open(nextDownloadUrl, '_blank', 'noopener')
            }
          }}
        >
          <Download size={12} aria-hidden /> Download latest
        </WidgetButton>
      </div>
    </div>
  )
}

function SectionLabel({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div
      className="flex items-center gap-[var(--s-1)] text-[11px] font-semibold uppercase tracking-[0.2em]"
      style={{ color: 'var(--text-muted)' }}
    >
      {icon && <span aria-hidden>{icon}</span>}
      <span>{children}</span>
    </div>
  )
}

function StatusBanner({ tone, children }: { tone: 'info' | 'warning'; children: React.ReactNode }) {
  const palette =
    tone === 'warning'
      ? {
          bg: 'rgba(255,204,102,.12)',
          border: 'rgba(255,204,102,.35)',
          icon: <AlertTriangle size={16} aria-hidden />,
          color: 'var(--warning)',
        }
      : {
          bg: 'rgba(90,164,255,.12)',
          border: 'rgba(90,164,255,.32)',
          icon: <Info size={16} aria-hidden />,
          color: 'var(--text)',
        }
  return (
    <div
      className="flex items-start gap-[var(--s1)] rounded-2xl border px-[var(--s2)] py-[var(--s1)] text-sm"
      style={{ background: palette.bg, borderColor: palette.border, color: palette.color }}
      role="status"
    >
      <span className="mt-[2px]" aria-hidden>
        {palette.icon}
      </span>
      <span>{children}</span>
    </div>
  )
}

function formatUsd(value: number) {
  return Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value ?? 0)
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function formatRange(start?: string, end?: string) {
  if (!start || !end) {
    return 'n/a'
  }
  return `${formatDate(start)} – ${formatDate(end)}`
}

function timeAgo(value: string, futureAllowed = false) {
  const target = new Date(value).getTime()
  const now = Date.now()
  const diffMs = futureAllowed ? target - now : now - target
  const diffMinutes = Math.floor(diffMs / 60000)
  if (Math.abs(diffMinutes) < 60) {
    return `${Math.max(1, Math.abs(diffMinutes))}m`
  }
  const diffHours = Math.floor(diffMinutes / 60)
  if (Math.abs(diffHours) < 24) {
    return `${Math.abs(diffHours)}h`
  }
  const diffDays = Math.floor(diffHours / 24)
  return `${Math.abs(diffDays)}d`
}

function formatEta(seconds?: number) {
  if (!seconds) {
    return null
  }
  if (seconds < 60) {
    return `${Math.max(1, Math.round(seconds))}s`
  }
  const minutes = Math.ceil(seconds / 60)
  if (minutes < 60) {
    return `${minutes}m`
  }
  const hours = Math.ceil(minutes / 60)
  return `${hours}h`
}
