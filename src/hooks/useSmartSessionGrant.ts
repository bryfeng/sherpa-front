/**
 * useSmartSessionGrant Hook
 *
 * Handles the on-chain Smart Session grant flow using the Rhinestone SDK.
 *
 * Flow:
 * 1. Fetch backend session key address
 * 2. Build Session object with DCA policies (spending limit, time frame, usage limit)
 * 3. account.experimental_getSessionDetails() → computes EIP-712 digests
 * 4. account.experimental_signEnableSession() → user signs typed data
 * 5. experimental_enableSession() action → build enable call
 * 6. account.sendTransaction() → user signs tx
 * 7. Return session ID + tx hash
 *
 * Called by: frontend/src/components/strategies/StrategyActivationFlow.tsx
 * Calls: backend/app/api/smart_accounts.py:get_session_keypair_public
 */

import { useState, useCallback } from 'react'
import { type Address, type Chain, parseUnits, toHex } from 'viem'
import { base } from 'viem/chains'
import type { RhinestoneAccount, Session, Policy } from '../services/rhinestone'
import type { SessionRequirements } from './useDCASmartSession'
import { experimental_enableSession } from '@rhinestone/sdk/actions/smart-sessions'

// ============================================
// CONSTANTS
// ============================================

const API_BASE =
  (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000'

/** USDC on Base mainnet */
const USDC_BASE: Address = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'

// ============================================
// TYPES
// ============================================

export interface GrantSessionParams {
  /** The RhinestoneAccount instance (must be initialized) */
  account: RhinestoneAccount
  /** Session requirements from DCA strategy */
  requirements: SessionRequirements
  /** Chain to grant session on (defaults to Base) */
  chain?: Chain
}

export interface GrantSessionResult {
  /** On-chain session permission ID (deterministic) */
  sessionId: string
  /** Transaction hash of the enable session tx */
  txHash: string
}

export interface UseSmartSessionGrantReturn {
  grantSession: (params: GrantSessionParams) => Promise<GrantSessionResult>
  isGranting: boolean
  error: string | null
}

// ============================================
// HELPERS
// ============================================

/**
 * Fetch the backend's session key public address.
 * This address will be registered as the session owner on-chain.
 */
async function fetchBackendSessionKeyAddress(): Promise<Address> {
  const response = await fetch(`${API_BASE}/smart-accounts/session-keypair/public`)
  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Failed to fetch session key: ${detail}`)
  }
  const data = await response.json()
  return data.sessionKeyAddress as Address
}

/**
 * Build a viem Account stub from just an address.
 * The SDK session grant only needs the address for on-chain registration;
 * it doesn't need to sign anything with this key during the grant flow.
 */
function addressToAccount(address: Address) {
  return {
    address,
    type: 'json-rpc' as const,
  } as any // Cast needed: SDK OwnerSet.accounts expects Account[]
}

/**
 * Build session policies from DCA requirements.
 */
function buildPolicies(
  requirements: SessionRequirements,
  chain: Chain,
): Policy[] {
  const policies: Policy[] = []

  // Spending limit: convert USD amount to USDC wei (6 decimals)
  const usdcAmount = parseUnits(
    requirements.spendingLimitUsd.toString(),
    6, // USDC has 6 decimals
  )

  // Determine USDC address for the chain
  const usdcAddress: Address =
    chain.id === base.id
      ? USDC_BASE
      : USDC_BASE // Fallback; expand per-chain later

  policies.push({
    type: 'spending-limits',
    limits: [{ token: usdcAddress, amount: usdcAmount }],
  })

  // NOTE: time-frame policy removed — the contract at
  // 0x8177451511de0577b911c254e9551d981c26dc72 on Base does not support
  // initializeWithMultiplexer (selector 0x989c9e46), causing immediate
  // revert with empty data. Spending-limits + usage-limit provide
  // adequate constraints (total cap + execution count).

  // Usage limit: give 2x buffer over expected executions
  const estimatedExecutions = Math.ceil(
    requirements.spendingLimitUsd / 100, // rough: ~$100 per execution
  )
  policies.push({
    type: 'usage-limit',
    limit: BigInt(estimatedExecutions * 2),
  })

  return policies
}

/**
 * Generate a deterministic session ID from session parameters.
 * Used as the Convex record identifier.
 */
function generateSessionId(
  smartAccountAddress: Address,
  backendKeyAddress: Address,
  chain: Chain,
): string {
  // Use a hash of the key components for determinism
  const raw = `${smartAccountAddress}-${backendKeyAddress}-${chain.id}-${Date.now()}`
  // Simple hash - sufficient for DB identifier
  let hash = 0
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return `ss_${Math.abs(hash).toString(36)}_${Date.now().toString(36)}`
}

// ============================================
// HOOK
// ============================================

export function useSmartSessionGrant(): UseSmartSessionGrantReturn {
  const [isGranting, setIsGranting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const grantSession = useCallback(
    async (params: GrantSessionParams): Promise<GrantSessionResult> => {
      const { account, requirements, chain = base } = params

      setIsGranting(true)
      setError(null)

      try {
        // 1. Fetch backend session key address
        const backendKeyAddress = await fetchBackendSessionKeyAddress()

        // 2. Build Session object with policies
        const policies = buildPolicies(requirements, chain)

        const session: Session = {
          chain,
          owners: {
            type: 'ecdsa',
            accounts: [addressToAccount(backendKeyAddress)],
          },
          actions: [
            {
              // No target/selector constraint = allow any contract call
              // Policies enforce the spending/time/usage limits
              policies: policies as [Policy, ...Policy[]],
            },
          ],
        }

        // 3. Get session details (computes EIP-712 digests)
        console.log('[SmartSessionGrant] Step 3: Getting session details...')
        const details = await account.experimental_getSessionDetails([session])

        // 4. User signs EIP-712 typed data (wallet popup)
        console.log('[SmartSessionGrant] Step 4: Requesting EIP-712 signature...')
        const enableSignature = await account.experimental_signEnableSession(details)

        // 5. Build the enable session call using the SDK action
        console.log('[SmartSessionGrant] Step 5: Building enable session call...')
        const enableCall = experimental_enableSession(
          session,                       // Session to enable
          enableSignature,               // User's EIP-712 signature
          details.hashesAndChainIds,     // Digests for multi-chain verification
          0,                             // Index: first (only) session in batch
        )

        // 6. Submit transaction (user signs deployment tx)
        // sponsored: true lets the Rhinestone orchestrator pay gas,
        // so the smart account doesn't need pre-funded ETH.
        console.log('[SmartSessionGrant] Step 6: Submitting transaction (sponsored)...')
        const txResult = await account.sendTransaction({
          chain,
          calls: [enableCall],
          sponsored: true,
        })

        // 7. Wait for execution confirmation
        console.log('[SmartSessionGrant] Step 7: Waiting for execution...', txResult)
        const status = await account.waitForExecution(txResult)

        // 8. Generate session ID and extract tx hash
        const smartAccountAddress = account.getAddress()
        const sessionId = generateSessionId(
          smartAccountAddress,
          backendKeyAddress,
          chain,
        )

        const txHash = status.fill?.hash ?? toHex(0n)

        return {
          sessionId,
          txHash: txHash as string,
        }
      } catch (err) {
        console.error('[SmartSessionGrant] Error:', err)
        const message =
          err instanceof Error ? err.message : 'Failed to grant smart session'
        setError(message)
        throw err
      } finally {
        setIsGranting(false)
      }
    },
    [],
  )

  return {
    grantSession,
    isGranting,
    error,
  }
}
