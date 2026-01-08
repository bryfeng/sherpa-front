import { useMemo } from 'react'
import { useRiskPolicyConfig } from './useRiskPolicy'
import { usePolicyStatus, useIsChainAllowed, useIsTokenBlocked, useIsContractBlocked } from './usePolicyStatus'
import { useSessionKeys, type SessionKeyData } from './useSessionKeys'
import type {
  TransactionIntent,
  PolicyCheck,
  PolicyEvaluationResult,
  RiskPolicyConfig,
} from '../types/policy'
import { createPassCheck, createWarnCheck, createFailCheck, formatUsd } from '../types/policy'

export interface UsePolicyEvaluationOptions {
  walletAddress: string | null
  intent: TransactionIntent | null
}

/**
 * Evaluates a transaction intent against all policy layers:
 * - System Policy (emergency stop, maintenance, blocklists)
 * - Risk Policy (user limits for slippage, gas, transaction size)
 * - Session Keys (delegated access permissions)
 */
export function usePolicyEvaluation({
  walletAddress,
  intent,
}: UsePolicyEvaluationOptions): PolicyEvaluationResult {
  // Fetch policy data
  const riskPolicy = useRiskPolicyConfig(walletAddress ?? undefined)
  const { status: systemStatus, canTrade, statusMessage } = usePolicyStatus()
  const { sessions } = useSessionKeys({ walletAddress: walletAddress ?? undefined })

  // Check chain/token/contract blocklists
  const fromChainAllowed = useIsChainAllowed(intent?.fromToken.chainId ?? 1)
  const toChainAllowed = useIsChainAllowed(intent?.toToken.chainId ?? 1)
  const fromTokenBlocked = useIsTokenBlocked(intent?.fromToken.address ?? '')
  const toTokenBlocked = useIsTokenBlocked(intent?.toToken.address ?? '')
  const contractBlocked = useIsContractBlocked(intent?.contractAddress ?? '')

  // Get active session if any
  const activeSession = useMemo(() => {
    const now = Date.now()
    return sessions.find((s) => s.status === 'active' && s.expiresAt > now)
  }, [sessions])

  return useMemo(() => {
    // No wallet or intent - return empty result
    if (!walletAddress || !intent) {
      return {
        canProceed: true,
        checks: [],
        blockingCount: 0,
        warningCount: 0,
      }
    }

    const checks: PolicyCheck[] = []

    // ============================================
    // System Policy Checks
    // ============================================

    // Emergency stop
    if (systemStatus.emergencyStop) {
      checks.push(
        createFailCheck(
          'system-emergency',
          'System status',
          statusMessage || 'Trading is temporarily disabled',
        ),
      )
    } else if (systemStatus.inMaintenance) {
      checks.push(
        createWarnCheck(
          'system-maintenance',
          'System status',
          statusMessage || 'Maintenance in progress',
        ),
      )
    } else {
      checks.push(
        createPassCheck('system-status', 'System status', 'Operational'),
      )
    }

    // Chain allowlist
    if (!fromChainAllowed) {
      checks.push(
        createFailCheck(
          'chain-from-blocked',
          'Source chain',
          `Chain ${intent.fromToken.chainId} is not supported`,
        ),
      )
    } else if (intent.type === 'bridge' && !toChainAllowed) {
      checks.push(
        createFailCheck(
          'chain-to-blocked',
          'Destination chain',
          `Chain ${intent.toToken.chainId} is not supported`,
        ),
      )
    } else {
      checks.push(
        createPassCheck('chain-allowed', 'Chain allowed', 'Chain is supported'),
      )
    }

    // Token blocklist
    if (fromTokenBlocked) {
      checks.push(
        createFailCheck(
          'token-from-blocked',
          'Source token',
          `${intent.fromToken.symbol} is blocked`,
        ),
      )
    } else if (toTokenBlocked) {
      checks.push(
        createFailCheck(
          'token-to-blocked',
          'Destination token',
          `${intent.toToken.symbol} is blocked`,
        ),
      )
    } else {
      checks.push(
        createPassCheck('token-allowed', 'Token allowed', 'Tokens are allowed'),
      )
    }

    // Contract blocklist
    if (intent.contractAddress && contractBlocked) {
      checks.push(
        createFailCheck(
          'contract-blocked',
          'Contract',
          'Transaction target contract is blocked',
        ),
      )
    }

    // ============================================
    // Risk Policy Checks
    // ============================================

    // Transaction size limit
    const txLimitCheck = evaluateTxLimit(intent, riskPolicy)
    checks.push(txLimitCheck)

    // Slippage check
    const slippageCheck = evaluateSlippage(intent, riskPolicy)
    checks.push(slippageCheck)

    // Gas cost check
    const gasCheck = evaluateGasCost(intent, riskPolicy)
    checks.push(gasCheck)

    // ============================================
    // Session Key Checks (if active)
    // ============================================

    if (activeSession) {
      const sessionChecks = evaluateSessionKey(intent, activeSession)
      checks.push(...sessionChecks)
    }

    // ============================================
    // Aggregate Results
    // ============================================

    const blockingCount = checks.filter((c) => c.status === 'fail').length
    const warningCount = checks.filter((c) => c.status === 'warn').length
    const canProceed = blockingCount === 0 && canTrade

    return {
      canProceed,
      checks,
      blockingCount,
      warningCount,
    }
  }, [
    walletAddress,
    intent,
    riskPolicy,
    systemStatus,
    canTrade,
    statusMessage,
    fromChainAllowed,
    toChainAllowed,
    fromTokenBlocked,
    toTokenBlocked,
    contractBlocked,
    activeSession,
  ])
}

