/**
 * Strategy Activation Flow
 *
 * Orchestrates the DCA strategy activation process:
 * 1. Review strategy configuration
 * 2. Grant Smart Session (if needed)
 * 3. Activate strategy
 */

import React, { useState, useCallback } from 'react'
import {
  CheckCircle2,
  Shield,
  Clock,
  ArrowRight,
  Loader2,
  AlertTriangle,
  XCircle,
  DollarSign,
  Repeat,
  Key,
} from 'lucide-react'
import type { Id } from '../../../convex/_generated/dataModel'
import { useDCASmartSession, type SessionRequirements } from '../../hooks/useDCASmartSession'
import type { DCAStrategy } from '../../types/strategy'
import { FREQUENCY_LABELS } from '../../types/strategy'

// ============================================
// TYPES
// ============================================

interface StrategyActivationFlowProps {
  strategyId: Id<'dcaStrategies'>
  smartAccountAddress: string
  onComplete: () => void
  onCancel: () => void
}

type ActivationStep = 'review' | 'grant' | 'activate' | 'complete' | 'error'

// ============================================
// HELPERS
// ============================================

function formatUsd(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// ============================================
// STEP INDICATOR
// ============================================

function StepIndicator({
  currentStep,
  needsSession
}: {
  currentStep: ActivationStep
  needsSession: boolean
}) {
  const steps = needsSession
    ? [
        { key: 'review', label: 'Review' },
        { key: 'grant', label: 'Grant Session' },
        { key: 'activate', label: 'Activate' },
      ]
    : [
        { key: 'review', label: 'Review' },
        { key: 'activate', label: 'Activate' },
      ]

  const getStepIndex = (step: ActivationStep) => {
    if (step === 'complete' || step === 'error') {
      return steps.length
    }
    return steps.findIndex((s) => s.key === step)
  }

  const currentIndex = getStepIndex(currentStep)

  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {steps.map((step, index) => {
        const isCompleted = index < currentIndex
        const isCurrent = index === currentIndex
        const isLast = index === steps.length - 1

        return (
          <React.Fragment key={step.key}>
            <div className="flex flex-col items-center">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium"
                style={{
                  background: isCompleted
                    ? 'var(--success)'
                    : isCurrent
                      ? 'var(--accent)'
                      : 'var(--surface-2)',
                  color: isCompleted || isCurrent ? 'white' : 'var(--text-muted)',
                }}
              >
                {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
              </div>
              <span
                className="text-xs mt-1"
                style={{ color: isCompleted || isCurrent ? 'var(--text)' : 'var(--text-muted)' }}
              >
                {step.label}
              </span>
            </div>
            {!isLast && (
              <div
                className="w-12 h-0.5 -mt-4"
                style={{ background: isCompleted ? 'var(--success)' : 'var(--line)' }}
              />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

// ============================================
// REVIEW STEP
// ============================================

function ReviewStep({
  strategy,
  sessionRequirements,
  onContinue,
  onCancel,
}: {
  strategy: DCAStrategy
  sessionRequirements: SessionRequirements | null
  onContinue: () => void
  onCancel: () => void
}) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text)' }}>
        Review Strategy Configuration
      </h3>

      {/* Strategy Details */}
      <div className="space-y-3 mb-6">
        <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--surface-2)' }}>
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" style={{ color: 'var(--accent)' }} />
            <span style={{ color: 'var(--text-muted)' }}>Amount per execution</span>
          </div>
          <span className="font-medium" style={{ color: 'var(--text)' }}>
            {formatUsd(strategy.amountPerExecutionUsd)}
          </span>
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--surface-2)' }}>
          <div className="flex items-center gap-2">
            <Repeat className="h-4 w-4" style={{ color: 'var(--accent)' }} />
            <span style={{ color: 'var(--text-muted)' }}>Frequency</span>
          </div>
          <span className="font-medium" style={{ color: 'var(--text)' }}>
            {FREQUENCY_LABELS[strategy.frequency]}
          </span>
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--surface-2)' }}>
          <div className="flex items-center gap-2">
            <ArrowRight className="h-4 w-4" style={{ color: 'var(--accent)' }} />
            <span style={{ color: 'var(--text-muted)' }}>Swap</span>
          </div>
          <span className="font-medium" style={{ color: 'var(--text)' }}>
            {strategy.fromToken.symbol} → {strategy.toToken.symbol}
          </span>
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--surface-2)' }}>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" style={{ color: 'var(--accent)' }} />
            <span style={{ color: 'var(--text-muted)' }}>Max slippage</span>
          </div>
          <span className="font-medium" style={{ color: 'var(--text)' }}>
            {(strategy.maxSlippageBps / 100).toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Session Requirements */}
      {sessionRequirements && (
        <div className="mb-6 p-4 rounded-lg" style={{ background: 'var(--warning-muted)', border: '1px solid var(--warning)' }}>
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 shrink-0 mt-0.5" style={{ color: 'var(--warning)' }} />
            <div>
              <h4 className="font-medium mb-1" style={{ color: 'var(--text)' }}>
                Smart Session Required
              </h4>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                You&apos;ll need to grant a Smart Session to allow automated execution. This is an on-chain permission
                with a spending limit of {formatUsd(sessionRequirements.spendingLimitUsd)} valid for{' '}
                {sessionRequirements.validDays} days.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{ background: 'var(--surface-2)', color: 'var(--text)' }}
        >
          Cancel
        </button>
        <button
          onClick={onContinue}
          className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
          style={{ background: 'var(--accent)', color: 'white' }}
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

// ============================================
// GRANT SESSION STEP
// ============================================

function GrantSessionStep({
  sessionRequirements,
  onGrant,
  onCancel,
  isLoading,
}: {
  sessionRequirements: SessionRequirements
  onGrant: () => Promise<void>
  onCancel: () => void
  isLoading: boolean
}) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text)' }}>
        Grant Smart Session
      </h3>

      <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
        Grant an on-chain permission that allows Sherpa to execute swaps on your behalf within the specified limits.
      </p>

      {/* Session Details */}
      <div className="space-y-3 mb-6">
        <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--surface-2)' }}>
          <span style={{ color: 'var(--text-muted)' }}>Spending Limit</span>
          <span className="font-medium" style={{ color: 'var(--text)' }}>
            {formatUsd(sessionRequirements.spendingLimitUsd)}
          </span>
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--surface-2)' }}>
          <span style={{ color: 'var(--text-muted)' }}>Valid For</span>
          <span className="font-medium" style={{ color: 'var(--text)' }}>
            {sessionRequirements.validDays} days
          </span>
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--surface-2)' }}>
          <span style={{ color: 'var(--text-muted)' }}>Allowed Actions</span>
          <span className="font-medium capitalize" style={{ color: 'var(--text)' }}>
            {sessionRequirements.allowedActions.join(', ')}
          </span>
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--surface-2)' }}>
          <span style={{ color: 'var(--text-muted)' }}>Allowed Tokens</span>
          <span className="font-medium" style={{ color: 'var(--text)' }}>
            {sessionRequirements.allowedTokens.length} tokens
          </span>
        </div>
      </div>

      {/* Security Note */}
      <div className="mb-6 p-4 rounded-lg" style={{ background: 'var(--surface-2)' }}>
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 shrink-0 mt-0.5" style={{ color: 'var(--success)' }} />
          <div>
            <h4 className="font-medium mb-1" style={{ color: 'var(--text)' }}>
              Your funds are protected
            </h4>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Smart Sessions use ERC-7579 account abstraction with on-chain permission limits.
              You can revoke this session at any time from your wallet settings.
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          style={{ background: 'var(--surface-2)', color: 'var(--text)' }}
        >
          Cancel
        </button>
        <button
          onClick={onGrant}
          disabled={isLoading}
          className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          style={{ background: 'var(--accent)', color: 'white' }}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Signing...
            </>
          ) : (
            <>
              <Key className="h-4 w-4" />
              Grant Session
            </>
          )}
        </button>
      </div>
    </div>
  )
}

