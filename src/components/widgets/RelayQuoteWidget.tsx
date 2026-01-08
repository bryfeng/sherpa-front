import React from 'react'
import { ChevronDown, ChevronRight, ChevronUp, GripVertical, MessageSquarePlus, Maximize2, Repeat } from 'lucide-react'
import type { Widget } from '../../types/widgets'
import { ErrorView } from '../ErrorView'
import { relayQuoteThemes } from './relay-quote-theme'
import { PolicyCheckList } from '../policy/PolicyCheckList'
import { usePolicyEvaluation } from '../../hooks/usePolicyEvaluation'
import { extractTransactionIntent } from '../../utils/extractTransactionIntent'

type RelayQuoteWidgetProps = {
  panel: Widget
  walletAddress?: string
  walletReady?: boolean
  onExecuteQuote?: (panel: Widget) => Promise<string | void>
  onRefreshQuote?: () => Promise<void>
  onInsertQuickPrompt?: (prompt: string) => void
  controls?: {
    collapsed: boolean
    onToggleCollapse: () => void
    onExpand: () => void
  }
}

function RelayQuoteWidgetComponent({
  panel,
  walletAddress,
  walletReady = false,
  onExecuteQuote,
  onRefreshQuote,
  onInsertQuickPrompt,
  controls,
}: RelayQuoteWidgetProps) {
  const payload = panel.payload || {}
  const breakdown = payload.breakdown || {}
  const output = breakdown.output || {}
  const fees = breakdown.fees || {}
  const instructions: string[] = Array.isArray(payload.instructions)
    ? payload.instructions.map((entry: any) => String(entry))
    : []
  const issues = Array.isArray(payload.issues) ? payload.issues : []
  const actions = payload.actions && typeof payload.actions === 'object' ? payload.actions : null
  const quickPrompts = actions
    ? Object.entries(actions)
        .map(([key, value]) => ({ key, label: String(value || '').trim() }))
        .filter((entry) => entry.label.length > 0)
    : []
  const etaSeconds = typeof breakdown.eta_seconds === 'number' ? breakdown.eta_seconds : undefined
  const quoteWallet = typeof payload.wallet?.address === 'string' ? payload.wallet.address : undefined

  const quoteType = typeof payload.quote_type === 'string'
    ? payload.quote_type.toLowerCase()
    : panel.id === 'relay_swap_quote'
      ? 'swap'
      : 'bridge'
  const isSwap = quoteType === 'swap'
  const actionVerb = isSwap ? 'swap' : 'bridge'
  const actionVerbCapitalized = isSwap ? 'Swap' : 'Bridge'
  const actionGerund = isSwap ? 'swapping' : 'bridging'
  const sendingLabel = isSwap ? 'Swapping…' : 'Bridging…'

  const [sending, setSending] = React.useState(false)
  const [refreshing, setRefreshing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [txHash, setTxHash] = React.useState<string | null>(null)
  const [showInstructions, setShowInstructions] = React.useState(false)
  const [showQuickPrompts, setShowQuickPrompts] = React.useState(false)

  // Policy evaluation
  const transactionIntent = React.useMemo(() => extractTransactionIntent(panel), [panel])
  const policyResult = usePolicyEvaluation({
    walletAddress: walletAddress || null,
    intent: transactionIntent,
  })

  const expiryRaw = payload.quote_expiry
  let expiryMs: number | undefined
  if (typeof expiryRaw === 'string') {
    const parsed = Date.parse(expiryRaw)
    if (!Number.isNaN(parsed)) expiryMs = parsed
  } else if (expiryRaw) {
    const isoCandidate = expiryRaw.iso || expiryRaw.ISO
    if (isoCandidate) {
      const parsed = Date.parse(String(isoCandidate))
      if (!Number.isNaN(parsed)) expiryMs = parsed
    }
    if (typeof expiryMs === 'undefined') {
      const epochCandidate = expiryRaw.epoch ?? expiryRaw.EPOCH
      if (typeof epochCandidate !== 'undefined') {
        const epochNum = Number(epochCandidate)
        if (Number.isFinite(epochNum)) {
          expiryMs = epochNum > 1e12 ? epochNum : epochNum * 1000
        }
      }
    }
  }

  const expiryDate = typeof expiryMs === 'number' ? new Date(expiryMs) : undefined
  const expired = typeof expiryMs === 'number' ? expiryMs <= Date.now() : false

  const walletMismatch = Boolean(
    walletAddress && quoteWallet && walletAddress.toLowerCase() !== quoteWallet.toLowerCase(),
  )

  const numeric = (value: any): number | undefined => {
    if (typeof value === 'number') return value
    if (typeof value === 'string' && value.trim().length) {
      const parsed = Number(value)
      if (Number.isFinite(parsed)) return parsed
    }
    return undefined
  }

  const formatUsd = (value: any): string => {
    const num = numeric(value)
    if (typeof num !== 'number') return '—'
    const abs = Math.abs(num)
    const options: Intl.NumberFormatOptions = abs >= 1
      ? { minimumFractionDigits: 2, maximumFractionDigits: 2 }
      : { minimumFractionDigits: 2, maximumFractionDigits: 4 }
    return `$${num.toLocaleString(undefined, options)}`
  }

  const outputEstimate = (() => {
    const amount = output.amount_estimate || output.amount || payload.output?.amount
    const symbol = output.symbol || payload.output?.token?.symbol
    if (!amount) return symbol ? `— ${symbol}` : '—'
    const amountNum = numeric(amount)
    const displayed = typeof amountNum === 'number'
      ? amountNum.toLocaleString(undefined, { maximumFractionDigits: 6 })
      : String(amount)
    return symbol ? `${displayed} ${symbol}` : displayed
  })()

  const outputUsd = payload.usd_estimates?.output || output.value_usd
  const gasUsd = payload.usd_estimates?.gas || fees.gas_usd

  const formatEta = (seconds?: number) => {
    if (!seconds || seconds <= 0) return '—'
    if (seconds < 60) return `${Math.round(seconds)}s`
    const minutes = Math.round(seconds / 60)
    if (minutes < 60) return `${minutes} min`
    const hours = Math.round(minutes / 60)
    if (hours < 24) return `${hours} hr`
    const days = Math.round(hours / 24)
    return `${days} day${days > 1 ? 's' : ''}`
  }

  const formatExpiry = () => {
    if (!expiryMs) return '—'
    const delta = expiryMs - Date.now()
    const abs = Math.abs(delta)
    const direction = delta >= 0 ? 'in ' : ''
    if (abs < 60_000) return delta >= 0 ? 'in under a minute' : 'expired just now'
    const minutes = Math.round(abs / 60_000)
    if (minutes < 60) return `${direction}${minutes} min${delta < 0 ? ' ago' : ''}`
    const hours = Math.round(minutes / 60)
    if (hours < 24) return `${direction}${hours} hr${delta < 0 ? ' ago' : ''}`
    const days = Math.round(hours / 24)
    return `${direction}${days} day${days > 1 ? 's' : ''}${delta < 0 ? ' ago' : ''}`
  }

  const disableReason = (() => {
    if (!walletReady) return `Connect a wallet to ${actionVerb}.`
    if (!payload.tx) return 'Quote did not include a prepared transaction.'
    if (payload.status !== 'ok') return 'Quote is incomplete. Ask for a refresh.'
    if (expired) return `Quote expired. Refresh before ${actionGerund}.`
    if (walletMismatch) return 'Connect the wallet that requested this quote.'
    if (!policyResult.canProceed) return 'Policy check failed. Review issues below.'
    return null
  })()

  const canExecute = !disableReason && Boolean(onExecuteQuote)

  const handleExecuteClick = async () => {
    if (!onExecuteQuote || !canExecute) return
    setSending(true)
    setError(null)
    setTxHash(null)
    try {
      const result = await onExecuteQuote(panel)
      if (typeof result === 'string' && result) setTxHash(result)
    } catch (err: any) {
      setError(err?.message || `${actionVerbCapitalized} transaction failed.`)
    } finally {
      setSending(false)
    }
  }

  const handleRefresh = async () => {
    if (!onRefreshQuote) return
    setRefreshing(true)
    setError(null)
    try {
      await onRefreshQuote()
    } catch (err: any) {
      setError(err?.message || 'Failed to refresh quote.')
    } finally {
      setRefreshing(false)
    }
  }

  const hopCount = Array.isArray(payload?.routes)
    ? payload.routes.length
    : Array.isArray(payload?.path)
      ? payload.path.length
      : undefined

  const theme = relayQuoteThemes[isSwap ? 'swap' : 'bridge']
  const collapsed = Boolean(controls?.collapsed)

  const overlayElements = theme.overlays.map((cls, idx) => (
    <div key={idx} className={`pointer-events-none ${cls}`} />
  ))

  const truncatedWallet = quoteWallet
    ? `${quoteWallet.slice(0, 6)}…${quoteWallet.slice(-4)}`
    : '—'

  const StatCard = ({
    label,
    value,
    helper,
    tone = 'neutral',
  }: {
    label: React.ReactNode
    value: React.ReactNode
    helper?: React.ReactNode
    tone?: 'neutral' | 'danger'
  }) => (
    <div className={theme.statCard}>
      <div className={theme.statLabel}>{label}</div>
      <div className={`${theme.statValue} ${tone === 'danger' ? theme.accent.negative : 'text-white'}`}>{value}</div>
      {helper && (
        <div className={`${theme.statHelper} ${tone === 'danger' ? theme.accent.negative : ''}`}>{helper}</div>
      )}
    </div>
  )

  const metaChips: Array<string> = []
  if (isSwap) metaChips.push('Swap')
  else metaChips.push('Bridge')
  if (hopCount) metaChips.push(`${hopCount} hop${hopCount > 1 ? 's' : ''}`)
  if (payload?.chain) metaChips.push(String(payload.chain))
  else if (payload?.network) metaChips.push(String(payload.network))

  return (
    <div className={`relative overflow-hidden ${theme.container}`}>
      <div className={`pointer-events-none absolute inset-0 rounded-[inherit] border ${theme.border}`} />
      {controls && (
        <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
          <div className={`${theme.ghostAction} h-9 w-9 items-center justify-center`} title="Reorder">
            <GripVertical className="h-4 w-4" />
          </div>
          <button
            type="button"
            onClick={controls.onToggleCollapse}
            className={`${theme.ghostAction} h-9 w-9 items-center justify-center`}
            title={controls.collapsed ? 'Expand panel' : 'Minimize panel'}
          >
            {controls.collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={controls.onExpand}
            className={`${theme.ghostAction} h-9 w-9 items-center justify-center`}
            title="Expand"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      )}
      {overlayElements}
      <div className="relative space-y-4 text-sm text-white/85">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className={`text-[11px] uppercase tracking-[0.28em] ${theme.label}`}>
              {isSwap ? 'Swap quote' : 'Bridge quote'}
            </div>
            <div className="mt-2 text-2xl font-semibold text-white">
              {payload?.title || 'Relay execution summary'}
            </div>
            <div className={`mt-1 text-xs ${theme.helper}`}>
              {payload?.description
                || (isSwap
                  ? 'Sherpa tuned a best-route swap path ready for Relay.'
                  : 'Sherpa tuned a best-route bridge path ready for Relay.')}
            </div>
          </div>
          {metaChips.length > 0 && (
            <div className={`flex flex-wrap justify-end gap-2 ${collapsed ? 'opacity-80' : ''}`}>
              {metaChips.map((chip, idx) => (
                <span key={idx} className={theme.metaChip}>
                  {chip}
                </span>
              ))}
            </div>
          )}
        </div>

        {collapsed ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <StatCard label="Estimated Output" value={outputEstimate} helper={outputUsd ? formatUsd(outputUsd) : undefined} />
            <StatCard
              label="Quote Expiry"
              value={expiryDate ? expiryDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '—'}
              helper={expiryMs ? formatExpiry() : undefined}
              tone={expired ? 'danger' : 'neutral'}
            />
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <StatCard label="Estimated Output" value={outputEstimate} helper={outputUsd ? formatUsd(outputUsd) : undefined} />
            <StatCard
              label="Fees"
              value={formatUsd(gasUsd)}
              helper={typeof fees.slippage_percent === 'number' ? `Slippage ${fees.slippage_percent}%` : undefined}
            />
            <StatCard
              label="ETA"
              value={formatEta(etaSeconds)}
              helper={hopCount ? `${hopCount} step path` : undefined}
            />
            <StatCard
              label="Quote Expiry"
              value={expiryDate ? expiryDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '—'}
              helper={expiryMs ? formatExpiry() : undefined}
              tone={expired ? 'danger' : 'neutral'}
            />
          </div>
        )}

        {collapsed ? (
          <div className={`${theme.summaryCard} ${walletMismatch ? 'border-amber-400 bg-amber-300/25 text-amber-100' : ''}`}>
            <div className={`${theme.statLabel} text-[10px]`}>Destination Wallet</div>
            <div className={theme.summaryValue}>{truncatedWallet}</div>
          </div>
        ) : (
          <div className={`${theme.section} ${walletMismatch ? 'border-amber-400 bg-amber-300/20 text-amber-100' : ''}`}>
            <div className={`text-[11px] uppercase tracking-[0.2em] ${walletMismatch ? 'text-amber-100' : theme.label}`}>
              Destination Wallet
            </div>
            <div className="mt-2 break-all font-mono text-sm text-white">{quoteWallet || '—'}</div>
            {walletMismatch && (
              <div className="mt-2 text-xs">
                Connected wallet differs from the quote wallet. Switch wallets before {actionGerund}.
              </div>
            )}
          </div>
        )}

        {collapsed && walletMismatch && (
          <div className="text-[10px] text-amber-200/80">Switch wallets before {actionGerund}.</div>
        )}

        {collapsed && (instructions.length > 0 || quickPrompts.length > 0) && (
          <div className="flex flex-wrap gap-2 text-[10px] text-white/75">
            {instructions.length > 0 && (
              <span className={theme.metaChip}>Instructions {instructions.length}</span>
            )}
            {quickPrompts.length > 0 && (
              <span className={theme.metaChip}>Prompts {quickPrompts.length}</span>
            )}
          </div>
        )}

        {issues.length > 0 && (
          <div className={theme.warningSection}>
            <div className="font-semibold uppercase tracking-wide">Needs attention</div>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              {issues.map((issue: any, idx: number) => (
                <li key={idx}>{String(issue)}</li>
              ))}
            </ul>
          </div>
        )}

        {!collapsed && instructions.length > 0 && (
          <div className={`${theme.section} space-y-3`}>
            <div className="flex items-center justify-between gap-2">
              <div className={`text-[11px] uppercase tracking-[0.2em] ${theme.label}`}>Instructions</div>
              <button
                type="button"
                onClick={() => setShowInstructions((value) => !value)}
                className={`${theme.chip.base} ${showInstructions ? theme.chip.active : ''}`}
                aria-expanded={showInstructions}
              >
                {showInstructions ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                {showInstructions ? 'Hide' : `${instructions.length}`}
              </button>
            </div>
            {!showInstructions && instructions[0] && (
              <div className={`truncate text-xs ${theme.helper}`}>{instructions[0]}</div>
            )}
            {showInstructions && (
              <ul className="space-y-2 text-sm text-white/90">
                {instructions.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-white/60" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {!collapsed && quickPrompts.length > 0 && (
          <div className={`${theme.section} space-y-3`}>
            <div className="flex items-center justify-between gap-2">
              <div className={`text-[11px] uppercase tracking-[0.2em] ${theme.label}`}>Quick prompts</div>
              <button
                type="button"
                onClick={() => setShowQuickPrompts((value) => !value)}
                className={`${theme.chip.base} ${showQuickPrompts ? theme.chip.active : ''}`}
                aria-expanded={showQuickPrompts}
              >
                {showQuickPrompts ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                {showQuickPrompts ? 'Hide' : `${quickPrompts.length}`}
              </button>
            </div>
            {!showQuickPrompts && quickPrompts[0] && (
              <div className={`truncate text-xs ${theme.helper}`}>{quickPrompts[0].label}</div>
            )}
            {showQuickPrompts && (
              <div className="flex flex-wrap gap-2">
                {quickPrompts.map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    className={`${theme.promptPill} max-w-[220px] truncate`}
                    onClick={() => {
                      if (onInsertQuickPrompt) onInsertQuickPrompt(label)
                    }}
                    title={label}
                  >
                    <MessageSquarePlus className="h-3.5 w-3.5" />
                    <span className="truncate">{label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Policy Check - Compact for collapsed, full for expanded */}
        {walletReady && transactionIntent && policyResult.checks.length > 0 && (
          <PolicyCheckList
            result={policyResult}
            compact={collapsed}
          />
        )}

        {!collapsed && (
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className={theme.actionPrimary}
              onClick={handleExecuteClick}
              disabled={!canExecute || sending}
            >
              {sending ? sendingLabel : actionVerbCapitalized}
            </button>
            {onRefreshQuote && (
              <button
                type="button"
                className={theme.actionSecondary}
                onClick={handleRefresh}
                disabled={refreshing}
              >
                {refreshing ? 'Refreshing…' : (
                  <>
                    <Repeat className="h-4 w-4" />
                    Refresh Quote
                  </>
                )}
              </button>
            )}
            {disableReason && <span className={`text-xs ${theme.helper}`}>{disableReason}</span>}
          </div>
        )}
        {collapsed && disableReason && (
          <div className={`text-xs ${theme.helper}`}>{disableReason}</div>
        )}

        {error && (
          <ErrorView
            message={error}
            onRetry={onRefreshQuote ? handleRefresh : undefined}
            retryLabel={refreshing ? 'Refreshing…' : 'Retry'}
            className={theme.section}
          />
        )}
        {txHash && (
          <div className={`${theme.section} text-xs ${theme.successText}`}>
            Transaction submitted: <code className="font-mono">{txHash}</code>
          </div>
        )}
      </div>
    </div>
  )
}

export const RelayQuoteWidget = React.memo(RelayQuoteWidgetComponent)

RelayQuoteWidget.displayName = 'RelayQuoteWidget'

export default RelayQuoteWidget

export type { RelayQuoteWidgetProps }