// ============================================
// Helper Functions
// ============================================

function evaluateTxLimit(
  intent: TransactionIntent,
  policy: RiskPolicyConfig,
): PolicyCheck {
  const { amountUsd } = intent
  const { maxSingleTxUsd, requireApprovalAboveUsd } = policy

  if (amountUsd > maxSingleTxUsd) {
    return createFailCheck(
      'tx-limit',
      'Transaction limit',
      `Exceeds ${formatUsd(maxSingleTxUsd)} limit`,
      { current: formatUsd(amountUsd), limit: formatUsd(maxSingleTxUsd) },
    )
  }

  if (amountUsd > requireApprovalAboveUsd) {
    return createWarnCheck(
      'tx-limit',
      'Transaction limit',
      `Above ${formatUsd(requireApprovalAboveUsd)} approval threshold`,
      { current: formatUsd(amountUsd), limit: formatUsd(requireApprovalAboveUsd) },
    )
  }

  return createPassCheck(
    'tx-limit',
    'Transaction limit',
    `${formatUsd(amountUsd)} within limit`,
    { current: formatUsd(amountUsd), limit: formatUsd(maxSingleTxUsd) },
  )
}

function evaluateSlippage(
  intent: TransactionIntent,
  policy: RiskPolicyConfig,
): PolicyCheck {
  const { slippagePercent } = intent
  const { maxSlippagePercent, warnSlippagePercent } = policy

  const formatPercent = (val: number) => `${val.toFixed(2)}%`

  if (slippagePercent > maxSlippagePercent) {
    return createFailCheck(
      'slippage',
      'Slippage',
      `${formatPercent(slippagePercent)} exceeds ${formatPercent(maxSlippagePercent)} limit`,
      { current: formatPercent(slippagePercent), limit: formatPercent(maxSlippagePercent) },
    )
  }

  if (slippagePercent > warnSlippagePercent) {
    return createWarnCheck(
      'slippage',
      'Slippage',
      `${formatPercent(slippagePercent)} is high`,
      { current: formatPercent(slippagePercent), limit: formatPercent(maxSlippagePercent) },
    )
  }

  return createPassCheck(
    'slippage',
    'Slippage',
    `${formatPercent(slippagePercent)} OK`,
    { current: formatPercent(slippagePercent), limit: formatPercent(maxSlippagePercent) },
  )
}

