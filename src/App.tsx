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

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAccount, useDisconnect as useWagmiDisconnect, useReconnect } from 'wagmi'
import { useAppKitAccount, useDisconnect as useAppKitDisconnect, useAppKit } from '@reown/appkit/react'
import { motion, AnimatePresence } from 'framer-motion'

// Store
import { useSherpaStore } from './store'
import type { PersonaId } from './store'

// Widget Store
import { useWidgetStore, useWidgetPicker } from './store/widget-store'

// Services
import { api } from './services/api'

// Types
import type { EntitlementSnapshot } from './types/entitlement'
import type { LLMProviderInfo } from './types/llm'
import type { Widget } from './types/widget-system'

// Components
import { PersonaSelector } from './components/header/PersonaSelector'
import { SettingsMenu } from './components/header/SettingsMenu'
import { ToastProvider } from './providers/ToastProvider'
import WidgetPlayground from './pages/WidgetPlayground'

// Widget Components
import { WidgetBase, WidgetGrid, WidgetPicker, WidgetContent } from './components/widgets'

// Hooks
import { usePortfolioSummary } from './workspace/hooks'
import { useChatEngine } from './hooks/useChatEngine'

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
// CHAT PANEL COMPONENT
// ============================================

interface ChatPanelProps {
  walletAddress?: string
  llmModel?: string
  onPortfolioRequested: () => void
}

