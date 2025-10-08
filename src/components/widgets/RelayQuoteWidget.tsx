import React from 'react'
import { ChevronRight, ChevronUp, MessageSquarePlus, Repeat } from 'lucide-react'
import type { Panel } from '../../pages/DeFiChatAdaptiveUI'
import {
  WidgetButton,
  WidgetSection,
  WidgetStat,
  WidgetStatGrid,
} from './widget-kit'

type RelayQuoteWidgetProps = {
  panel: Panel
  walletAddress?: string
  walletReady?: boolean
  onExecuteQuote?: (panel: Panel) => Promise<string | void>
  onRefreshQuote?: () => Promise<void>
  onInsertQuickPrompt?: (prompt: string) => void
}

export function RelayQuoteWidget({
  panel,
  walletAddress,
  walletReady = false,
  onExecuteQuote,
  onRefreshQuote,
  onInsertQuickPrompt,
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

  return (
    <div className="space-y-4 text-sm text-slate-700">
      <WidgetStatGrid columns={2}>
        <WidgetStat
          label="Estimated Output"
          value={outputEstimate}
          helper={outputUsd ? formatUsd(outputUsd) : undefined}
          helperTone="default"
        />
        <WidgetStat
          label="Fees"
          value={formatUsd(gasUsd)}
          helper={typeof fees.slippage_percent !== 'undefined' && fees.slippage_percent !== null ? `Slippage ${fees.slippage_percent}%` : undefined}
        />
        <WidgetStat label="ETA" value={formatEta(etaSeconds)} />
        <WidgetStat
          label="Quote Expiry"
          value={
            <span className={expired ? 'text-rose-600' : ''}>
              {expiryDate ? expiryDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '—'}
            </span>
          }
          helper={expiryMs ? (
            <span className={expired ? 'text-rose-600' : ''}>{formatExpiry()}</span>
          ) : undefined}
          helperTone="default"
          tone={expired ? 'danger' : 'default'}
        />
      </WidgetStatGrid>

      <WidgetSection tone={walletMismatch ? 'warning' : 'default'}>
        <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Destination Wallet</div>
        <div className="mt-1 break-all font-mono text-sm text-slate-900">{quoteWallet || '—'}</div>
        {walletMismatch && (
          <div className="mt-1 text-xs text-amber-700">Connected wallet differs from the quote wallet. Switch wallets before {actionGerund}.</div>
        )}
      </WidgetSection>

      {issues.length > 0 && (
        <WidgetSection tone="warning" className="text-xs">
          <div className="font-semibold">Needs attention</div>
          <ul className="mt-2 list-disc space-y-1 pl-4">
            {issues.map((issue: any, idx: number) => (
              <li key={idx}>{String(issue)}</li>
            ))}
          </ul>
        </WidgetSection>
      )}

      {instructions.length > 0 && (
        <WidgetSection>
          <div className="flex items-center justify-between gap-2">
            <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Instructions</div>
            <WidgetButton
              variant="secondary"
              size="sm"
              className="bg-slate-50 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-100"
              onClick={() => setShowInstructions((value) => !value)}
              aria-expanded={showInstructions}
            >
              {showInstructions ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              {showInstructions ? 'Hide' : `${instructions.length}`}
            </WidgetButton>
          </div>
          {!showInstructions && instructions[0] && (
            <div className="mt-2 truncate text-xs text-slate-500">{instructions[0]}</div>
          )}
          {showInstructions && (
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              {instructions.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
        </WidgetSection>
      )}

      {quickPrompts.length > 0 && (
        <WidgetSection>
          <div className="flex items-center justify-between gap-2">
            <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Quick Prompts</div>
            <WidgetButton
              variant="secondary"
              size="sm"
              className="bg-slate-50 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-100"
              onClick={() => setShowQuickPrompts((value) => !value)}
              aria-expanded={showQuickPrompts}
            >
              {showQuickPrompts ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              {showQuickPrompts ? 'Hide' : `${quickPrompts.length}`}
            </WidgetButton>
          </div>
          {!showQuickPrompts && quickPrompts[0] && (
            <div className="mt-2 truncate text-xs text-slate-500">{quickPrompts[0].label}</div>
          )}
          {showQuickPrompts && (
            <div className="mt-3 flex flex-wrap gap-2">
              {quickPrompts.map(({ key, label }) => (
                <WidgetButton
                  key={key}
                  variant="secondary"
                  size="sm"
                  className="max-w-[220px] truncate bg-slate-50 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100"
                  onClick={() => {
                    if (onInsertQuickPrompt) onInsertQuickPrompt(label)
                  }}
                  title={label}
                >
                  <MessageSquarePlus className="h-3.5 w-3.5 text-slate-500" />
                  <span className="truncate">{label}</span>
                </WidgetButton>
              ))}
            </div>
          )}
        </WidgetSection>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <WidgetButton
          variant="primary"
          size="md"
          className="rounded-xl px-4"
          onClick={handleExecuteClick}
          disabled={!canExecute || sending}
        >
          {sending ? sendingLabel : actionVerbCapitalized}
        </WidgetButton>
        {onRefreshQuote && (
          <WidgetButton
            variant="secondary"
            size="md"
            className="rounded-xl px-4"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? 'Refreshing…' : (
              <span className="inline-flex items-center gap-2">
                <Repeat className="h-4 w-4" />
                Refresh Quote
              </span>
            )}
          </WidgetButton>
        )}
        {disableReason && <span className="text-xs text-slate-500">{disableReason}</span>}
      </div>

      {error && (
        <WidgetSection tone="danger" padding="sm" className="text-xs">
          {error}
        </WidgetSection>
      )}
      {txHash && (
        <WidgetSection tone="accent" padding="sm" className="text-xs">
          Transaction submitted: <code>{txHash}</code>
        </WidgetSection>
      )}
    </div>
  )
}

export type { RelayQuoteWidgetProps }