function evaluateGasCost(
  intent: TransactionIntent,
  policy: RiskPolicyConfig,
): PolicyCheck {
  const { gasEstimateUsd, amountUsd } = intent
  const { maxGasPercent, warnGasPercent } = policy

  // Calculate gas as percentage of transaction
  const gasPercent = amountUsd > 0 ? (gasEstimateUsd / amountUsd) * 100 : 0
  const formatPercent = (val: number) => `${val.toFixed(2)}%`

  if (gasPercent > maxGasPercent) {
    return createFailCheck(
      'gas-cost',
      'Gas cost',
      `${formatPercent(gasPercent)} of transaction exceeds ${formatPercent(maxGasPercent)} limit`,
      { current: formatUsd(gasEstimateUsd), limit: formatPercent(maxGasPercent) },
    )
  }

  if (gasPercent > warnGasPercent) {
    return createWarnCheck(
      'gas-cost',
      'Gas cost',
      `${formatPercent(gasPercent)} of transaction is high`,
      { current: formatUsd(gasEstimateUsd), limit: formatPercent(maxGasPercent) },
    )
  }

  return createPassCheck(
    'gas-cost',
    'Gas cost',
    `${formatUsd(gasEstimateUsd)} (${formatPercent(gasPercent)}) OK`,
    { current: formatUsd(gasEstimateUsd), limit: formatPercent(maxGasPercent) },
  )
}

function evaluateSessionKey(
  intent: TransactionIntent,
  session: SessionKeyData,
): PolicyCheck[] {
  const checks: PolicyCheck[] = []

  // Check permission
  const requiredPermission = intent.type
  const hasPermission = session.permissions.includes(requiredPermission as any)

  if (!hasPermission) {
    checks.push(
      createFailCheck(
        'session-permission',
        'Session permission',
        `Session doesn't have "${requiredPermission}" permission`,
      ),
    )
  } else {
    checks.push(
      createPassCheck(
        'session-permission',
        'Session permission',
        `"${requiredPermission}" allowed`,
      ),
    )
  }

  // Check transaction value limit
  if (intent.amountUsd > session.maxValuePerTxUsd) {
    checks.push(
      createFailCheck(
        'session-tx-limit',
        'Session tx limit',
        `Exceeds ${formatUsd(session.maxValuePerTxUsd)} per-transaction limit`,
        { current: formatUsd(intent.amountUsd), limit: formatUsd(session.maxValuePerTxUsd) },
      ),
    )
  }

  // Check remaining budget
  const remainingBudget = session.maxTotalValueUsd - session.totalValueUsedUsd
  if (intent.amountUsd > remainingBudget) {
    checks.push(
      createFailCheck(
        'session-budget',
        'Session budget',
        `Exceeds remaining budget of ${formatUsd(remainingBudget)}`,
        { current: formatUsd(intent.amountUsd), limit: formatUsd(remainingBudget) },
      ),
    )
  } else {
    const budgetPercent = ((session.totalValueUsedUsd + intent.amountUsd) / session.maxTotalValueUsd) * 100
    if (budgetPercent > 80) {
      checks.push(
        createWarnCheck(
          'session-budget',
          'Session budget',
          `Will use ${budgetPercent.toFixed(0)}% of session budget`,
          { current: formatUsd(session.totalValueUsedUsd + intent.amountUsd), limit: formatUsd(session.maxTotalValueUsd) },
        ),
      )
    } else {
      checks.push(
        createPassCheck(
          'session-budget',
          'Session budget',
          `${formatUsd(remainingBudget)} remaining`,
          { current: formatUsd(intent.amountUsd), limit: formatUsd(session.maxTotalValueUsd) },
        ),
      )
    }
  }

  // Check chain allowlist (if not empty, must be in list)
  if (session.chainAllowlist.length > 0) {
    const chainAllowed =
      session.chainAllowlist.includes(intent.fromToken.chainId) &&
      (intent.type !== 'bridge' || session.chainAllowlist.includes(intent.toToken.chainId))

    if (!chainAllowed) {
      checks.push(
        createFailCheck(
          'session-chain',
          'Session chains',
          'Chain not in session allowlist',
        ),
      )
    }
  }

  // Check token allowlist (if not empty, must be in list)
  if (session.tokenAllowlist.length > 0) {
    const fromTokenKey = `${intent.fromToken.chainId}:${intent.fromToken.address.toLowerCase()}`
    const toTokenKey = `${intent.toToken.chainId}:${intent.toToken.address.toLowerCase()}`
    const tokensAllowed =
      session.tokenAllowlist.some((t) => t.toLowerCase() === fromTokenKey) &&
      session.tokenAllowlist.some((t) => t.toLowerCase() === toTokenKey)

    if (!tokensAllowed) {
      checks.push(
        createFailCheck(
          'session-token',
          'Session tokens',
          'Token not in session allowlist',
        ),
      )
    }
  }

  return checks
}
