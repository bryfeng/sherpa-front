import { useCallback, useEffect, useRef } from 'react'
import { useChainId, useSignMessage } from 'wagmi'

import { useSherpaStore } from '../store'
import { useToastContext } from '../providers/ToastProvider'
import { buildEvmSignInMessage, buildSolanaSignInMessage, bytesToBase64, requestNonce, verifyWalletSignature } from '../services/auth'
import { clearAuthSession, isAuthSessionValid, loadAuthSession, saveAuthSession, type StoredAuthSession } from '../services/authStorage'
import { signSolanaMessage } from '../services/wallet'

type ActiveWallet = {
  address: string
  chain: 'ethereum' | 'solana'
}

// Use localStorage to track sign-in state to survive HMR and app crashes
const SIGNING_KEY = 'sherpa.auth.signing'
const SIGNING_TIMEOUT_MS = 60_000 // Consider stale after 60 seconds

interface SigningState {
  address: string
  startedAt: number
}

function getSigningState(): SigningState | null {
  try {
    const raw = localStorage.getItem(SIGNING_KEY)
    if (!raw) return null
    const state = JSON.parse(raw) as SigningState
    const age = Date.now() - state.startedAt
    // Check if signing state is stale (older than timeout)
    if (age > SIGNING_TIMEOUT_MS) {
      localStorage.removeItem(SIGNING_KEY)
      return null
    }
    return state
  } catch {
    return null
  }
}

function setSigningState(address: string): void {
  localStorage.setItem(SIGNING_KEY, JSON.stringify({ address, startedAt: Date.now() }))
}

function clearSigningState(): void {
  localStorage.removeItem(SIGNING_KEY)
}

// Module-level promise for within-session deduplication
let globalSignInPromise: Promise<StoredAuthSession | null> | null = null
let globalSignInAddress: string | null = null

export function useWalletAuth(activeWallet: ActiveWallet | null) {
  const { signMessageAsync } = useSignMessage()
  const chainId = useChainId()
  const { showToast } = useToastContext()

  const setAuth = useSherpaStore((s) => s.setAuth)
  const clearAuth = useSherpaStore((s) => s.clearAuth)
  const auth = useSherpaStore((s) => s.auth)

  // Track the previous wallet to detect explicit disconnects vs initial page load
  const prevWalletRef = useRef<ActiveWallet | null | undefined>(undefined)

  const attemptSignIn = useCallback(async () => {
    if (!activeWallet) return

    // Check localStorage for existing sign-in in progress (survives HMR/crashes)
    const existingSigningState = getSigningState()
    if (existingSigningState) {
      const signingAddressMatch = existingSigningState.address.toLowerCase() === activeWallet.address.toLowerCase()
      if (signingAddressMatch) {
        setAuth({ status: 'signing', error: null })
        return
      }
    }

    // Also check module-level promise for within-session deduplication
    if (globalSignInPromise && globalSignInAddress === activeWallet.address) {
      try {
        const session = await globalSignInPromise
        if (session) {
          setAuth({ status: 'signed_in', error: null, session })
        }
      } catch {
        // Error already handled by original caller
      }
      return
    }

    // Mark signing in progress in localStorage
    setSigningState(activeWallet.address)
    setAuth({ status: 'signing', error: null })

    // Create the sign-in promise
    const signInPromise = (async (): Promise<StoredAuthSession | null> => {
      try {
        const nonce = await requestNonce(activeWallet.address, activeWallet.chain)

        const domain = window.location.host
        const uri = window.location.origin

        let message = ''
        let signature = ''

        if (activeWallet.chain === 'solana') {
          message = buildSolanaSignInMessage({
            domain,
            address: activeWallet.address,
            nonce: nonce.nonce,
            uri,
          })
          const signatureBytes = await signSolanaMessage(message)
          signature = bytesToBase64(signatureBytes)
        } else {
          const evmChainId = Number.isFinite(chainId) ? chainId : 1
          message = buildEvmSignInMessage({
            domain,
            address: activeWallet.address,
            nonce: nonce.nonce,
            chainId: evmChainId,
            uri,
          })
          signature = await signMessageAsync({ message })
        }

        const session = await verifyWalletSignature({
          message,
          signature,
          chain: activeWallet.chain,
        })

        saveAuthSession(session)
        setAuth({ status: 'signed_in', error: null, session })
        return session
      } catch (error: any) {
        clearAuthSession()
        const errorMessage =
          error?.response?.data?.detail ||
          error?.message ||
          'Unable to sign in with wallet.'
        setAuth({ status: 'error', error: errorMessage, session: null })
        showToast(errorMessage, 'error')
        throw error
      } finally {
        // Clear both localStorage and module-level tracking when done
        clearSigningState()
        globalSignInPromise = null
        globalSignInAddress = null
      }
    })()

    // Store globally so remounted components can wait for it
    globalSignInPromise = signInPromise
    globalSignInAddress = activeWallet.address

    await signInPromise
  }, [activeWallet, chainId, setAuth, signMessageAsync, showToast])

  useEffect(() => {
    // Track previous wallet to distinguish explicit disconnect vs initial load
    const prevWallet = prevWalletRef.current
    prevWalletRef.current = activeWallet

    if (!activeWallet) {
      // Only clear session if user explicitly disconnected
      // (i.e., we previously had a connected wallet with an address)
      if (prevWallet?.address) {
        clearAuthSession()
        clearAuth()
      }
      return
    }

    // Don't auto-retry if already signing or if previous attempt errored
    if (auth.status === 'signing' || auth.status === 'error') {
      return
    }

    // Check if already signed in with valid session
    if (auth.status === 'signed_in' && auth.session) {
      const sessionMatches =
        activeWallet.chain === 'solana'
          ? auth.session.chainId === 'solana' && auth.session.walletAddress === activeWallet.address
          : auth.session.chainId !== 'solana' &&
            auth.session.walletAddress.toLowerCase() === activeWallet.address.toLowerCase()
      if (sessionMatches && isAuthSessionValid(auth.session)) {
        return
      }
    }

    // Try to restore session from localStorage
    const stored = loadAuthSession()
    const isSameWallet =
      stored &&
      (activeWallet.chain === 'solana'
        ? stored.chainId === 'solana' && stored.walletAddress === activeWallet.address
        : stored.walletAddress.toLowerCase() === activeWallet.address.toLowerCase())
    const isValid = stored ? isAuthSessionValid(stored) : false

    if (stored && isSameWallet && isValid) {
      setAuth({ status: 'signed_in', error: null, session: stored })
      return
    }

    // No valid stored session, attempt sign-in
    attemptSignIn()
  }, [activeWallet, attemptSignIn, auth.session, auth.status, clearAuth, setAuth])

  return { retry: attemptSignIn }
}
