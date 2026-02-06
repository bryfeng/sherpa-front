/**
 * Transaction History Widget
 *
 * Displays recent transactions, strategy executions, and smart session intents for a wallet.
 */

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  ExternalLink,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Zap,
} from 'lucide-react'
import { useAccount } from 'wagmi'
import {
  useRecentActivity,
  formatTransactionType,
  formatTransactionStatus,
  formatExecutionState,
  formatRelativeTime,
  formatUsdValue,
  truncateTxHash,
  getExplorerUrl,
  getTransactionStatusColor,
  getExecutionStateColor,
  type Transaction,
  type StrategyExecution,
  type TransactionType,
} from '../../hooks/useTransactionHistory'
import { useSmartSessionIntents, usePendingIntentsCount } from '../../hooks/useSmartSessionIntents'
import { IntentProgressCard } from '../intents/IntentProgressCard'
import type { SmartSessionIntent } from '../../types/smart-session-intent'

type FilterType = 'all' | 'transactions' | 'executions' | 'intents'

const FILTER_OPTIONS: Array<{ value: FilterType; label: string }> = [
  { value: 'all', label: 'All Activity' },
  { value: 'transactions', label: 'Transactions' },
  { value: 'executions', label: 'Executions' },
  { value: 'intents', label: 'Intents' },
]

const TYPE_ICONS: Record<TransactionType, React.ReactNode> = {
  swap: <RefreshCw className="h-4 w-4" />,
  bridge: <ArrowUpRight className="h-4 w-4" />,
  transfer: <ArrowDownRight className="h-4 w-4" />,
  approve: <CheckCircle2 className="h-4 w-4" />,
}

