import type { HistoryComparisonReport } from '../../../types/history'
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'

function DeltaBadge({ direction }: { direction: 'up' | 'down' | 'flat' }) {
  if (direction === 'up') {
    return <span className="inline-flex items-center gap-1 text-emerald-300"><ArrowUpRight size={12} /> Up</span>
  }
  if (direction === 'down') {
    return <span className="inline-flex items-center gap-1 text-rose-300"><ArrowDownRight size={12} /> Down</span>
  }
  return <span className="inline-flex items-center gap-1 text-slate-400"><Minus size={12} /> Flat</span>
}

export function HistoryComparisonTable({ report }: { report: HistoryComparisonReport }) {
  const metrics = report.metricDeltas ?? []
  return (
    <section aria-labelledby="history-comparison" className="space-y-4">
      <header>
        <p className="text-xs uppercase tracking-wide text-muted">Comparison window</p>
        <h3 id="history-comparison" className="text-lg font-semibold text-white">
          {formatRange(report.baselineWindow)} → {formatRange(report.comparisonWindow)}
        </h3>
      </header>
      <div className="overflow-x-auto rounded-xl border border-border/40">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-900/60 text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-2 text-left">Metric</th>
              <th className="px-4 py-2 text-right">Baseline</th>
              <th className="px-4 py-2 text-right">Comparison</th>
              <th className="px-4 py-2 text-right">Δ%</th>
              <th className="px-4 py-2 text-left">Signal</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((metric) => (
              <tr key={metric.metric} className="border-t border-border/30">
                <td className="px-4 py-2 font-medium text-white">{friendlyMetric(metric.metric)}</td>
                <td className="px-4 py-2 text-right">{formatNumber(metric.baselineValueUsd)}</td>
                <td className="px-4 py-2 text-right">{formatNumber(metric.comparisonValueUsd)}</td>
                <td className={`px-4 py-2 text-right ${metric.deltaPct && metric.deltaPct > 0 ? 'text-emerald-300' : metric.deltaPct && metric.deltaPct < 0 ? 'text-rose-300' : 'text-muted'}`}>
                  {typeof metric.deltaPct === 'number' ? `${(metric.deltaPct * 100).toFixed(1)}%` : 'n/a'}
                </td>
                <td className="px-4 py-2"><DeltaBadge direction={metric.direction} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {report.thresholdFlags?.length ? (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-100">
          <p className="font-semibold text-amber-200">Significant changes</p>
          <ul className="mt-1 list-disc pl-4">
            {report.thresholdFlags.map((flag, idx) => (
              <li key={`flag-${idx}`}>
                {friendlyMetric(flag.metric)} moved {(flag.magnitudePct * 100).toFixed(1)}% {flag.direction}.
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}

function friendlyMetric(metric: string): string {
  switch (metric) {
    case 'inflowUsd':
      return 'Inflow (USD)'
    case 'outflowUsd':
      return 'Outflow (USD)'
    case 'feeUsd':
      return 'Fees (USD)'
    case 'protocolCount':
      return 'Active protocols'
    case 'counterpartyCount':
      return 'Unique counterparties'
    default:
      return metric
  }
}

function formatNumber(value?: number | null): string {
  if (typeof value !== 'number') return 'n/a'
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(1)}K`
  return `$${value.toFixed(0)}`
}

function formatRange(window: { start?: string; end?: string }): string {
  if (!window?.start || !window?.end) return 'n/a'
  const start = new Date(window.start)
  const end = new Date(window.end)
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  return `${start.toLocaleDateString(undefined, opts)} - ${end.toLocaleDateString(undefined, opts)}`
}
