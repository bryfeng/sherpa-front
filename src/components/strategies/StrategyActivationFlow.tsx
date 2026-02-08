/**
 * Strategy Activation Flow
 *
 * Orchestrates the strategy activation process:
 * 1. Review strategy configuration
 * 2. Deploy Smart Account (if needed)
 * 3. Fund Smart Wallet (transfer tokens from EOA)
 * 4. Grant Smart Session (on-chain, via Rhinestone SDK)
 * 5. Activate strategy
 *
 * Table-agnostic: works with both `strategies` (generic) and `dcaStrategies` tables.
 * The parent component provides strategy display info, session requirements, and callbacks.
 *
 * Uses: useRhinestoneAccount for smart account lifecycle
 * Uses: useSmartSessionGrant for on-chain session grant
 * Uses: FundSmartWalletCard for token transfers to smart wallet
 */

import React, { useState, useCallback } from 'react'
import {
  CheckCircle2,
  Shield,
  ArrowRight,
  Loader2,
  XCircle,
  DollarSign,
  Key,
  Wallet,
  Copy,
} from 'lucide-react'
import { useRhinestoneAccount } from '../../hooks/useRhinestoneAccount'
import { useSmartSessionGrant } from '../../hooks/useSmartSessionGrant'
import { FundSmartWalletCard } from '../smart-wallet/FundSmartWalletCard'
import type { SessionRequirements } from '../../hooks/useDCASmartSession'

// Re-export for consumers
export type { SessionRequirements }

// ============================================
// TYPES
// ============================================

/** A single row in the review step */
export interface ReviewDetail {
  label: string
  value: string
}

export interface StrategyActivationFlowProps {
  /** Strategy name for display */
  strategyName: string
  /** Key-value details shown in the review step */
  reviewDetails: ReviewDetail[]
  /** Session requirements (spending limit, valid days, etc.) */
  sessionRequirements: SessionRequirements
  /** Whether a smart session is already active for this account */
  hasActiveSession: boolean
  /** Called after on-chain session grant to record in Convex */
  onRecordSession: (sessionId: string, txHash: string, validUntil: number) => Promise<void>
  /** Called to activate the strategy (with smart session) */
  onActivateStrategy: (smartSessionId?: string) => Promise<void>
  /** Called when the flow completes */
  onComplete: () => void
  /** Called when the user cancels */
  onCancel: () => void
}

type ActivationStep = 'review' | 'deploy' | 'fund' | 'grant' | 'activate' | 'complete' | 'error'

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

// ============================================
// STEP INDICATOR
// ============================================

