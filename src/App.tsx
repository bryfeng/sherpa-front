/**
 * SHERPA APP - Redesigned with Widget System
 *
 * Main application entry point with:
 * - Zustand store for centralized state
 * - New design system integration
 * - Premium header with persona selector
 * - Web3 wallet integration (wagmi + AppKit)
 * - New widget system for workspace
 */

import { useEffect, useMemo, useState } from 'react'
import { useAccount, useReconnect } from 'wagmi'
import { useAppKitAccount } from '@reown/appkit/react'

// Store
import { useSherpaStore } from './store'
import type { PersonaId } from './store'

// Services
import { api } from './services/api'

// Types
import type { EntitlementSnapshot } from './types/entitlement'
import type { LLMProviderInfo } from './types/llm'

// Components
import { ToastProvider } from './providers/ToastProvider'
import WidgetPlayground from './pages/WidgetPlayground'
import DeFiChatAdaptiveUI from './pages/DeFiChatAdaptiveUI'

// Hooks
import { usePortfolioSummary } from './workspace/hooks'

// Styles - Import new design system
import './styles/design-system.css'

// ============================================
// WALLET SYNC HOOK
// Syncs Web3 wallet state with Zustand store
// ============================================

function useWalletSync() {
  const { address, isConnected } = useAccount()
  const { reconnectAsync } = useReconnect()
  const evmAppKitAccount = useAppKitAccount({ namespace: 'eip155' })
  const solanaAccount = useAppKitAccount({ namespace: 'solana' })

  const setWallet = useSherpaStore((s) => s.setWallet)
  const clearWallet = useSherpaStore((s) => s.clearWallet)

  // Attempt to reconnect wagmi on mount
  useEffect(() => {
    reconnectAsync().catch(() => {})
  }, [reconnectAsync])

  // Resolve the active wallet from various sources
  const activeWallet = useMemo(() => {
    // Priority: Solana > wagmi EVM > AppKit EVM
    if (solanaAccount.isConnected && solanaAccount.address) {
      return { address: solanaAccount.address, chain: 'solana' as const, isConnected: true }
    }
    if (isConnected && address) {
      return { address, chain: 'ethereum' as const, isConnected: true }
    }
    if (evmAppKitAccount.isConnected && evmAppKitAccount.address) {
      return { address: evmAppKitAccount.address, chain: 'ethereum' as const, isConnected: true }
    }
    return null
  }, [
    address,
    isConnected,
    evmAppKitAccount.address,
    evmAppKitAccount.isConnected,
    solanaAccount.address,
    solanaAccount.isConnected,
  ])

  // Sync wallet state to store
  useEffect(() => {
    if (activeWallet) {
      setWallet({
        address: activeWallet.address,
        chain: activeWallet.chain,
        isConnected: true,
        isManual: false,
      })
    } else {
      clearWallet()
    }
  }, [activeWallet, setWallet, clearWallet])

  return activeWallet
}

// ============================================
// LLM PROVIDERS HOOK
// Fetches available LLM providers from backend
// ============================================

function useLLMProviders() {
  const [llmProviders, setLlmProviders] = useState<LLMProviderInfo[]>([])
  const [llmProvidersLoading, setLlmProvidersLoading] = useState(true)

  const llmModel = useSherpaStore((s) => s.llmModel)
  const setLlmModel = useSherpaStore((s) => s.setLlmModel)

  useEffect(() => {
    let cancelled = false

    const fetchProviders = async () => {
      setLlmProvidersLoading(true)
      try {
        const res = await api.llmProviders()
        if (cancelled) return

        const providers = Array.isArray(res?.providers)
          ? (res.providers as LLMProviderInfo[])
          : []
        setLlmProviders(providers)

        // Build set of available models
        const availableModels = new Set<string>()
        for (const provider of providers) {
          if (provider.status === 'available') {
            for (const model of provider.models || []) {
              if (model?.id) availableModels.add(model.id)
            }
          }
        }

        // Determine default model
        const serverDefaultModel =
          typeof res?.default_model === 'string' && res.default_model.trim().length
            ? res.default_model.trim()
            : undefined
        const providerDefaultModel = providers.find(
          (p) => p.id === res?.default_provider
        )?.default_model

        // Update model if current is invalid
        if (llmModel && (availableModels.size === 0 || availableModels.has(llmModel))) {
          // Keep current model
        } else if (serverDefaultModel) {
          setLlmModel(serverDefaultModel)
        } else if (providerDefaultModel) {
          setLlmModel(providerDefaultModel)
        } else if (availableModels.size > 0) {
          setLlmModel(Array.from(availableModels)[0])
        }
      } catch (error) {
        if (!cancelled) {
          console.warn('Failed to load LLM providers', error)
        }
      } finally {
        if (!cancelled) {
          setLlmProvidersLoading(false)
        }
      }
    }

    fetchProviders()

    return () => {
      cancelled = true
    }
  }, [llmModel, setLlmModel])

  return { llmProviders, llmProvidersLoading }
}

// ============================================
// ENTITLEMENT HOOK
// Manages pro/entitlement state
// ============================================

