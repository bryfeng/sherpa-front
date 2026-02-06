/**
 * Intent Progress Card
 *
 * Displays a single Smart Session intent with status timeline,
 * token flow visualization, and transaction details.
 */

import React from 'react'
import {
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowRight,
  ExternalLink,
  AlertCircle,
} from 'lucide-react'
import type { SmartSessionIntent } from '../../types/smart-session-intent'
import {
  INTENT_STATUS_COLORS,
  INTENT_STATUS_LABELS,
  INTENT_TYPE_LABELS,
} from '../../types/smart-session-intent'
import { getIntentProgress } from '../../hooks/useSmartSessionIntents'

// ============================================
// TYPES
// ============================================

interface IntentProgressCardProps {
  intent: SmartSessionIntent
  onViewDetails?: (id: string) => void
  compact?: boolean
}

// ============================================
// HELPERS
// ============================================

function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp

  if (diff < 60000) return 'Just now'
  if (diff < 3600000) {
    const mins = Math.round(diff / 60000)
    return `${mins}m ago`
  }
  if (diff < 86400000) {
    const hours = Math.round(diff / 3600000)
    return `${hours}h ago`
  }
  const days = Math.round(diff / 86400000)
  return `${days}d ago`
}

function formatUsd(amount: number | undefined): string {
  if (amount === undefined) return '-'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

function truncateTxHash(hash: string): string {
  if (hash.length <= 14) return hash
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`
}

function getExplorerUrl(txHash: string, chainId: number): string {
  const explorers: Record<number, string> = {
    1: 'https://etherscan.io/tx/',
    8453: 'https://basescan.org/tx/',
    10: 'https://optimistic.etherscan.io/tx/',
    42161: 'https://arbiscan.io/tx/',
    137: 'https://polygonscan.com/tx/',
  }
  const baseUrl = explorers[chainId] || 'https://etherscan.io/tx/'
  return `${baseUrl}${txHash}`
}

function formatTokenAmount(amount: string, symbol: string): string {
  const num = parseFloat(amount)
  if (num === 0) return `0 ${symbol}`
  if (num < 0.0001) return `<0.0001 ${symbol}`
  if (num < 1) return `${num.toFixed(4)} ${symbol}`
  if (num < 1000) return `${num.toFixed(2)} ${symbol}`
  return `${num.toLocaleString('en-US', { maximumFractionDigits: 2 })} ${symbol}`
}

// ============================================
// STATUS ICON
// ============================================

function StatusIcon({ status }: { status: SmartSessionIntent['status'] }) {
  switch (status) {
    case 'pending':
      return <Clock className="h-4 w-4" />
    case 'executing':
    case 'confirming':
      return <Loader2 className="h-4 w-4 animate-spin" />
    case 'completed':
      return <CheckCircle2 className="h-4 w-4" />
    case 'failed':
      return <XCircle className="h-4 w-4" />
    default:
      return <AlertCircle className="h-4 w-4" />
  }
}

// ============================================
// PROGRESS TIMELINE
// ============================================

function ProgressTimeline({ intent }: { intent: SmartSessionIntent }) {
  const steps = [
    { key: 'created', label: 'Created', timestamp: intent.createdAt },
    { key: 'submitted', label: 'Submitted', timestamp: intent.submittedAt },
    { key: 'confirmed', label: 'Confirmed', timestamp: intent.confirmedAt },
  ]

  const currentStepIndex =
    intent.status === 'pending'
      ? 0
      : intent.status === 'executing'
        ? 0
        : intent.status === 'confirming'
          ? 1
          : intent.status === 'completed' || intent.status === 'failed'
            ? 2
            : 0

  return (
    <div className="flex items-center gap-2 mt-3">
      {steps.map((step, index) => {
        const isCompleted = index <= currentStepIndex && step.timestamp
        const isCurrent = index === currentStepIndex && intent.status !== 'completed' && intent.status !== 'failed'
        const isFailed = intent.status === 'failed' && index === currentStepIndex

        return (
          <React.Fragment key={step.key}>
            <div className="flex flex-col items-center">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
                style={{
                  background: isCompleted
                    ? 'var(--success)'
                    : isFailed
                      ? 'var(--error)'
                      : isCurrent
                        ? 'var(--accent)'
                        : 'var(--surface-2)',
                  color: isCompleted || isCurrent || isFailed ? 'white' : 'var(--text-muted)',
                }}
              >
                {isCurrent && !isFailed ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : isCompleted ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : isFailed ? (
                  <XCircle className="h-3 w-3" />
                ) : (
                  index + 1
                )}
              </div>
              <span
                className="text-xs mt-1"
                style={{ color: isCompleted || isCurrent ? 'var(--text)' : 'var(--text-muted)' }}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className="flex-1 h-0.5 -mt-4"
                style={{
                  background: index < currentStepIndex ? 'var(--success)' : 'var(--line)',
                }}
              />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

// ============================================
// TOKEN FLOW
// ============================================

function TokenFlow({ intent }: { intent: SmartSessionIntent }) {
  if (!intent.tokenIn || !intent.tokenOut) return null

  return (
    <div className="flex items-center gap-3 mt-3 p-3 rounded-lg" style={{ background: 'var(--surface-2)' }}>
      {/* Token In */}
      <div className="flex-1">
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          From
        </p>
        <p className="font-medium" style={{ color: 'var(--text)' }}>
          {formatTokenAmount(intent.tokenIn.amount, intent.tokenIn.symbol)}
        </p>
      </div>

      {/* Arrow */}
      <ArrowRight className="h-4 w-4 shrink-0" style={{ color: 'var(--text-muted)' }} />

      {/* Token Out */}
      <div className="flex-1 text-right">
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          To
        </p>
        <p className="font-medium" style={{ color: 'var(--text)' }}>
          {intent.tokenOut.amount
            ? formatTokenAmount(intent.tokenOut.amount, intent.tokenOut.symbol)
            : intent.tokenOut.symbol}
        </p>
      </div>
    </div>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================

export function IntentProgressCard({ intent, onViewDetails, compact = false }: IntentProgressCardProps) {
  const statusColor = INTENT_STATUS_COLORS[intent.status]
  const progress = getIntentProgress(intent.status)

  if (compact) {
    return (
      <div
        className="px-4 py-3 hover:bg-black/5 transition-colors cursor-pointer"
        onClick={() => onViewDetails?.(intent._id)}
      >
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
            style={{ background: `${statusColor}20`, color: statusColor }}
          >
            <StatusIcon status={intent.status} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-sm" style={{ color: 'var(--text)' }}>
                {INTENT_TYPE_LABELS[intent.intentType]}
              </span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {formatRelativeTime(intent.createdAt)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 mt-1">
              <span
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs"
                style={{ background: `${statusColor}20`, color: statusColor }}
              >
                <StatusIcon status={intent.status} />
                {INTENT_STATUS_LABELS[intent.status]}
              </span>

              {intent.estimatedValueUsd && (
                <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                  {formatUsd(intent.estimatedValueUsd)}
                </span>
              )}
            </div>

            {intent.txHash && (
              <a
                href={getExplorerUrl(intent.txHash, intent.chainId)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-1.5 text-xs hover:underline"
                style={{ color: 'var(--accent)' }}
                onClick={(e) => e.stopPropagation()}
              >
                {truncateTxHash(intent.txHash)}
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="rounded-lg p-4 transition-colors"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--line)',
      }}
      onClick={() => onViewDetails?.(intent._id)}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: `${statusColor}20`, color: statusColor }}
          >
            <StatusIcon status={intent.status} />
          </div>
          <div>
            <h3 className="font-medium" style={{ color: 'var(--text)' }}>
              {INTENT_TYPE_LABELS[intent.intentType]}
            </h3>
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs mt-1"
              style={{ background: `${statusColor}20`, color: statusColor }}
            >
              {INTENT_STATUS_LABELS[intent.status]}
            </span>
          </div>
        </div>

        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {formatRelativeTime(intent.createdAt)}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="h-1.5 rounded-full overflow-hidden mb-3" style={{ background: 'var(--surface-2)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${progress}%`,
            background: intent.status === 'failed' ? 'var(--error)' : 'var(--success)',
          }}
        />
      </div>

      {/* Token Flow */}
      <TokenFlow intent={intent} />

      {/* Progress Timeline */}
      <ProgressTimeline intent={intent} />

      {/* Details */}
      <div className="grid grid-cols-2 gap-3 mt-4 pt-3" style={{ borderTop: '1px solid var(--line)' }}>
        <div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Estimated
          </p>
          <p className="font-medium" style={{ color: 'var(--text)' }}>
            {formatUsd(intent.estimatedValueUsd)}
          </p>
        </div>

        <div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Actual
          </p>
          <p className="font-medium" style={{ color: 'var(--text)' }}>
            {formatUsd(intent.actualValueUsd)}
          </p>
        </div>

        {intent.gasUsd !== undefined && (
          <div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Gas Cost
            </p>
            <p className="font-medium" style={{ color: 'var(--text)' }}>
              {formatUsd(intent.gasUsd)}
            </p>
          </div>
        )}

        {intent.txHash && (
          <div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Transaction
            </p>
            <a
              href={getExplorerUrl(intent.txHash, intent.chainId)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium hover:underline"
              style={{ color: 'var(--accent)' }}
            >
              {truncateTxHash(intent.txHash)}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}
      </div>

      {/* Error Message */}
      {intent.errorMessage && (
        <div
          className="mt-3 p-3 rounded-lg"
          style={{ background: 'var(--error-muted)', border: '1px solid var(--error)' }}
        >
          <p className="text-sm" style={{ color: 'var(--error)' }}>
            {intent.errorMessage}
          </p>
        </div>
      )}
    </div>
  )
}

export default IntentProgressCard