function StepIndicator({
  currentStep,
  needsDeploy,
  needsSession,
}: {
  currentStep: ActivationStep
  needsDeploy: boolean
  needsSession: boolean
}) {
  const steps: { key: string; label: string }[] = [
    { key: 'review', label: 'Review' },
  ]
  if (needsDeploy) {
    steps.push({ key: 'deploy', label: 'Deploy Account' })
  }
  // Fund step is shown when deploy is needed (new account needs funding)
  if (needsDeploy) {
    steps.push({ key: 'fund', label: 'Fund' })
  }
  if (needsSession) {
    steps.push({ key: 'grant', label: 'Grant Session' })
  }
  steps.push({ key: 'activate', label: 'Activate' })

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
  strategyName: _strategyName,
  reviewDetails,
  sessionRequirements,
  needsSession,
  onContinue,
  onCancel,
}: {
  strategyName: string
  reviewDetails: ReviewDetail[]
  sessionRequirements: SessionRequirements
  needsSession: boolean
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
        {reviewDetails.map((detail) => (
          <div
            key={detail.label}
            className="flex items-center justify-between p-3 rounded-lg"
            style={{ background: 'var(--surface-2)' }}
          >
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" style={{ color: 'var(--accent)' }} />
              <span style={{ color: 'var(--text-muted)' }}>{detail.label}</span>
            </div>
            <span className="font-medium" style={{ color: 'var(--text)' }}>
              {detail.value}
            </span>
          </div>
        ))}
      </div>

      {/* Session Requirements */}
      {needsSession && (
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
// DEPLOY ACCOUNT STEP
// ============================================

function DeployAccountStep({
  smartAccountAddress,
  onDeploy,
  onCancel,
  isLoading,
}: {
  smartAccountAddress: string | null
  onDeploy: () => Promise<void>
  onCancel: () => void
  isLoading: boolean
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    if (smartAccountAddress) {
      navigator.clipboard.writeText(smartAccountAddress)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [smartAccountAddress])

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text)' }}>
        Deploy Smart Account
      </h3>

      <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
        A smart account is required for autonomous execution. This deploys an ERC-7579 account
        that you fully own and control.
      </p>

      {/* Smart Account Address */}
      {smartAccountAddress && (
        <div className="mb-6 p-4 rounded-lg" style={{ background: 'var(--surface-2)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
              Smart Account Address
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-xs transition-colors"
              style={{ color: 'var(--accent)' }}
            >
              <Copy className="h-3 w-3" />
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <p className="text-sm font-mono break-all" style={{ color: 'var(--text)' }}>
            {smartAccountAddress}
          </p>
          <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
            This address is deterministic and can receive funds before deployment.
          </p>
        </div>
      )}

      {/* Security Note */}
      <div className="mb-6 p-4 rounded-lg" style={{ background: 'var(--surface-2)' }}>
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 shrink-0 mt-0.5" style={{ color: 'var(--success)' }} />
          <div>
            <h4 className="font-medium mb-1" style={{ color: 'var(--text)' }}>
              Non-custodial
            </h4>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Your EOA wallet is the sole owner. The Smart Sessions module is installed at
              deployment for scoped permission grants.
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
          onClick={onDeploy}
          disabled={isLoading}
          className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          style={{ background: 'var(--accent)', color: 'white' }}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Deploying...
            </>
          ) : (
            <>
              <Wallet className="h-4 w-4" />
              Deploy Smart Account
            </>
          )}
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
  strategyName,
  reviewDetails,
  onActivate,
  onCancel,
  isLoading,
}: {
  strategyName: string
  reviewDetails: ReviewDetail[]
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
          {strategyName}
        </h4>
        <div className="space-y-2 text-sm">
          {reviewDetails.slice(0, 3).map((detail) => (
            <div key={detail.label} className="flex justify-between">
              <span style={{ color: 'var(--text-muted)' }}>{detail.label}</span>
              <span style={{ color: 'var(--text)' }}>{detail.value}</span>
            </div>
          ))}
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
        Your strategy is now active and will execute automatically according to your schedule.
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
  strategyName,
  reviewDetails,
  sessionRequirements,
  hasActiveSession,
  onRecordSession,
  onActivateStrategy,
  onComplete,
  onCancel,
}: StrategyActivationFlowProps) {
  const [step, setStep] = useState<ActivationStep>('review')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [grantedSessionId, setGrantedSessionId] = useState<string | null>(null)

  // Rhinestone smart account lifecycle
  const {
    smartAccountAddress: rhinestoneAddress,
    isDeployed,
    isDeploying,
    account: rhinestoneAccount,
    error: _deployError,
    initialize: initializeAccount,
    deploy: deployAccount,
  } = useRhinestoneAccount()

  // On-chain session grant
  const {
    grantSession,
    isGranting,
  } = useSmartSessionGrant()

  // Derived state
  const needsSession = !hasActiveSession
  const needsDeploy = needsSession && !isDeployed

  // Handle continue from review
  const handleReviewContinue = useCallback(async () => {
    if (needsDeploy) {
      try {
        await initializeAccount()
      } catch {
        // Non-fatal: deploy step will retry
      }
      setStep('deploy')
    } else if (needsSession) {
      if (!rhinestoneAccount) {
        try {
          await initializeAccount()
        } catch {
          // Non-fatal: grant step will handle
        }
      }
      setStep('grant')
    } else {
      setStep('activate')
    }
  }, [needsDeploy, needsSession, rhinestoneAccount, initializeAccount])

  // Handle deploy smart account
  const handleDeploy = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      await deployAccount()
      // After deploy, go to fund step so user can transfer tokens
      setStep('fund')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deploy smart account')
      setStep('error')
    } finally {
      setIsLoading(false)
    }
  }, [deployAccount])

  // Handle fund step continue / skip
  const handleFundContinue = useCallback(() => {
    if (needsSession) {
      setStep('grant')
    } else {
      setStep('activate')
    }
  }, [needsSession])

  // Handle grant session (real on-chain SDK flow)
  const handleGrantSession = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Ensure account is initialized
      let account = rhinestoneAccount
      if (!account) {
        account = await initializeAccount()
      }

      // 1. On-chain session grant via Rhinestone SDK
      const { sessionId, txHash } = await grantSession({
        account,
        requirements: sessionRequirements,
      })

      // 2. Record the session in Convex
      const validUntil = Date.now() + sessionRequirements.validDays * 24 * 60 * 60 * 1000
      await onRecordSession(sessionId, txHash, validUntil)

      // Store for activation step
      setGrantedSessionId(sessionId)
      setStep('activate')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to grant session')
      setStep('error')
    } finally {
      setIsLoading(false)
    }
  }, [sessionRequirements, rhinestoneAccount, initializeAccount, grantSession, onRecordSession])

  // Handle activate
  const handleActivate = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      await onActivateStrategy(grantedSessionId ?? undefined)
      setStep('complete')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to activate strategy')
      setStep('error')
    } finally {
      setIsLoading(false)
    }
  }, [onActivateStrategy, grantedSessionId])

  // Handle retry
  const handleRetry = useCallback(() => {
    setError(null)
    setStep('review')
  }, [])

  return (
    <div className="p-6">
      {/* Step Indicator */}
      {step !== 'complete' && step !== 'error' && (
        <StepIndicator currentStep={step} needsDeploy={needsDeploy} needsSession={needsSession} />
      )}

      {/* Step Content */}
      {step === 'review' && (
        <ReviewStep
          strategyName={strategyName}
          reviewDetails={reviewDetails}
          sessionRequirements={sessionRequirements}
          needsSession={needsSession}
          onContinue={handleReviewContinue}
          onCancel={onCancel}
        />
      )}

      {step === 'deploy' && (
        <DeployAccountStep
          smartAccountAddress={rhinestoneAddress}
          onDeploy={handleDeploy}
          onCancel={onCancel}
          isLoading={isLoading || isDeploying}
        />
      )}

      {step === 'fund' && rhinestoneAddress && (
        <FundSmartWalletCard
          smartWalletAddress={rhinestoneAddress}
          onContinue={handleFundContinue}
          onCancel={onCancel}
          onSkip={handleFundContinue}
        />
      )}

      {step === 'grant' && (
        <GrantSessionStep
          sessionRequirements={sessionRequirements}
          onGrant={handleGrantSession}
          onCancel={onCancel}
          isLoading={isLoading || isGranting}
        />
      )}

      {step === 'activate' && (
        <ActivateStep
          strategyName={strategyName}
          reviewDetails={reviewDetails}
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