function useEntitlementSync(walletAddress: string | null, walletChain: string) {
  const setEntitlement = useSherpaStore((s) => s.setEntitlement)
  const setProOverride = useSherpaStore((s) => s.setProOverride)
  const entitlement = useSherpaStore((s) => s.entitlement)
  const proOverride = useSherpaStore((s) => s.proOverride)

  useEffect(() => {
    if (!walletAddress) {
      setEntitlement({ status: 'idle', pro: false, chain: null })
      return
    }

    if (walletChain !== 'ethereum') {
      setEntitlement({
        status: 'disabled',
        pro: false,
        chain: walletChain,
        gating: 'disabled',
        reason: 'Entitlement checks are currently available for EVM wallets only.',
      })
      setProOverride(false)
      return
    }

    let cancelled = false
    setEntitlement({
      status: 'loading',
      pro: entitlement.pro && entitlement.status === 'ready',
      chain: walletChain,
    })

    api
      .entitlement(walletAddress, walletChain)
      .then((res) => {
        if (cancelled) return
        const status: EntitlementSnapshot['status'] =
          res.gating === 'disabled' ? 'disabled' : 'ready'
        setEntitlement({
          status,
          pro: Boolean(res.pro),
          gating: res.gating,
          chain: res.chain ?? null,
          standard: res.standard ?? null,
          tokenAddress: res.token_address ?? null,
          tokenId: res.token_id ?? null,
          reason: res.reason ?? null,
          checkedAt: res.checked_at,
          metadata: res.metadata ?? {},
        })
        if (res.pro) setProOverride(false)
      })
      .catch((err) => {
        if (cancelled) return
        setEntitlement({
          status: 'error',
          pro: false,
          chain: null,
          reason: err?.message || 'Failed to load entitlement.',
        })
      })

    return () => {
      cancelled = true
    }
  }, [walletAddress, walletChain, setEntitlement, setProOverride])

  const gatingActive = entitlement.status === 'ready' && entitlement.gating === 'token'
  const isPro = entitlement.pro || (!gatingActive && proOverride)

  return { entitlement, isPro, gatingActive }
}

// ============================================
// HEALTH CHECK HOOK
// ============================================

function useHealthCheck() {
  const setHealthStatus = useSherpaStore((s) => s.setHealthStatus)
  const healthStatus = useSherpaStore((s) => s.healthStatus)
  const isTestEnv = ((import.meta as any).env?.MODE || '').toLowerCase() === 'test'

  useEffect(() => {
    if (isTestEnv) {
      setHealthStatus('healthy')
      return
    }

    api
      .health()
      .then((h) => {
        setHealthStatus(h?.status === 'healthy' ? 'healthy' : 'degraded')
      })
      .catch(() => {
        setHealthStatus('offline')
      })
  }, [isTestEnv, setHealthStatus])

  return healthStatus
}

// ============================================
// MAIN APP COMPONENT
// ============================================

function MainApp() {
  // Store state
  const theme = useSherpaStore((s) => s.theme)
  const persona = useSherpaStore((s) => s.persona)
  const setPersona = useSherpaStore((s) => s.setPersona)
  const llmModel = useSherpaStore((s) => s.llmModel)
  const wallet = useSherpaStore((s) => s.wallet)

  // Sync wallet state
  useWalletSync()

  // Hooks
  useHealthCheck()
  useLLMProviders()
  const { isPro } = useEntitlementSync(wallet.address, wallet.chain)

  // Portfolio data
  const {
    data: portfolioSummary,
    refresh: refreshPortfolio,
  } = usePortfolioSummary({
    walletAddress: wallet.address ?? undefined,
    chain: wallet.chain,
  })

  // Theme sync with DOM
  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('theme-snow', 'theme-light')
    if (theme === 'light') {
      root.classList.add('theme-snow', 'theme-light')
    }
    root.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme === 'light' ? 'snow' : 'default')
  }, [theme])

  // Persona sync with DOM
  useEffect(() => {
    document.documentElement.setAttribute('data-persona', persona)
  }, [persona])

  // LLM model persistence
  useEffect(() => {
    if (llmModel) {
      localStorage.setItem('sherpa.llm_model', llmModel)
    }
  }, [llmModel])

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--bg)', color: 'var(--text)' }}
      data-persona={persona}
    >
      <main className="flex-1">
        <DeFiChatAdaptiveUI
          persona={persona}
          setPersona={setPersona}
          walletAddress={wallet.address ?? undefined}
          pro={isPro}
          entitlement={useSherpaStore.getState().entitlement}
          onRequestPro={(source) => {
            console.log('Pro requested from:', source)
          }}
          portfolioSummary={portfolioSummary ?? undefined}
          portfolioStatus={portfolioSummary ? 'success' : 'idle'}
          onRefreshPortfolio={async () => { await refreshPortfolio() }}
          llmModel={llmModel}
        />
      </main>
    </div>
  )
}

// ============================================
// APP ENTRY POINT
// ============================================

export function App() {
  // Check for playground route
  const isPlaygroundRoute =
    typeof window !== 'undefined' &&
    window.location.pathname.includes('widget-playground')

  if (isPlaygroundRoute) {
    return <WidgetPlayground />
  }

  return (
    <ToastProvider>
      <MainApp />
    </ToastProvider>
  )
}

// Re-export PersonaId for compatibility
export type { PersonaId }