// ============================================
// ACTIVATE STEP
// ============================================

function ActivateStep({
  strategy,
  onActivate,
  onCancel,
  isLoading,
}: {
  strategy: DCAStrategy
  onActivate: () => Promise<void>
  onCancel: () => void
  isLoading: boolean
}) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text)' }}>
        Activate Strategy
      </h3>

      <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
        Your strategy is ready to be activated. Once active, it will automatically execute according to your schedule.
      </p>

      {/* Strategy Summary */}
      <div className="p-4 rounded-lg mb-6" style={{ background: 'var(--surface-2)' }}>
        <h4 className="font-medium mb-3" style={{ color: 'var(--text)' }}>
          {strategy.name}
        </h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span style={{ color: 'var(--text-muted)' }}>Amount</span>
            <span style={{ color: 'var(--text)' }}>{formatUsd(strategy.amountPerExecutionUsd)}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: 'var(--text-muted)' }}>Frequency</span>
            <span style={{ color: 'var(--text)' }}>{FREQUENCY_LABELS[strategy.frequency]}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: 'var(--text-muted)' }}>Swap</span>
            <span style={{ color: 'var(--text)' }}>
              {strategy.fromToken.symbol} → {strategy.toToken.symbol}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          style={{ background: 'var(--surface-2)', color: 'var(--text)' }}
        >
          Cancel
        </button>
        <button
          onClick={onActivate}
          disabled={isLoading}
          className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          style={{ background: 'var(--success)', color: 'white' }}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Activating...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4" />
              Activate Strategy
            </>
          )}
        </button>
      </div>
    </div>
  )
}

