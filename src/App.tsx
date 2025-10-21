import { useEffect, useMemo, useState } from 'react'
// Old UI imports kept for reference
// import { PersonaSwitcher } from './components/personas/PersonaSwitcher'
// import { ChatContainer } from './components/chat/ChatContainer'
// import { PanelManager } from './components/panels/PanelManager'
import { api } from './services/api'
import type { EntitlementSnapshot } from './types/entitlement'
import { useAccount, useDisconnect, useReconnect } from 'wagmi'
import { useAppKitAccount } from '@reown/appkit/react'
import { truncateAddress } from './services/wallet'
import { AppKitButton } from '@reown/appkit/react'
import DeFiChatAdaptiveUI from './pages/DeFiChatAdaptiveUI'
import WidgetPlayground from './pages/WidgetPlayground'
import { usePortfolioSummary } from './workspace/hooks'
import { SettingsMenu } from './components/header/SettingsMenu'
import type { LLMProviderInfo } from './types/llm'

export type PersonaId = 'friendly' | 'technical' | 'professional' | 'educational'

function MainApp() {
  const isTestEnv = ((import.meta as any).env?.MODE || '').toLowerCase() === 'test'
  const [persona, setPersona] = useState<PersonaId>('friendly')
  const [theme, setTheme] = useState<'default' | 'snow'>(() => (localStorage.getItem('theme') as any) || 'snow')
  const [health, setHealth] = useState<string>('checking…')
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [entitlement, setEntitlement] = useState<EntitlementSnapshot>({ status: 'idle', pro: false, chain: null })
  const [proOverride, setProOverride] = useState(false)
  const [llmModel, setLlmModel] = useState<string>(() => localStorage.getItem('sherpa.llm_model') || 'claude-3-5-sonnet-20241022')
  const [llmProviders, setLlmProviders] = useState<LLMProviderInfo[]>([])
  const [llmProvidersLoading, setLlmProvidersLoading] = useState<boolean>(true)
  const { address, isConnected } = useAccount()
  const { reconnectAsync } = useReconnect()
  const { address: akAddress, isConnected: akConnected } = useAppKitAccount()
  const { disconnect } = useDisconnect()
  const hasModal = Boolean(import.meta.env.VITE_WALLETCONNECT_PROJECT_ID)
  useEffect(() => {
    if (isTestEnv) {
      setHealth('healthy')
      return
    }
    import('./services/api').then(({ api }) =>
      api
        .health()
        .then((h) => setHealth(h?.status || 'unknown'))
        .catch(() => setHealth('offline')),
    )
  }, [isTestEnv])

  // Apply theme class on root for CSS-driven theming
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'snow') root.classList.add('theme-snow')
    else root.classList.remove('theme-snow')
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    if (llmModel) localStorage.setItem('sherpa.llm_model', llmModel)
  }, [llmModel])

  // Attempt to reconnect wagmi on mount (helps after refresh)
  useEffect(() => {
    reconnectAsync().catch(() => {})
  }, [reconnectAsync])

  useEffect(() => {
    let cancelled = false

    const fetchProviders = async () => {
      setLlmProvidersLoading(true)
      try {
        const res = await api.llmProviders()
        if (cancelled) return
        const providers = Array.isArray(res?.providers) ? (res.providers as LLMProviderInfo[]) : []
        setLlmProviders(providers)

        const availableModels = new Set<string>()
        for (const provider of providers) {
          if (provider.status === 'available') {
            for (const model of provider.models || []) {
              if (model?.id) availableModels.add(model.id)
            }
          }
        }

        const serverDefaultModel = typeof res?.default_model === 'string' && res.default_model.trim().length
          ? res.default_model.trim()
          : undefined
        const providerDefaultModel = providers
          .find((provider) => provider.id === res?.default_provider)?.default_model

        setLlmModel((current) => {
          if (current && (availableModels.size === 0 || availableModels.has(current))) {
            return current
          }
          if (serverDefaultModel) {
            return serverDefaultModel
          }
          if (providerDefaultModel) {
            return providerDefaultModel
          }
          if (availableModels.size > 0) {
            return Array.from(availableModels)[0]
          }
          return current || 'claude-3-5-sonnet-20241022'
        })
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
  }, [])

  const {
    data: portfolioSummary,
    status: portfolioStatus,
    error: portfolioError,
    isFetching: isPortfolioFetching,
    refresh: refreshPortfolio,
    reset: resetPortfolio,
  } = usePortfolioSummary({ walletAddress: walletAddress ?? undefined })

  const totalUsd = useMemo(() => {
    if (!portfolioSummary) return null
    return portfolioSummary.totalUsdFormatted !== '—' ? portfolioSummary.totalUsdFormatted : null
  }, [portfolioSummary])

  useEffect(() => {
    const a = address || akAddress || null
    const connected = isConnected || akConnected
    if (connected && a) {
      setWalletAddress(a)
    } else {
      setWalletAddress(null)
      resetPortfolio()
      setEntitlement({ status: 'idle', pro: false, chain: null })
      setProOverride(false)
    }
  }, [isConnected, address, akAddress, akConnected, resetPortfolio])

  useEffect(() => {
    if (!walletAddress) return

    let cancelled = false
    setEntitlement((prev) => ({ status: 'loading', pro: prev.pro && prev.status === 'ready', chain: prev.chain ?? null }))

    api
      .entitlement(walletAddress)
      .then((res) => {
        if (cancelled) return
        const status: EntitlementSnapshot['status'] = res.gating === 'disabled' ? 'disabled' : 'ready'
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
  }, [walletAddress])

  const gatingActive = entitlement.status === 'ready' && entitlement.gating === 'token'
  const pro = entitlement.pro || (!gatingActive && proOverride)

  const allowManualUnlock = !gatingActive

  const handleProRequest = (source: 'cta' | 'action') => {
    if (allowManualUnlock) {
      setProOverride(true)
    }
    // Token-gated users handle upsell inside chat component
    void source;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white sherpa-surface">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-glacier-500 to-glacier-600 shadow-sm ring-1 ring-white/40 sherpa-surface" />
            <h1 className="text-lg font-semibold text-slate-900">Sherpa AI</h1>
          </div>
          <div className="text-xs text-slate-600 flex flex-wrap items-center justify-end gap-3">
            <span className={`inline-block w-2 h-2 rounded-full ${health === 'healthy' ? 'bg-green-500' : 'bg-yellow-500'}`} />
            <span className="capitalize">{health}</span>
            <code className="px-1 rounded bg-slate-50 border border-slate-200 text-slate-700">{import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}</code>
            <div className="w-px h-5 bg-slate-200" />
            <SettingsMenu
              selectedModel={llmModel}
              onSelectModel={setLlmModel}
              providers={llmProviders}
              loading={llmProvidersLoading}
            />
            <button
              onClick={() => setTheme((t) => (t === 'snow' ? 'default' : 'snow'))}
              className="rounded-lg px-2 py-1 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 sherpa-surface"
              title="Toggle theme"
            >
              {theme === 'snow' ? 'Theme: Snow' : 'Theme: Default'}
            </button>
            {walletAddress ? (
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 sherpa-surface">{truncateAddress(walletAddress)}</span>
                {totalUsd && <span className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 sherpa-surface">{totalUsd}</span>}
                <button onClick={() => disconnect()} className="rounded-lg px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 sherpa-surface">Disconnect</button>
              </div>
            ) : hasModal && !isTestEnv ? (
              <AppKitButton />
            ) : (
              <button
                onClick={async () => {
                  const input = window.prompt('Paste a wallet address (0x…)')
                  if (input && /^0x[a-fA-F0-9]{40}$/.test(input)) {
                    setWalletAddress(input)
                  }
                }}
                className="rounded-lg px-3 py-1.5 text-white bg-gradient-to-r from-glacier-600 to-primary-600 hover:opacity-95 shadow-sm ring-1 ring-white/40 sherpa-surface"
              >
                Use Address
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-7xl">
          <DeFiChatAdaptiveUI
            persona={persona as any}
            setPersona={setPersona as any}
            walletAddress={walletAddress || undefined}
            pro={pro}
            entitlement={entitlement}
            onRequestPro={handleProRequest}
            allowManualUnlock={allowManualUnlock}
            onManualUnlock={() => setProOverride(true)}
            portfolioSummary={portfolioSummary ?? undefined}
            portfolioStatus={portfolioStatus}
            portfolioError={portfolioError}
            onRefreshPortfolio={refreshPortfolio}
            portfolioRefreshing={isPortfolioFetching}
            llmModel={llmModel}
          />
        </div>
      </main>
    </div>
  )
}

export function App() {
  const isPlaygroundRoute = typeof window !== 'undefined' && window.location.pathname.includes('widget-playground')
  if (isPlaygroundRoute) {
    return <WidgetPlayground />
  }
  return <MainApp />
}
