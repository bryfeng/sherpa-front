import React from 'react'
import { ExternalLink, Layers } from 'lucide-react'

import type { PortfolioPositionViewModel, PortfolioSummaryViewModel } from '../../workspace/types'
import { PortfolioInlineCard } from '../conversation/PortfolioInlineCard'

function normalizeChainName(network: string | undefined): string {
  if (!network) return 'Unknown'
  const trimmed = network.trim()
  // Capitalize first letter
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase()
}

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

export function PortfolioOverview({
  payload,
  walletAddress,
  collapsed = false,
  controls,
}: PortfolioOverviewProps) {

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
  const [selectedChain, setSelectedChain] = React.useState<string>('all')

  React.useEffect(() => {
    if (collapsed) setShowAll(false)
  }, [collapsed])

  // Extract unique chains from positions with their totals
  const chainStats = React.useMemo(() => {
    const allPositions = summary?.allPositions || []
    const stats: Record<string, { count: number; totalUsd: number }> = {}

    for (const position of allPositions) {
      const chain = normalizeChainName(position.network)
      if (!stats[chain]) {
        stats[chain] = { count: 0, totalUsd: 0 }
      }
      stats[chain].count++
      stats[chain].totalUsd += Number(position.usd || 0)
    }

    // Sort by total USD descending
    return Object.entries(stats)
      .sort((a, b) => b[1].totalUsd - a[1].totalUsd)
      .map(([chain, data]) => ({ chain, ...data }))
  }, [summary?.allPositions])

  if (!summary) {
    if (!walletAddress) return <div className="text-sm text-slate-500">Connect your wallet to load portfolio data.</div>
    return <div className="text-sm text-slate-500">Loading portfolio…</div>
  }

  const dustThreshold = 1
  const allPositions = summary.allPositions || []

  // Apply chain filter first, then dust filter
  const chainFiltered = selectedChain === 'all'
    ? allPositions
    : allPositions.filter((position: PortfolioPositionViewModel) =>
        normalizeChainName(position.network) === selectedChain
      )

  const filtered = hideDust
    ? chainFiltered.filter((position: PortfolioPositionViewModel) => Number(position.usd || 0) >= dustThreshold)
    : chainFiltered

  // Calculate filtered total for display
  const filteredTotal = chainFiltered.reduce((sum, pos) => sum + Number(pos.usd || 0), 0)

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

      {/* Chain Filter Tabs - filter positions by chain within current data */}
      {chainStats.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedChain('all')}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
              selectedChain === 'all'
                ? 'bg-[var(--accent)] text-[var(--text-inverse)] shadow-sm'
                : 'border border-[var(--line)] bg-[var(--surface)] text-[var(--text-muted)] hover:bg-[var(--hover)] hover:text-[var(--text)]'
            }`}
          >
            <Layers className="h-3 w-3" />
            All Chains
            <span className={`ml-0.5 ${selectedChain === 'all' ? 'text-white/80' : 'text-[var(--text-muted)]'}`}>
              ({allPositions.length})
            </span>
          </button>
          {chainStats.map(({ chain, count, totalUsd }) => (
            <button
              key={chain}
              type="button"
              onClick={() => setSelectedChain(chain)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                selectedChain === chain
                  ? 'bg-[var(--accent)] text-[var(--text-inverse)] shadow-sm'
                  : 'border border-[var(--line)] bg-[var(--surface)] text-[var(--text-muted)] hover:bg-[var(--hover)] hover:text-[var(--text)]'
              }`}
              title={`$${totalUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            >
              {chain}
              <span className={`ml-0.5 ${selectedChain === chain ? 'text-white/80' : 'text-[var(--text-muted)]'}`}>
                ({count})
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Selected Chain Total (when filtered) */}
      {selectedChain !== 'all' && (
        <div className="flex items-center justify-between rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-4 py-2">
          <span className="text-xs text-[var(--text-muted)]">{selectedChain} Total</span>
          <span className="text-sm font-semibold text-[var(--text)]">
            ${filteredTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </span>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white/75 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
            <span className="text-sm font-semibold text-slate-800">
              {selectedChain === 'all' ? 'Positions' : `${selectedChain} Positions`}
            </span>
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
                        {selectedChain === 'all' && position.network ? ` · ${normalizeChainName(position.network)}` : ''}
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
