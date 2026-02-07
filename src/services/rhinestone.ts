/**
 * Rhinestone SDK Service
 *
 * Singleton initialization for the Rhinestone SDK and smart account factory.
 * Uses Kernel v3.3 accounts with ECDSA ownership and Smart Sessions enabled.
 *
 * Called by: frontend/src/hooks/useRhinestoneAccount.ts
 */

import {
  createRhinestoneAccount,
  walletClientToAccount,
  type RhinestoneAccount,
  type RhinestoneAccountConfig,
  type Session,
  type Policy,
} from '@rhinestone/sdk'
import { type WalletClient, type Chain } from 'viem'
import { base } from 'viem/chains'

// Re-export types consumers need
export type { RhinestoneAccount, RhinestoneAccountConfig, Session, Policy }
export { walletClientToAccount }

// ============================================
// CONSTANTS
// ============================================

const RHINESTONE_API_KEY = (import.meta as any).env?.VITE_RHINESTONE_API_KEY ?? ''
const ALCHEMY_API_KEY = (import.meta as any).env?.VITE_ALCHEMY_API_KEY ?? ''

/** Default chain for smart account deployment */
export const DEFAULT_DEPLOY_CHAIN: Chain = base

// ============================================
// ACCOUNT FACTORY
// ============================================

/**
 * Create a Rhinestone smart account from a wagmi wallet client.
 *
 * The account is deterministic - calling with the same owner yields the same
 * address. The account is NOT deployed on-chain until `account.deploy()` or
 * the first `sendTransaction()` call.
 */
export async function createSmartAccount(
  walletClient: WalletClient,
): Promise<RhinestoneAccount> {
  if (!walletClient.account) {
    throw new Error('Wallet client must have an account connected')
  }

  // Convert wagmi WalletClient to a viem Account the SDK understands
  const owner = walletClientToAccount(walletClient)

  // createRhinestoneAccount accepts RhinestoneConfig = RhinestoneAccountConfig & RhinestoneSDKConfig
  // RhinestoneSDKConfig is not exported, so we use Parameters utility type
  const config: Parameters<typeof createRhinestoneAccount>[0] = {
    // Account implementation
    account: {
      type: 'kernel',
      version: '3.3',
    },

    // Owner validation
    owners: {
      type: 'ecdsa',
      accounts: [owner],
    },

    // Enable Smart Sessions module at deploy time
    experimental_sessions: {
      enabled: true,
    },

    // Provider for RPC
    ...(ALCHEMY_API_KEY
      ? { provider: { type: 'alchemy' as const, apiKey: ALCHEMY_API_KEY } }
      : {}),

    // Rhinestone API key for orchestrator
    ...(RHINESTONE_API_KEY ? { apiKey: RHINESTONE_API_KEY } : {}),
  }

  return createRhinestoneAccount(config)
}
