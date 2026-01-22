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
    if (!activeWallet) {
      clearAuthSession()
      clearAuth()
      return
    }

    if (auth.status === 'signing') {
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