function ChatPanel({ walletAddress, llmModel, onPortfolioRequested }: ChatPanelProps) {
  const addWidget = useWidgetStore((s) => s.addWidget)

  const {
    messages,
    inputValue,
    isTyping,
    scrollRef,
    inputRef,
    setInputValue,
    send,
    canSend,
  } = useChatEngine({
    walletAddress,
    llmModel,
    onNewWidgets: (widgets) => {
      // Add widgets from chat to workspace
      widgets.forEach((w) => {
        addWidget({
          kind: w.kind as any,
          title: w.title,
          payload: w.payload,
        })
      })
    },
    onPortfolioRequested,
  })

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
        style={{ minHeight: '300px', maxHeight: 'calc(100vh - 400px)' }}
      >
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <div
              className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
              style={{ background: 'var(--accent-muted)' }}
            >
              <svg
                className="w-8 h-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                style={{ color: 'var(--accent)' }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="font-semibold mb-2" style={{ color: 'var(--text)' }}>
              Start a conversation
            </h3>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Ask me about your portfolio, market trends, or DeFi strategies.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                  msg.role === 'user' ? 'rounded-br-md' : 'rounded-bl-md'
                }`}
                style={{
                  background: msg.role === 'user' ? 'var(--accent)' : 'var(--surface-2)',
                  color: msg.role === 'user' ? 'var(--text-inverse)' : 'var(--text)',
                }}
              >
                {msg.typing ? (
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t" style={{ borderColor: 'var(--line)' }}>
        <div
          className="flex items-end gap-2 p-3 rounded-xl"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--line)' }}
        >
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Sherpa anything..."
            rows={1}
            className="flex-1 resize-none outline-none text-sm bg-transparent"
            style={{ color: 'var(--text)', minHeight: '24px', maxHeight: '120px' }}
          />
          <button
            onClick={send}
            disabled={!canSend || isTyping}
            className="p-2 rounded-lg transition-colors disabled:opacity-50"
            style={{
              background: canSend ? 'var(--accent)' : 'var(--surface)',
              color: canSend ? 'var(--text-inverse)' : 'var(--text-muted)',
            }}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================
// MAIN APP COMPONENT
// ============================================

function MainApp() {
  const isTestEnv = ((import.meta as any).env?.MODE || '').toLowerCase() === 'test'
  const hasModal = Boolean(import.meta.env.VITE_WALLETCONNECT_PROJECT_ID)

  // Store state
  const theme = useSherpaStore((s) => s.theme)
  const setTheme = useSherpaStore((s) => s.setTheme)
  const persona = useSherpaStore((s) => s.persona)
  const setPersona = useSherpaStore((s) => s.setPersona)
  const llmModel = useSherpaStore((s) => s.llmModel)
  const setLlmModel = useSherpaStore((s) => s.setLlmModel)
  const wallet = useSherpaStore((s) => s.wallet)
  const setProOverride = useSherpaStore((s) => s.setProOverride)

  // Widget store
  const widgets = useWidgetStore((s) => s.widgets)
  const { isOpen: isPickerOpen } = useWidgetPicker()

  // Manual wallet state (for when WalletConnect isn't available)
  const [manualWallet, setManualWallet] = useState<{
    address: string
    chain: 'ethereum' | 'solana'
  } | null>(null)

  // Workspace visibility
  const [workspaceVisible, setWorkspaceVisible] = useState(true)

  // Web3 hooks
  const { disconnect: disconnectEvm } = useWagmiDisconnect()
  const { disconnect: disconnectAppKit } = useAppKitDisconnect()
  const { open: openAppKit } = useAppKit()

  // Sync wallet state
  const activeWallet = useWalletSync()

  // Determine resolved wallet (active or manual)
  const resolvedWallet = activeWallet ?? manualWallet

  // Update store with manual wallet if needed
  useEffect(() => {
    if (manualWallet && !activeWallet) {
      useSherpaStore.getState().setWallet({
        address: manualWallet.address,
        chain: manualWallet.chain,
        isConnected: true,
        isManual: true,
      })
    }
  }, [manualWallet, activeWallet])

  // Clear manual wallet when real wallet connects
  useEffect(() => {
    if (activeWallet && manualWallet) {
      setManualWallet(null)
    }
  }, [activeWallet, manualWallet])

  // Hooks
  useHealthCheck()
  const { llmProviders, llmProvidersLoading } = useLLMProviders()
  const { isPro, gatingActive } = useEntitlementSync(
    wallet.address,
    wallet.chain
  )

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

  // Handle disconnect
  const handleDisconnect = useCallback(async () => {
    if (wallet.chain === 'solana') {
      await disconnectAppKit({ namespace: 'solana' }).catch((error) => {
        console.warn('Failed to disconnect Solana wallet', error)
      })
      setManualWallet(null)
      return
    }

    await Promise.allSettled([
      (async () => {
        try {
          await disconnectEvm()
        } catch (e) {
          console.warn('Failed to disconnect EVM', e)
        }
      })(),
      (async () => {
        try {
          await disconnectAppKit({ namespace: 'eip155' })
        } catch (e) {
          console.warn('Failed to disconnect AppKit EVM', e)
        }
      })(),
    ])
    setManualWallet(null)
  }, [wallet.chain, disconnectEvm, disconnectAppKit])

  // Handle connect
  const handleConnect = useCallback(() => {
    if (hasModal && !isTestEnv) {
      openAppKit()
    } else {
      // Manual wallet input fallback
      const input = window.prompt('Paste a wallet address (0x… or Solana base58)')
      if (!input) return
      if (/^0x[a-fA-F0-9]{40}$/.test(input)) {
        setManualWallet({ address: input, chain: 'ethereum' })
        return
      }
      if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(input)) {
        setManualWallet({ address: input, chain: 'solana' })
        return
      }
      window.alert(
        'Address must be a 0x-prefixed EVM wallet or a Solana base58 string (32–44 characters).'
      )
    }
  }, [hasModal, isTestEnv, openAppKit])

  // Handle new chat
  const handleNewChat = useCallback(() => {
    useSherpaStore.getState().startNewChat()
  }, [])

  // Settings menu
  const settingsMenu = (
    <SettingsMenu
      selectedModel={llmModel}
      onSelectModel={setLlmModel}
      providers={llmProviders}
      loading={llmProvidersLoading}
    />
  )

  // Widget renderer
  const renderWidget = useCallback(
    (widget: Widget) => (
      <WidgetBase widget={widget}>
        <WidgetContent
          widget={widget}
          walletAddress={wallet.address ?? undefined}
          isPro={isPro}
        />
      </WidgetBase>
    ),
    [wallet.address, isPro]
  )

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--bg)', color: 'var(--text)' }}
      data-persona={persona}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-30 border-b"
        style={{
          background: 'var(--bg)',
          borderColor: 'var(--line)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div className="flex items-center justify-between px-6 py-3">
          {/* Left: Logo + Persona */}
          <div className="flex items-center gap-6">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, var(--accent), var(--color-secondary, #4da6ff))',
                  boxShadow: '0 0 20px rgba(245, 166, 35, 0.15)',
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ color: 'var(--text-inverse)' }}
                >
                  <path d="M8 21l4-10 4 10" />
                  <path d="M12 11l-4-5 8 0 -4 5" />
                </svg>
              </div>
              <div>
                <h1
                  className="font-semibold text-lg tracking-tight"
                  style={{ color: 'var(--text)', fontFamily: 'var(--font-display, Outfit, system-ui)' }}
                >
                  Sherpa
                </h1>
                <p
                  className="text-[10px] font-medium uppercase tracking-wider -mt-0.5"
                  style={{ color: 'var(--text-muted)' }}
                >
                  AI Portfolio Guide
                </p>
              </div>
            </div>

            {/* Divider */}
            <div className="w-px h-6 hidden sm:block" style={{ background: 'var(--line)' }} />

            {/* Persona Selector */}
            <div className="hidden sm:block">
              <PersonaSelector value={persona} onChange={setPersona} />
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {/* Settings */}
            {settingsMenu}

            {/* Theme toggle */}
            <motion.button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-lg transition-colors"
              style={{ color: 'var(--text-muted)', background: 'transparent' }}
              whileHover={{ backgroundColor: 'var(--color-hover)' }}
              whileTap={{ scale: 0.95 }}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={theme}
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {theme === 'dark' ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  )}
                </motion.div>
              </AnimatePresence>
            </motion.button>

            {/* New Chat */}
            <motion.button
              onClick={handleNewChat}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium"
              style={{ color: 'var(--text-muted)', background: 'transparent' }}
              whileHover={{ backgroundColor: 'var(--color-hover)' }}
              whileTap={{ scale: 0.98 }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:inline">New Chat</span>
            </motion.button>

            {/* Wallet */}
            {wallet.address ? (
              <motion.button
                onClick={handleDisconnect}
                className="flex items-center gap-2 px-3 py-2 rounded-lg"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--line)' }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="w-2 h-2 rounded-full" style={{ background: 'var(--success)' }} />
                <span className="text-sm font-mono font-medium" style={{ color: 'var(--text)' }}>
                  {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                </span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--text-muted)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </motion.button>
            ) : (
              <motion.button
                onClick={handleConnect}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: 'var(--accent)', color: 'var(--text-inverse)' }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                <span>Connect</span>
              </motion.button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-6 py-6">
        <div
          className="rounded-xl overflow-hidden"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            maxWidth: '1800px',
            margin: '0 auto',
          }}
        >
          {/* Workspace Toggle */}
          <div
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: 'var(--line)', background: 'var(--surface-2)' }}
          >
            <div className="flex items-center gap-3">
              <motion.button
                onClick={() => setWorkspaceVisible(!workspaceVisible)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium"
                style={{ background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--text)' }}
                whileHover={{ borderColor: 'var(--accent)' }}
                whileTap={{ scale: 0.98 }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {workspaceVisible ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  )}
                </svg>
                <span>Workspace</span>
                {widgets.length > 0 && (
                  <span
                    className="px-1.5 py-0.5 text-xs rounded-full"
                    style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}
                  >
                    {widgets.length}
                  </span>
                )}
              </motion.button>
            </div>
          </div>

          {/* Split Layout */}
          <div className="flex flex-col lg:flex-row">
            {/* Chat Panel */}
            <div
              className={`${workspaceVisible ? 'lg:w-[400px] lg:border-r' : 'flex-1'} flex-shrink-0`}
              style={{ borderColor: 'var(--line)' }}
            >
              <div
                className="px-4 py-3 border-b"
                style={{ borderColor: 'var(--line)' }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="text-xs font-medium uppercase tracking-wider"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Chat
                  </span>
                  <span
                    className="px-2 py-0.5 text-xs rounded-full"
                    style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}
                  >
                    Active
                  </span>
                </div>
              </div>
              <ChatPanel
                walletAddress={wallet.address ?? undefined}
                llmModel={llmModel}
                onPortfolioRequested={refreshPortfolio}
              />
            </div>

            {/* Workspace Panel */}
            <AnimatePresence>
              {workspaceVisible && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex-1 overflow-hidden"
                >
                  <WidgetGrid renderWidget={renderWidget} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Widget Picker Modal */}
      <WidgetPicker hasPro={isPro} walletAddress={wallet.address} />
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
