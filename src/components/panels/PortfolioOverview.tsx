import React from 'react'
import { ExternalLink } from 'lucide-react'

import type { PortfolioPositionViewModel, PortfolioSummaryViewModel } from '../../workspace/types'
import { PortfolioInlineCard } from '../conversation/PortfolioInlineCard'

interface PortfolioOverviewControls {
  collapsed: boolean
  onToggleCollapse: () => void
  onExpand: () => void
}

export interface PortfolioOverviewProps {
  payload: any
  walletAddress?: string
  collapsed?: boolean
  controls?: PortfolioOverviewControls
}

export function PortfolioOverview({ payload, walletAddress, collapsed = false, controls }: PortfolioOverviewProps) {
  const summary = React.useMemo<PortfolioSummaryViewModel | null>(() => {
    if (!payload) return null
    const total = Number(payload.totalUsd ?? payload.totalUsdFormatted ?? 0)
    const topPositions = Array.isArray(payload.topPositions)
      ? payload.topPositions
      : Array.isArray(payload.positions)
        ? payload.positions.slice(0, 3)
        : []
    const positions = Array.isArray(payload.positions) ? payload.positions : []
    const allPositions = Array.isArray(payload.allPositions) ? payload.allPositions : positions

    if (!Number.isFinite(total) && allPositions.length === 0) return null

    const formattedTotal = Number.isFinite(total)
      ? `$${total.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
      : '—'

    return {
      totalUsd: Number.isFinite(total) ? total : 0,
      totalUsdFormatted: formattedTotal,
      tokenCount: typeof payload.tokenCount === 'number' ? payload.tokenCount : allPositions.length,
      address: typeof payload.address === 'string' ? payload.address : undefined,
      fetchedAt: typeof payload.fetchedAt === 'string' ? payload.fetchedAt : new Date().toISOString(),
      positions,
      allPositions,
      topPositions,
      sources: Array.isArray(payload.sources) ? payload.sources : undefined,
      raw: payload.raw,
    }
  }, [payload])

  const [hideDust, setHideDust] = React.useState(true)
  const [showAll, setShowAll] = React.useState(false)

  React.useEffect(() => {
    if (collapsed) setShowAll(false)
  }, [collapsed])

  if (!summary) {
    if (!walletAddress) return <div className="text-sm text-slate-500">Connect your wallet to load portfolio data.</div>
    return <div className="text-sm text-slate-500">Loading portfolio…</div>
  }

  const dustThreshold = 1
  const allPositions = summary.allPositions || []
  const filtered = hideDust
    ? allPositions.filter((position: PortfolioPositionViewModel) => Number(position.usd || 0) >= dustThreshold)
    : allPositions
  const displayLimit = 8
  const displayed = showAll ? filtered : filtered.slice(0, displayLimit)

  const handleToggleDust = () => setHideDust((previous) => !previous)
  const handleToggleShowAll = () => setShowAll((previous) => !previous)

  return (
    <div className="space-y-4">
      <PortfolioInlineCard
        summary={summary}
        status="success"
        onOpenWorkspace={controls?.onExpand ?? (() => {})}
        description="Monitor top holdings and jump into expanded analysis when you need deeper allocation views."
      />

      {filtered.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white/75 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
            <span className="text-sm font-semibold text-slate-800">Positions</span>
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={handleToggleDust}
                className="rounded-full border border-slate-200 px-3 py-1 font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-800"
                title={hideDust ? 'Show tokens under $1' : 'Hide low-value tokens'}
              >
                {hideDust ? 'Dust hidden' : 'Dust shown'}
              </button>
              {filtered.length > displayLimit && (
                <button
                  type="button"
                  onClick={handleToggleShowAll}
                  className="rounded-full border border-slate-200 px-3 py-1 font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-800"
                >
                  {showAll ? `Show top ${displayLimit}` : `Show all (${filtered.length})`}
                </button>
              )}
            </div>
          </div>
          <div className="max-h-[320px] overflow-y-auto">
            <ul className="divide-y divide-slate-200 text-sm">
              {displayed.map((position, index) => {
                const usd = Number(position.usd || 0)
                const pct = summary.totalUsd > 0 ? Math.max(0, Math.min(100, (usd / summary.totalUsd) * 100)) : 0
                return (
                  <li key={`${position.symbol || position.sym || index}-${index}`} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-800">{position.sym || position.symbol || '—'}</div>
                      <div className="text-xs text-slate-500">
                        {position.name}
                        {position.network ? ` · ${position.network}` : ''}
                        {position.balanceFormatted ? ` · ${position.balanceFormatted}` : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-right">
                      <span className="text-xs text-slate-500">{Number.isFinite(pct) ? `${pct.toFixed(1)}%` : '—'}</span>
                      <span className="text-sm font-semibold text-slate-900">{position.usdFormatted ?? `$${usd.toLocaleString()}`}</span>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      )}

      {Array.isArray(summary.sources) && summary.sources.length > 0 && (
        <div className="flex flex-wrap gap-2 text-xs text-slate-500">
          <span>Sources:</span>
          {summary.sources.map((source: any) => (
            <a
              key={source?.name || source}
              href={source?.url || source?.href || '#'}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
            >
              {source?.name || source}
              <ExternalLink className="h-3 w-3" />
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
