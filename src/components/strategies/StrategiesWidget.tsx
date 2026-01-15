/**
 * Strategies Widget
 *
 * A widget for displaying and managing DCA strategies in the widget panel.
 */

import React, { useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Play, Clock, Check, X, AlertCircle, Loader2 } from 'lucide-react'
import { useAccount } from 'wagmi'
import { StrategyList } from './StrategyList'
import { StrategyForm } from './StrategyForm'
import { useGenericStrategies, useGenericStrategyMutations, type GenericStrategy, formatNextExecution } from '../../hooks/useStrategies'
import { useExecutionHistory, useExecutionMutations, formatWaitingTime, getUrgencyLevel } from '../../workspace/hooks/usePendingApprovals'
import type { DCAFormData, StrategyFilters } from '../../types/strategy'
import type { Id } from '../../../convex/_generated/dataModel'

interface StrategiesWidgetProps {
  walletAddress: string | null
  userId?: Id<'users'>
  walletId?: Id<'wallets'>
}

type View = 'list' | 'create' | 'edit' | 'details'

export function StrategiesWidget({
  walletAddress,
  userId,
  walletId,
}: StrategiesWidgetProps) {
  const [view, setView] = useState<View>('list')
  const [selectedStrategyId, setSelectedStrategyId] = useState<Id<'strategies'> | null>(null)
  const [filters, setFilters] = useState<StrategyFilters>({ status: 'all', sortBy: 'created', sortOrder: 'desc' })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Map 'all' filter to undefined for the generic strategies hook
  const statusFilter = filters.status === 'all' ? undefined : filters.status as 'draft' | 'active' | 'paused' | 'archived' | undefined
  const { strategies, isLoading, isEmpty } = useGenericStrategies(walletAddress, statusFilter)
  const { activate, pause, update, remove, executeNow } = useGenericStrategyMutations()
  const [executeNowError, setExecuteNowError] = useState<string | null>(null)

  const selectedStrategy = strategies.find((s) => s._id === selectedStrategyId)

  const handleCreateNew = useCallback(() => {
    setView('create')
  }, [])

  const handleBack = useCallback(() => {
    setView('list')
    setSelectedStrategyId(null)
  }, [])

  const handleViewDetails = useCallback((id: string) => {
    setSelectedStrategyId(id as Id<'strategies'>)
    setView('details')
  }, [])

  const handleEdit = useCallback((id: string) => {
    setSelectedStrategyId(id as Id<'strategies'>)
    setView('edit')
  }, [])

  const handlePause = useCallback(async (id: string) => {
    await pause(id as Id<'strategies'>)
  }, [pause])

  const handleResume = useCallback(async (id: string) => {
    // Resume is just activating again
    await activate(id as Id<'strategies'>)
  }, [activate])

  const handleStop = useCallback(async (id: string) => {
    // Stop/archive the strategy
    await remove(id as Id<'strategies'>)
  }, [remove])

  const handleConfigUpdate = useCallback(async (newConfig: Record<string, unknown>) => {
    if (!selectedStrategyId) return

    setIsSubmitting(true)
    try {
      await update(selectedStrategyId, { config: newConfig })
      // Stay on details view to show updated values
    } finally {
      setIsSubmitting(false)
    }
  }, [update, selectedStrategyId])

  const handleExecuteNow = useCallback(async (id: string) => {
    setExecuteNowError(null)
    setIsSubmitting(true)
    try {
      await executeNow(id as Id<'strategies'>)
      // Success - execution created, user will see it in pending approvals
    } catch (error: any) {
      setExecuteNowError(error.message || 'Failed to create execution')
    } finally {
      setIsSubmitting(false)
    }
  }, [executeNow])

  // Not connected state
  if (!walletAddress) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Connect your wallet to view and manage your strategies.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <AnimatePresence mode="wait">
        {view === 'list' && (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 min-h-0"
          >
            <StrategyList
              strategies={strategies}
              isLoading={isLoading}
              isEmpty={isEmpty}
              filters={filters}
              onFiltersChange={setFilters}
              onCreateNew={handleCreateNew}
              onPause={handlePause}
              onResume={handleResume}
              onStop={handleStop}
              onEdit={handleEdit}
              onViewDetails={handleViewDetails}
            />
          </motion.div>
        )}

        {view === 'create' && (
          <motion.div
            key="create"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 min-h-0 flex flex-col"
          >
            <FormHeader title="Create Strategy" onBack={handleBack} />
            <div className="flex-1 overflow-y-auto p-4">
              <div className="text-center py-8">
                <p className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>
                  Strategies are created through the chat interface.
                </p>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Try asking: &quot;Set up a weekly DCA strategy to buy ETH&quot;
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {view === 'details' && selectedStrategy && (
          <motion.div
            key="details"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 min-h-0 flex flex-col"
          >
            <FormHeader title={selectedStrategy.name} onBack={handleBack} />
            <div className="flex-1 overflow-y-auto p-4">
              <StrategyDetails
                strategy={selectedStrategy}
                onPause={() => handlePause(selectedStrategy._id)}
                onResume={() => handleResume(selectedStrategy._id)}
                onStop={() => handleStop(selectedStrategy._id)}
                onUpdate={handleConfigUpdate}
                onExecuteNow={() => handleExecuteNow(selectedStrategy._id)}
                isUpdating={isSubmitting}
                executeNowError={executeNowError}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function FormHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div
      className="shrink-0 flex items-center gap-3 px-4 py-3"
      style={{ borderBottom: '1px solid var(--line)' }}
    >
      <button
        onClick={onBack}
        className="p-1.5 rounded-md hover:bg-black/5 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
      </button>
      <h2 className="font-medium" style={{ color: 'var(--text)' }}>
        {title}
      </h2>
    </div>
  )
}

function StrategyDetails({
  strategy,
  onPause,
  onResume,
  onStop,
  onUpdate,
  onExecuteNow,
  isUpdating,
  executeNowError,
}: {
  strategy: GenericStrategy
  onPause: () => void
  onResume: () => void
  onStop: () => void
  onUpdate: (config: Record<string, unknown>) => Promise<void>
  onExecuteNow: () => void
  isUpdating: boolean
  executeNowError: string | null
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [approvalLoading, setApprovalLoading] = useState<string | null>(null)
  const [approvalError, setApprovalError] = useState<string | null>(null)

  // Get wallet address for approval
  const { address } = useAccount()

  // Get execution history for this strategy
  const { executions, isLoading: executionsLoading } = useExecutionHistory(strategy._id)
  const { approve, skip } = useExecutionMutations()

  // Find pending executions (awaiting_approval or executing)
  const pendingExecutions = executions.filter(
    (e) => e.currentState === 'awaiting_approval' || e.currentState === 'executing'
  )

  // Handle approve action
  const handleApprove = useCallback(async (executionId: string) => {
    if (!address) {
      setApprovalError('Please connect your wallet to approve')
      return
    }
    setApprovalLoading(executionId)
    setApprovalError(null)
    try {
      await approve(executionId as Id<'strategyExecutions'>, address)
      // Success - execution will transition to 'executing' state and trigger wallet signing
    } catch (error: unknown) {
      setApprovalError(error instanceof Error ? error.message : 'Failed to approve execution')
    } finally {
      setApprovalLoading(null)
    }
  }, [approve, address])

  // Handle skip action
  const handleSkip = useCallback(async (executionId: string) => {
    setApprovalLoading(executionId)
    setApprovalError(null)
    try {
      await skip(executionId as Id<'strategyExecutions'>, 'Skipped by user')
    } catch (error: unknown) {
      setApprovalError(error instanceof Error ? error.message : 'Failed to skip execution')
    } finally {
      setApprovalLoading(null)
    }
  }, [skip])

  // Extract config values (with type safety)
  const config = strategy.config as Record<string, unknown>
  const [editedConfig, setEditedConfig] = useState({
    amount_usd: config.amount_usd as number || 0,
    frequency: config.frequency as string || 'weekly',
    from_token: config.from_token as string || '',
    to_token: config.to_token as string || '',
    maxSlippageBps: config.maxSlippageBps as number || 100,
    maxGasUsd: config.maxGasUsd as number || 10,
    chainId: config.chainId as number || 1,
  })

  const canPause = strategy.status === 'active'
  const canResume = strategy.status === 'paused' || strategy.status === 'pending_session'
  const canStop = strategy.status === 'active' || strategy.status === 'paused' || strategy.status === 'pending_session'
  const canEdit = strategy.status !== 'active' // Can edit when not actively running
  const canExecuteNow = strategy.status === 'active' || strategy.status === 'draft'

  // Format strategy type for display
  const strategyTypeLabels: Record<string, string> = {
    dca: 'Dollar Cost Average',
    rebalance: 'Portfolio Rebalance',
    limit_order: 'Limit Order',
    stop_loss: 'Stop Loss',
    take_profit: 'Take Profit',
    custom: 'Custom Strategy',
  }

  const frequencyOptions = [
    { value: 'hourly', label: 'Hourly' },
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'biweekly', label: 'Bi-weekly' },
    { value: 'monthly', label: 'Monthly' },
  ]

  const handleSave = async () => {
    await onUpdate(editedConfig)
    setIsEditing(false)
  }

  const handleCancel = () => {
    // Reset to original values
    setEditedConfig({
      amount_usd: config.amount_usd as number || 0,
      frequency: config.frequency as string || 'weekly',
      from_token: config.from_token as string || '',
      to_token: config.to_token as string || '',
      maxSlippageBps: config.maxSlippageBps as number || 100,
      maxGasUsd: config.maxGasUsd as number || 10,
      chainId: config.chainId as number || 1,
    })
    setIsEditing(false)
  }

  return (
    <div className="space-y-6">
      {/* Strategy Info */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Type" value={strategyTypeLabels[strategy.strategyType] || strategy.strategyType} />
        <StatCard
          label="Status"
          value={
            strategy.status === 'active' && (strategy as unknown as { requiresManualApproval?: boolean }).requiresManualApproval
              ? 'Active (Manual Approval)'
              : strategy.status.replace('_', ' ')
          }
        />
        <StatCard label="Executions" value={`${strategy.successfulExecutions ?? 0}/${strategy.totalExecutions ?? 0}`} />
        {strategy.status === 'active' && strategy.nextExecutionAt ? (
          <StatCard label="Next Execution" value={formatNextExecution(strategy.nextExecutionAt)} />
        ) : (
          <StatCard label="Failed" value={`${strategy.failedExecutions ?? 0}`} />
        )}
      </div>

      {/* Manual Approval Info */}
      {strategy.status === 'active' && (strategy as unknown as { requiresManualApproval?: boolean }).requiresManualApproval && (
        <div
          className="rounded-lg p-3 text-sm"
          style={{ background: 'var(--accent-muted)', border: '1px solid var(--accent)' }}
        >
          <p style={{ color: 'var(--accent)' }}>
            <strong>Manual Approval Mode:</strong> Each execution will require your approval in the chat before transactions are signed.
          </p>
        </div>
      )}

      {/* Pending Executions */}
      {pendingExecutions.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
            Pending Approval
          </h3>
          <div className="space-y-2">
            {pendingExecutions.map((execution) => {
              const urgency = getUrgencyLevel(execution.createdAt)
              const isLoading = approvalLoading === execution._id
              const urgencyColors = {
                normal: { bg: 'var(--accent-muted)', border: 'var(--accent)', text: 'var(--accent)' },
                warning: { bg: 'var(--warning-muted, #fef3c7)', border: 'var(--warning)', text: 'var(--warning)' },
                urgent: { bg: 'var(--error-muted, #fee2e2)', border: 'var(--error)', text: 'var(--error)' },
              }
              const colors = urgencyColors[urgency]

              return (
                <div
                  key={execution._id}
                  className="rounded-lg p-4"
                  style={{ background: colors.bg, border: `1px solid ${colors.border}` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertCircle className="h-4 w-4 shrink-0" style={{ color: colors.text }} />
                        <span className="font-medium text-sm" style={{ color: 'var(--text)' }}>
                          {execution.currentState === 'awaiting_approval' ? 'Awaiting Your Approval' : 'Executing...'}
                        </span>
                      </div>
                      {execution.approvalReason && (
                        <p className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>
                          {execution.approvalReason}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                        <Clock className="h-3 w-3" />
                        <span>Created {formatWaitingTime(execution.createdAt)}</span>
                      </div>
                    </div>
                    {execution.currentState === 'awaiting_approval' && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleApprove(execution._id)}
                          disabled={isLoading}
                          className="px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1"
                          style={{ background: 'var(--success)', color: 'white' }}
                        >
                          {isLoading ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )}
                          Approve
                        </button>
                        <button
                          onClick={() => handleSkip(execution._id)}
                          disabled={isLoading}
                          className="px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1"
                          style={{ background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--text)' }}
                        >
                          <X className="h-3 w-3" />
                          Skip
                        </button>
                      </div>
                    )}
                    {execution.currentState === 'executing' && (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" style={{ color: 'var(--accent)' }} />
                        <span className="text-sm" style={{ color: 'var(--accent)' }}>Processing...</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          {approvalError && (
            <div
              className="mt-2 rounded-lg p-2 text-sm"
              style={{ background: 'var(--error-muted, #fee2e2)', color: 'var(--error)' }}
            >
              {approvalError}
            </div>
          )}
        </div>
      )}

      {/* Configuration */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium" style={{ color: 'var(--text)' }}>
            Configuration
          </h3>
          {canEdit && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="text-xs px-2 py-1 rounded"
              style={{ color: 'var(--accent)', background: 'var(--accent-muted)' }}
            >
              Edit
            </button>
          )}
        </div>

        {isEditing ? (
          <div
            className="rounded-lg p-3 space-y-3 text-sm"
            style={{ background: 'var(--surface-2)' }}
          >
            {/* Token Pair - Read only for now */}
            <div className="flex justify-between items-center">
              <span style={{ color: 'var(--text-muted)' }}>Pair</span>
              <span style={{ color: 'var(--text)' }}>{editedConfig.from_token} → {editedConfig.to_token}</span>
            </div>

            {/* Amount */}
            <div className="flex justify-between items-center">
              <label style={{ color: 'var(--text-muted)' }}>Amount (USD)</label>
              <input
                type="number"
                value={editedConfig.amount_usd}
                onChange={(e) => setEditedConfig({ ...editedConfig, amount_usd: parseFloat(e.target.value) || 0 })}
                className="w-24 px-2 py-1 rounded text-right text-sm"
                style={{ background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--text)' }}
                min="1"
                step="1"
              />
            </div>

            {/* Frequency */}
            <div className="flex justify-between items-center">
              <label style={{ color: 'var(--text-muted)' }}>Frequency</label>
              <select
                value={editedConfig.frequency}
                onChange={(e) => setEditedConfig({ ...editedConfig, frequency: e.target.value })}
                className="px-2 py-1 rounded text-sm"
                style={{ background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--text)' }}
              >
                {frequencyOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Max Slippage */}
            <div className="flex justify-between items-center">
              <label style={{ color: 'var(--text-muted)' }}>Max slippage (%)</label>
              <input
                type="number"
                value={editedConfig.maxSlippageBps / 100}
                onChange={(e) => setEditedConfig({ ...editedConfig, maxSlippageBps: (parseFloat(e.target.value) || 0) * 100 })}
                className="w-24 px-2 py-1 rounded text-right text-sm"
                style={{ background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--text)' }}
                min="0.1"
                max="50"
                step="0.1"
              />
            </div>

            {/* Max Gas */}
            <div className="flex justify-between items-center">
              <label style={{ color: 'var(--text-muted)' }}>Max gas (USD)</label>
              <input
                type="number"
                value={editedConfig.maxGasUsd}
                onChange={(e) => setEditedConfig({ ...editedConfig, maxGasUsd: parseFloat(e.target.value) || 0 })}
                className="w-24 px-2 py-1 rounded text-right text-sm"
                style={{ background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--text)' }}
                min="1"
                step="1"
              />
            </div>

            {/* Save/Cancel buttons */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSave}
                disabled={isUpdating}
                className="flex-1 px-3 py-2 rounded-lg text-sm font-medium"
                style={{ background: 'var(--accent)', color: 'var(--text-inverse)' }}
              >
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={handleCancel}
                disabled={isUpdating}
                className="px-3 py-2 rounded-lg text-sm font-medium"
                style={{ background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--text)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div
            className="rounded-lg p-3 space-y-2 text-sm"
            style={{ background: 'var(--surface-2)' }}
          >
            {editedConfig.from_token && editedConfig.to_token && (
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-muted)' }}>Pair</span>
                <span style={{ color: 'var(--text)' }}>{editedConfig.from_token} → {editedConfig.to_token}</span>
              </div>
            )}
            {editedConfig.amount_usd > 0 && (
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-muted)' }}>Amount</span>
                <span style={{ color: 'var(--text)' }}>${editedConfig.amount_usd}</span>
              </div>
            )}
            {editedConfig.frequency && (
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-muted)' }}>Frequency</span>
                <span style={{ color: 'var(--text)' }}>{editedConfig.frequency}</span>
              </div>
            )}
            {editedConfig.maxSlippageBps > 0 && (
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-muted)' }}>Max slippage</span>
                <span style={{ color: 'var(--text)' }}>{(editedConfig.maxSlippageBps / 100).toFixed(1)}%</span>
              </div>
            )}
            {editedConfig.maxGasUsd > 0 && (
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-muted)' }}>Max gas</span>
                <span style={{ color: 'var(--text)' }}>${editedConfig.maxGasUsd}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {strategy.description && (
        <div>
          <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
            Description
          </h3>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {strategy.description}
          </p>
        </div>
      )}

      {/* Execute Now Error */}
      {executeNowError && (
        <div
          className="rounded-lg p-3 text-sm"
          style={{ background: 'var(--error-muted, #fee2e2)', border: '1px solid var(--error)', color: 'var(--error)' }}
        >
          {executeNowError}
        </div>
      )}

      {/* Actions */}
      {!isEditing && (
        <div className="flex flex-wrap gap-2">
          {canExecuteNow && (
            <button
              onClick={onExecuteNow}
              disabled={isUpdating}
              className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
              style={{ background: 'var(--accent)', color: 'var(--text-inverse)' }}
            >
              <Play className="h-4 w-4" />
              {isUpdating ? 'Creating...' : 'Execute Now'}
            </button>
          )}
          {canPause && (
            <button
              onClick={onPause}
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{ background: 'var(--warning)', color: 'white' }}
            >
              Pause
            </button>
          )}
          {canResume && (
            <button
              onClick={onResume}
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{ background: 'var(--success)', color: 'white' }}
            >
              Activate
            </button>
          )}
          {canStop && (
            <button
              onClick={onStop}
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{ background: 'var(--error)', color: 'white' }}
            >
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-lg p-3"
      style={{ background: 'var(--surface-2)' }}
    >
      <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
        {label}
      </p>
      <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
        {value}
      </p>
    </div>
  )
}