export function TransactionHistoryWidget() {
  const { address } = useAccount()
  const [filter, setFilter] = useState<FilterType>('all')
  const { items, isLoading, isEmpty: _isEmpty } = useRecentActivity(address ?? null, 50)

  // Smart session intents (using wallet address as smart account address for now)
  // In production, this would use the actual smart account address
  const { intents, isLoading: intentsLoading } = useSmartSessionIntents({
    smartAccountAddress: address ?? null,
    limit: 50,
  })
  const { count: pendingIntentsCount } = usePendingIntentsCount(address ?? null)

  // Merge all items for "all" view
  const allItems = useMemo(() => {
    if (filter === 'intents') {
      return intents.map((intent) => ({
        id: `intent-${intent._id}`,
        type: 'intent' as const,
        timestamp: intent.createdAt,
        data: intent,
      }))
    }

    const baseItems = items.map((item) => ({
      ...item,
      type: item.type as 'transaction' | 'execution',
    }))

    if (filter === 'all') {
      const intentItems = intents.map((intent) => ({
        id: `intent-${intent._id}`,
        type: 'intent' as const,
        timestamp: intent.createdAt,
        data: intent,
      }))
      return [...baseItems, ...intentItems].sort((a, b) => b.timestamp - a.timestamp)
    }

    return baseItems
  }, [items, intents, filter])

  // Filter items based on selection
  const filteredItems = useMemo(() => {
    if (filter === 'all') return allItems
    if (filter === 'intents') return allItems
    return allItems.filter((item) => {
      if (filter === 'transactions') return item.type === 'transaction'
      if (filter === 'executions') return item.type === 'execution'
      return true
    })
  }, [allItems, filter])

  // Not connected state
  if (!address) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <Clock className="h-12 w-12 mb-4" style={{ color: 'var(--text-muted)' }} />
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Connect your wallet to view transaction history.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 px-4 pt-4 pb-3" style={{ borderBottom: '1px solid var(--line)' }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
              Activity
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {filteredItems.length} {filter === 'all' ? 'items' : filter}
              {pendingIntentsCount > 0 && filter !== 'intents' && (
                <span className="ml-2 px-1.5 py-0.5 rounded text-xs" style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
                  {pendingIntentsCount} pending
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--surface-2)' }}>
          {FILTER_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setFilter(option.value)}
              className="flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors relative"
              style={{
                background: filter === option.value ? 'var(--surface)' : 'transparent',
                color: filter === option.value ? 'var(--text)' : 'var(--text-muted)',
                boxShadow: filter === option.value ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              {option.label}
              {option.value === 'intents' && pendingIntentsCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-xs flex items-center justify-center"
                  style={{ background: 'var(--accent)', color: 'white' }}
                >
                  {pendingIntentsCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading || intentsLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--accent)' }} />
          </div>
        ) : filteredItems.length === 0 ? (
          <EmptyState filter={filter} />
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--line)' }}>
            <AnimatePresence mode="popLayout">
              {filteredItems.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  layout
                >
                  {item.type === 'transaction' ? (
                    <TransactionRow transaction={item.data as Transaction} />
                  ) : item.type === 'execution' ? (
                    <ExecutionRow execution={item.data as StrategyExecution} />
                  ) : (
                    <IntentProgressCard intent={item.data as SmartSessionIntent} compact />
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyState({ filter }: { filter: FilterType }) {
  const messages: Record<FilterType, { title: string; description: string; icon: React.ReactNode }> = {
    all: {
      title: 'No Activity Yet',
      description: 'Your transactions, executions, and intents will appear here.',
      icon: <Clock className="h-8 w-8" style={{ color: 'var(--text-muted)' }} />,
    },
    transactions: {
      title: 'No Transactions',
      description: 'On-chain transactions like swaps, bridges, and transfers will appear here.',
      icon: <RefreshCw className="h-8 w-8" style={{ color: 'var(--text-muted)' }} />,
    },
    executions: {
      title: 'No Executions',
      description: 'Strategy executions from your automated strategies will appear here.',
      icon: <Zap className="h-8 w-8" style={{ color: 'var(--text-muted)' }} />,
    },
    intents: {
      title: 'No Intents',
      description: 'Smart session intents from DCA and automated actions will appear here.',
      icon: <Zap className="h-8 w-8" style={{ color: 'var(--text-muted)' }} />,
    },
  }

  const { title, description, icon } = messages[filter]

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
        style={{ background: 'var(--surface-2)' }}
      >
        {icon}
      </div>
      <h3 className="font-medium mb-1" style={{ color: 'var(--text)' }}>
        {title}
      </h3>
      <p className="text-sm max-w-xs" style={{ color: 'var(--text-muted)' }}>
        {description}
      </p>
    </div>
  )
}

function TransactionRow({ transaction }: { transaction: Transaction }) {
  const statusColor = getTransactionStatusColor(transaction.status)
  const icon = TYPE_ICONS[transaction.type] || <RefreshCw className="h-4 w-4" />

  return (
    <div className="px-4 py-3 hover:bg-black/5 transition-colors">
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
          style={{ background: 'var(--surface-2)', color: 'var(--text)' }}
        >
          {icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-sm" style={{ color: 'var(--text)' }}>
              {formatTransactionType(transaction.type)}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {formatRelativeTime(transaction.createdAt)}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 mt-1">
            <div className="flex items-center gap-2">
              {/* Status Badge */}
              <span
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs"
                style={{ background: `${statusColor}20`, color: statusColor }}
              >
                <StatusIcon status={transaction.status} />
                {formatTransactionStatus(transaction.status)}
              </span>

              {/* Chain */}
              <span className="text-xs capitalize" style={{ color: 'var(--text-muted)' }}>
                {transaction.chain}
              </span>
            </div>

            {/* Value */}
            {transaction.valueUsd !== undefined && (
              <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                {formatUsdValue(transaction.valueUsd)}
              </span>
            )}
          </div>

          {/* Tx Hash */}
          {transaction.txHash && (
            <a
              href={getExplorerUrl(transaction.txHash, transaction.chain)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-1.5 text-xs hover:underline"
              style={{ color: 'var(--accent)' }}
            >
              {truncateTxHash(transaction.txHash)}
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

function ExecutionRow({ execution }: { execution: StrategyExecution }) {
  const stateColor = getExecutionStateColor(execution.currentState)
  const isTerminal = ['completed', 'failed', 'cancelled'].includes(execution.currentState)

  return (
    <div className="px-4 py-3 hover:bg-black/5 transition-colors">
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
          style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}
        >
          {isTerminal ? (
            execution.currentState === 'completed' ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )
          ) : (
            <Loader2 className="h-4 w-4 animate-spin" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-sm truncate" style={{ color: 'var(--text)' }}>
              {execution.strategy?.name || 'Strategy Execution'}
            </span>
            <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>
              {formatRelativeTime(execution.createdAt || execution._creationTime)}
            </span>
          </div>

          <div className="flex items-center gap-2 mt-1">
            {/* State Badge */}
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs"
              style={{ background: `${stateColor}20`, color: stateColor }}
            >
              <ExecutionStateIcon state={execution.currentState} />
              {formatExecutionState(execution.currentState)}
            </span>

            {/* Strategy Type */}
            {execution.strategy?.strategyType && (
              <span className="text-xs uppercase" style={{ color: 'var(--text-muted)' }}>
                {execution.strategy.strategyType}
              </span>
            )}
          </div>

          {/* Error Message */}
          {execution.errorMessage && (
            <p
              className="mt-1.5 text-xs truncate"
              style={{ color: 'var(--error)' }}
              title={execution.errorMessage}
            >
              {execution.errorMessage}
            </p>
          )}

          {/* Approval Info */}
          {execution.currentState === 'awaiting_approval' && execution.approvalReason && (
            <p
              className="mt-1.5 text-xs truncate"
              style={{ color: 'var(--warning)' }}
            >
              {execution.approvalReason}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function StatusIcon({ status }: { status: Transaction['status'] }) {
  switch (status) {
    case 'pending':
      return <Clock className="h-3 w-3" />
    case 'submitted':
      return <Loader2 className="h-3 w-3 animate-spin" />
    case 'confirmed':
      return <CheckCircle2 className="h-3 w-3" />
    case 'failed':
    case 'reverted':
      return <XCircle className="h-3 w-3" />
    default:
      return null
  }
}

function ExecutionStateIcon({ state }: { state: StrategyExecution['currentState'] }) {
  switch (state) {
    case 'completed':
      return <CheckCircle2 className="h-3 w-3" />
    case 'failed':
    case 'cancelled':
      return <XCircle className="h-3 w-3" />
    case 'awaiting_approval':
      return <AlertCircle className="h-3 w-3" />
    case 'executing':
    case 'monitoring':
    case 'analyzing':
    case 'planning':
      return <Loader2 className="h-3 w-3 animate-spin" />
    default:
      return <Clock className="h-3 w-3" />
  }
}
