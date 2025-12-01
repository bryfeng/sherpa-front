import { AlertTriangle, Info, ShieldAlert } from 'lucide-react'
import type { HistorySummaryResponse } from '../../../types/history'

const severityStyles: Record<
  string,
  { icon: JSX.Element; accent: string; border: string; background: string; iconBg: string }
> = {
  info: {
    icon: <Info size={14} aria-hidden />,
    accent: 'var(--accent)',
    border: 'rgba(90,164,255,.35)',
    background: 'rgba(90,164,255,.08)',
    iconBg: 'rgba(90,164,255,.18)',
  },
  warning: {
    icon: <AlertTriangle size={14} aria-hidden />,
    accent: 'var(--warning)',
    border: 'rgba(255,204,102,.35)',
    background: 'rgba(255,204,102,.12)',
    iconBg: 'rgba(255,204,102,.24)',
  },
  critical: {
    icon: <ShieldAlert size={14} aria-hidden />,
    accent: 'var(--danger)',
    border: 'rgba(255,107,107,.35)',
    background: 'rgba(255,107,107,.12)',
    iconBg: 'rgba(255,107,107,.2)',
  },
}

export function HistoryTrendCard({ event }: { event: HistorySummaryResponse['notableEvents'][number] }) {
  const severity = event.severity || 'info'
  const styles = severityStyles[severity] ?? severityStyles.info
  return (
    <div
      className="flex items-start gap-[var(--s1)] rounded-2xl border px-[var(--s2)] py-[var(--s1)] text-sm"
      style={{ background: styles.background, borderColor: styles.border }}
    >
      <span
        className="inline-flex h-8 w-8 items-center justify-center rounded-full"
        style={{ background: styles.iconBg, color: styles.accent }}
        aria-hidden
      >
        {styles.icon}
      </span>
      <div className="space-y-[var(--s-1)]">
        <p className="font-semibold capitalize" style={{ color: styles.accent }}>
          {event.type.replace('_', ' ')}
        </p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {event.summary}
        </p>
      </div>
    </div>
  )
}
