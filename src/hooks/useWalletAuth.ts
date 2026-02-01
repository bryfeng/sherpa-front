import { useCallback, useEffect, useRef } from 'react'
import { useChainId, useSignMessage } from 'wagmi'

import { useSherpaStore } from '../store'
import { useToastContext } from '../providers/ToastProvider'
import { buildEvmSignInMessage, buildSolanaSignInMessage, bytesToBase64, requestNonce, verifyWalletSignature } from '../services/auth'
import { clearAuthSession, isAuthSessionValid, loadAuthSession, saveAuthSession } from '../services/authStorage'
import { signSolanaMessage } from '../services/wallet'

type ActiveWallet = {
  address: string
  chain: 'ethereum' | 'solana'
}

export function useWalletAuth(activeWallet: ActiveWallet | null) {
  const { signMessageAsync } = useSignMessage()
  const chainId = useChainId()
  const { showToast } = useToastContext()

  const setAuth = useSherpaStore((s) => s.setAuth)
  const clearAuth = useSherpaStore((s) => s.clearAuth)
  const auth = useSherpaStore((s) => s.auth)

  const inFlightRef = useRef(false)
  // Track the previous wallet to detect explicit disconnects vs initial page load
  const prevWalletRef = useRef<ActiveWallet | null | undefined>(undefined)

  const attemptSignIn = useCallback(async () => {
    if (!activeWallet || inFlightRef.current) return
    inFlightRef.current = true
    try {
      setAuth({ status: 'signing', error: null })

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
    } catch (error: any) {
      clearAuthSession()
      const message =
        error?.response?.data?.detail ||
        error?.message ||
        'Unable to sign in with wallet.'
      setAuth({ status: 'error', error: message, session: null })
      showToast(message, 'error')
    } finally {
      inFlightRef.current = false
    }
  }, [activeWallet, chainId, setAuth, signMessageAsync, showToast])

  useEffect(() => {
    // Track previous wallet to distinguish:
    // - Initial page load / wallet reconnecting (no previous connected wallet)
    // - Explicit disconnect (had a connected wallet with address, now null)
    const prevWallet = prevWalletRef.current
    prevWalletRef.current = activeWallet

    if (!activeWallet) {
      // Only clear session if user explicitly disconnected
      // (i.e., we previously had a connected wallet with an address)
      // This handles React StrictMode double-mounting and page refresh correctly
      if (prevWallet?.address) {
        clearAuthSession()
        clearAuth()
      }
      return
    }

    // Don't auto-retry if already signing or if previous attempt errored
    // User can manually retry via the "Retry" button in the header
    if (auth.status === 'signing' || auth.status === 'error') {
      return
    }

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

    const stored = loadAuthSession()
    const isSameWallet =
      stored &&
      (activeWallet.chain === 'solana'
        ? stored.chainId === 'solana' && stored.walletAddress === activeWallet.address
        : stored.walletAddress.toLowerCase() === activeWallet.address.toLowerCase())

    if (stored && isSameWallet && isAuthSessionValid(stored)) {
      setAuth({ status: 'signed_in', error: null, session: stored })
      return
    }

    attemptSignIn()
  }, [activeWallet, attemptSignIn, auth.session, auth.status, clearAuth, setAuth])

  return { retry: attemptSignIn }
}
