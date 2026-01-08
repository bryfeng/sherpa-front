/**
 * Strategies Widget
 *
 * A widget for displaying and managing DCA strategies in the artifact panel.
 */

import React, { useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { StrategyList } from './StrategyList'
import { StrategyForm } from './StrategyForm'
import { useStrategies, useStrategyMutations } from '../../hooks/useStrategies'
import type { DCAFormData, DCAStrategy, StrategyFilters } from '../../types/strategy'
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
  const [selectedStrategyId, setSelectedStrategyId] = useState<Id<'dcaStrategies'> | null>(null)
  const [filters, setFilters] = useState<StrategyFilters>({ status: 'all', sortBy: 'created', sortOrder: 'desc' })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { strategies, isLoading, isEmpty } = useStrategies(walletAddress, filters)
  const { create, pause, resume, stop, updateConfig } = useStrategyMutations()

  const selectedStrategy = strategies.find((s) => s._id === selectedStrategyId)

  const handleCreateNew = useCallback(() => {
    setView('create')
  }, [])

  const handleBack = useCallback(() => {
    setView('list')
    setSelectedStrategyId(null)
  }, [])

  const handleViewDetails = useCallback((id: string) => {
    setSelectedStrategyId(id as Id<'dcaStrategies'>)
    setView('details')
  }, [])

  const handleEdit = useCallback((id: string) => {
    setSelectedStrategyId(id as Id<'dcaStrategies'>)
    setView('edit')
  }, [])

  const handlePause = useCallback(async (id: string) => {
    await pause(id as Id<'dcaStrategies'>)
  }, [pause])

  const handleResume = useCallback(async (id: string) => {
    await resume(id as Id<'dcaStrategies'>)
  }, [resume])

  const handleStop = useCallback(async (id: string) => {
    await stop(id as Id<'dcaStrategies'>)
  }, [stop])

  const handleCreate = useCallback(async (data: DCAFormData) => {
    if (!userId || !walletId || !walletAddress) {
      console.error('Missing user/wallet info')
      return
    }

    setIsSubmitting(true)
    try {
      await create(userId, walletId, walletAddress, data)
      setView('list')
    } finally {
      setIsSubmitting(false)
    }
  }, [create, userId, walletId, walletAddress])

  const handleUpdate = useCallback(async (data: DCAFormData) => {
    if (!selectedStrategyId) return

    setIsSubmitting(true)
    try {
      await updateConfig(selectedStrategyId, data)
      setView('list')
      setSelectedStrategyId(null)
    } finally {
      setIsSubmitting(false)
    }
  }, [updateConfig, selectedStrategyId])

  // Not connected state
  if (!walletAddress) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Connect your wallet to view and manage DCA strategies.
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
              <StrategyForm
                onSubmit={handleCreate}
                onCancel={handleBack}
                isSubmitting={isSubmitting}
                mode="create"
              />
            </div>
          </motion.div>
        )}

        {view === 'edit' && selectedStrategy && (
          <motion.div
            key="edit"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 min-h-0 flex flex-col"
          >
            <FormHeader title="Edit Strategy" onBack={handleBack} />
            <div className="flex-1 overflow-y-auto p-4">
              <StrategyForm
                initialData={{
                  name: selectedStrategy.name,
                  description: selectedStrategy.description,
                  fromToken: selectedStrategy.fromToken,
                  toToken: selectedStrategy.toToken,
                  amountPerExecutionUsd: selectedStrategy.amountPerExecutionUsd,
                  frequency: selectedStrategy.frequency,
                  cronExpression: selectedStrategy.cronExpression,
                  executionHourUtc: selectedStrategy.executionHourUtc,
                  executionDayOfWeek: selectedStrategy.executionDayOfWeek,
                  executionDayOfMonth: selectedStrategy.executionDayOfMonth,
                  maxSlippageBps: selectedStrategy.maxSlippageBps,
                  maxGasUsd: selectedStrategy.maxGasUsd,
                  skipIfGasAboveUsd: selectedStrategy.skipIfGasAboveUsd,
                  pauseIfPriceAboveUsd: selectedStrategy.pauseIfPriceAboveUsd,
                  pauseIfPriceBelowUsd: selectedStrategy.pauseIfPriceBelowUsd,
                  maxTotalSpendUsd: selectedStrategy.maxTotalSpendUsd,
                  maxExecutions: selectedStrategy.maxExecutions,
                  endDate: selectedStrategy.endDate,
                }}
                onSubmit={handleUpdate}
                onCancel={handleBack}
                isSubmitting={isSubmitting}
                mode="edit"
              />
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
                onEdit={() => setView('edit')}
                onPause={() => handlePause(selectedStrategy._id)}
                onResume={() => handleResume(selectedStrategy._id)}
                onStop={() => handleStop(selectedStrategy._id)}
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
  onEdit,
  onPause,
  onResume,
  onStop,
}: {
  strategy: DCAStrategy
  onEdit: () => void
  onPause: () => void
  onResume: () => void
  onStop: () => void
}) {
  const canEdit = strategy.status === 'draft' || strategy.status === 'paused'
  const canPause = strategy.status === 'active'
  const canResume = strategy.status === 'paused'
  const canStop = strategy.status === 'active' || strategy.status === 'paused'

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Total Spent" value={`$${strategy.totalAmountSpentUsd.toLocaleString()}`} />
        <StatCard label="Tokens Acquired" value={`${parseFloat(strategy.totalTokensAcquired).toFixed(4)} ${strategy.toToken.symbol}`} />
        <StatCard label="Successful" value={`${strategy.successfulExecutions}/${strategy.totalExecutions}`} />
        <StatCard label="Avg Price" value={strategy.averagePriceUsd ? `$${strategy.averagePriceUsd.toFixed(2)}` : 'N/A'} />
      </div>

      {/* Configuration */}
      <div>
        <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
          Configuration
        </h3>
        <div
          className="rounded-lg p-3 space-y-2 text-sm"
          style={{ background: 'var(--surface-2)' }}
        >
          <div className="flex justify-between">
            <span style={{ color: 'var(--text-muted)' }}>Amount per buy</span>
            <span style={{ color: 'var(--text)' }}>${strategy.amountPerExecutionUsd}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: 'var(--text-muted)' }}>Frequency</span>
            <span style={{ color: 'var(--text)' }}>{strategy.frequency}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: 'var(--text-muted)' }}>Max slippage</span>
            <span style={{ color: 'var(--text)' }}>{(strategy.maxSlippageBps / 100).toFixed(1)}%</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: 'var(--text-muted)' }}>Max gas</span>
            <span style={{ color: 'var(--text)' }}>${strategy.maxGasUsd}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {canEdit && (
          <button
            onClick={onEdit}
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{ background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--line)' }}
          >
            Edit
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
            Resume
          </button>
        )}
        {canStop && (
          <button
            onClick={onStop}
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{ background: 'var(--error)', color: 'white' }}
          >
            Stop
          </button>
        )}
      </div>
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