// ============================================
// COMPLETE STEP
// ============================================

function CompleteStep({ onClose }: { onClose: () => void }) {
  return (
    <div className="text-center">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
        style={{ background: 'var(--success-muted)' }}
      >
        <CheckCircle2 className="h-8 w-8" style={{ color: 'var(--success)' }} />
      </div>

      <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text)' }}>
        Strategy Activated!
      </h3>

      <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
        Your DCA strategy is now active and will execute automatically according to your schedule.
      </p>

      <button
        onClick={onClose}
        className="w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        style={{ background: 'var(--accent)', color: 'white' }}
      >
        Done
      </button>
    </div>
  )
}

// ============================================
// ERROR STEP
// ============================================

function ErrorStep({ error, onRetry, onCancel }: { error: string; onRetry: () => void; onCancel: () => void }) {
  return (
    <div className="text-center">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
        style={{ background: 'var(--error-muted)' }}
      >
        <XCircle className="h-8 w-8" style={{ color: 'var(--error)' }} />
      </div>

      <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text)' }}>
        Activation Failed
      </h3>

      <p className="text-sm mb-6" style={{ color: 'var(--error)' }}>
        {error}
      </p>

      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{ background: 'var(--surface-2)', color: 'var(--text)' }}
        >
          Cancel
        </button>
        <button
          onClick={onRetry}
          className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{ background: 'var(--accent)', color: 'white' }}
        >
          Retry
        </button>
      </div>
    </div>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================

export function StrategyActivationFlow({
  strategyId,
  smartAccountAddress,
  onComplete,
  onCancel,
}: StrategyActivationFlowProps) {
  const [step, setStep] = useState<ActivationStep>('review')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    strategy,
    activeSession,
    sessionRequirements,
    needsSession,
    activateWithSession,
    recordSessionGrant,
    isLoading: hookLoading,
  } = useDCASmartSession({
    strategyId,
    smartAccountAddress,
  })

  // Handle continue from review
  const handleReviewContinue = useCallback(() => {
    if (needsSession) {
      setStep('grant')
    } else {
      setStep('activate')
    }
  }, [needsSession])

  // Handle grant session
  const handleGrantSession = useCallback(async () => {
    if (!sessionRequirements) return

    setIsLoading(true)
    setError(null)

    try {
      // In production, this would:
      // 1. Build the session grant transaction
      // 2. Prompt user to sign via their wallet
      // 3. Submit the transaction on-chain
      // 4. Wait for confirmation
      // 5. Record the session in Convex

      // For now, simulate the grant with a mock session
      const sessionId = `ss_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
      const validUntil = Date.now() + sessionRequirements.validDays * 24 * 60 * 60 * 1000

      await recordSessionGrant({
        sessionId,
        spendingLimitUsd: sessionRequirements.spendingLimitUsd,
        allowedContracts: sessionRequirements.allowedContracts,
        allowedTokens: sessionRequirements.allowedTokens,
        allowedActions: sessionRequirements.allowedActions,
        validUntil,
        grantTxHash: `0x${Math.random().toString(16).slice(2)}`,
      })

      setStep('activate')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to grant session')
      setStep('error')
    } finally {
      setIsLoading(false)
    }
  }, [sessionRequirements, recordSessionGrant])

  // Handle activate
  const handleActivate = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      await activateWithSession()
      setStep('complete')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to activate strategy')
      setStep('error')
    } finally {
      setIsLoading(false)
    }
  }, [activateWithSession])

  // Handle retry
  const handleRetry = useCallback(() => {
    setError(null)
    setStep('review')
  }, [])

  // Loading state
  if (hookLoading || !strategy) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin mb-4" style={{ color: 'var(--accent)' }} />
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Loading strategy...
        </p>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Step Indicator */}
      {step !== 'complete' && step !== 'error' && (
        <StepIndicator currentStep={step} needsSession={needsSession} />
      )}

      {/* Step Content */}
      {step === 'review' && (
        <ReviewStep
          strategy={strategy as DCAStrategy}
          sessionRequirements={needsSession ? sessionRequirements : null}
          onContinue={handleReviewContinue}
          onCancel={onCancel}
        />
      )}

      {step === 'grant' && sessionRequirements && (
        <GrantSessionStep
          sessionRequirements={sessionRequirements}
          onGrant={handleGrantSession}
          onCancel={onCancel}
          isLoading={isLoading}
        />
      )}

      {step === 'activate' && (
        <ActivateStep
          strategy={strategy as DCAStrategy}
          onActivate={handleActivate}
          onCancel={onCancel}
          isLoading={isLoading}
        />
      )}

      {step === 'complete' && <CompleteStep onClose={onComplete} />}

      {step === 'error' && error && (
        <ErrorStep error={error} onRetry={handleRetry} onCancel={onCancel} />
      )}
    </div>
  )
}

export default StrategyActivationFlow
