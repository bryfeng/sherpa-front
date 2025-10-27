import { useCallback, useEffect, useMemo, useState } from 'react'
// Old UI imports kept for reference
// import { PersonaSwitcher } from './components/personas/PersonaSwitcher'
// import { ChatContainer } from './components/chat/ChatContainer'
// import { PanelManager } from './components/panels/PanelManager'
import { api } from './services/api'
import type { EntitlementSnapshot } from './types/entitlement'
import { useAccount, useDisconnect as useWagmiDisconnect, useReconnect } from 'wagmi'
import { useAppKitAccount, useDisconnect as useAppKitDisconnect } from '@reown/appkit/react'
import { truncateAddress } from './services/wallet'
import { AppKitButton } from '@reown/appkit/react'
import DeFiChatAdaptiveUI from './pages/DeFiChatAdaptiveUI'
import WidgetPlayground from './pages/WidgetPlayground'
import { usePortfolioSummary } from './workspace/hooks'
import { SettingsMenu } from './components/header/SettingsMenu'
import { Button, Badge } from './components/ui/primitives'
import type { LLMProviderInfo } from './types/llm'

export type PersonaId = 'friendly' | 'technical' | 'professional' | 'educational'

function MainApp() {
  const isTestEnv = ((import.meta as any).env?.MODE || '').toLowerCase() === 'test'
  const [persona, setPersona] = useState<PersonaId>('friendly')
  const [theme, setTheme] = useState<'default' | 'snow'>(() => (localStorage.getItem('theme') as any) || 'snow')
  const [health, setHealth] = useState<string>('checking…')
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [walletChain, setWalletChain] = useState<'ethereum' | 'solana'>('ethereum')
  const [manualWallet, setManualWallet] = useState<{ address: string; chain: 'ethereum' | 'solana' } | null>(null)
  const [entitlement, setEntitlement] = useState<EntitlementSnapshot>({ status: 'idle', pro: false, chain: null })
  const [proOverride, setProOverride] = useState(false)
  const [llmModel, setLlmModel] = useState<string>(() => localStorage.getItem('sherpa.llm_model') || 'claude-3-5-sonnet-20241022')
  const [llmProviders, setLlmProviders] = useState<LLMProviderInfo[]>([])
  const [llmProvidersLoading, setLlmProvidersLoading] = useState<boolean>(true)
  const { address, isConnected, chainId } = useAccount()
  const { reconnectAsync } = useReconnect()
  const evmAppKitAccount = useAppKitAccount({ namespace: 'eip155' })
  const solanaAccount = useAppKitAccount({ namespace: 'solana' })
  const { disconnect: disconnectEvm } = useWagmiDisconnect()
  const { disconnect: disconnectAppKit } = useAppKitDisconnect()
  const hasModal = Boolean(import.meta.env.VITE_WALLETCONNECT_PROJECT_ID)

  const resolveEvmChain = useCallback((id?: number | null): 'ethereum' => {
    void id // Future extension hook
    return 'ethereum'
  }, [])
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

  const activeWallet = useMemo(() => {
    if (solanaAccount.isConnected && solanaAccount.address) {
      return { address: solanaAccount.address, chain: 'solana' as const }
    }
    if (isConnected && address) {
      return { address, chain: resolveEvmChain(chainId) }
    }
    if (evmAppKitAccount.isConnected && evmAppKitAccount.address) {
      return { address: evmAppKitAccount.address, chain: resolveEvmChain(chainId) }
    }
    return null
  }, [
    address,
    chainId,
    evmAppKitAccount.address,
    evmAppKitAccount.isConnected,
    isConnected,
    resolveEvmChain,
    solanaAccount.address,
    solanaAccount.isConnected,
  ])

  const resolvedWallet = useMemo(() => activeWallet ?? manualWallet, [activeWallet, manualWallet])

  useEffect(() => {
    if (activeWallet && manualWallet) {
      setManualWallet(null)
    }
  }, [activeWallet, manualWallet])

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
  } = usePortfolioSummary({ walletAddress: walletAddress ?? undefined, chain: walletChain })

  const totalUsd = useMemo(() => {
    if (!portfolioSummary) return null
    return portfolioSummary.totalUsdFormatted !== '—' ? portfolioSummary.totalUsdFormatted : null
  }, [portfolioSummary])

  useEffect(() => {
    if (resolvedWallet) {
      setWalletAddress((prev) => (prev === resolvedWallet.address ? prev : resolvedWallet.address))
      setWalletChain((prev) => (prev === resolvedWallet.chain ? prev : resolvedWallet.chain))
      return
    }

    if (walletAddress !== null || walletChain !== 'ethereum') {
      setWalletAddress(null)
      setWalletChain('ethereum')
      resetPortfolio()
      setEntitlement({ status: 'idle', pro: false, chain: null })
      setProOverride(false)
    }
  }, [resolvedWallet, walletAddress, walletChain, resetPortfolio])

  useEffect(() => {
    if (!walletAddress) return

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
    setEntitlement((prev) => ({ status: 'loading', pro: prev.pro && prev.status === 'ready', chain: walletChain }))

    api
      .entitlement(walletAddress, walletChain)
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
  }, [walletAddress, walletChain])

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

  const handleDisconnect = useCallback(async () => {
    if (walletChain === 'solana') {
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
        } catch (error) {
          console.warn('Failed to disconnect EVM wallet', error)
        }
      })(),
      (async () => {
        try {
          await disconnectAppKit({ namespace: 'eip155' })
        } catch (error) {
          console.warn('Failed to disconnect AppKit EVM wallet', error)
        }
      })(),
    ])
    setManualWallet(null)
  }, [disconnectAppKit, disconnectEvm, walletChain])

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      <header
        className="sticky top-0 z-30 border-b"
        style={{ background: 'var(--bg)', borderColor: 'var(--line)' }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div
              aria-hidden="true"
              className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{
                backgroundImage: 'linear-gradient(135deg, rgba(90,164,255,0.9), rgba(32,120,240,0.85))',
                border: '1px solid var(--line)',
                boxShadow: 'var(--shadow-1)',
              }}
            />
            <h1 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
              Sherpa AI
            </h1>
          </div>
          <div
            className="flex flex-wrap items-center justify-end gap-3 text-xs"
            style={{ color: 'var(--text-muted)' }}
          >
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: health === 'healthy' ? 'var(--success)' : 'var(--warning)' }}
            />
            <span style={{ color: 'var(--text)', fontSize: 'var(--fs-sm)', textTransform: 'capitalize' }}>
              {health}
            </span>
            <code
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--line)',
                borderRadius: 'var(--r-md)',
                color: 'var(--text-muted)',
                fontSize: 'var(--fs-xs)',
                padding: '4px 8px',
              }}
            >
              {import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}
            </code>
            <div className="h-5 w-px" style={{ background: 'var(--line)' }} />
            <SettingsMenu
              selectedModel={llmModel}
              onSelectModel={setLlmModel}
              providers={llmProviders}
              loading={llmProvidersLoading}
            />
            <Button
              size="sm"
              variant="secondary"
              className="rounded-full"
              onClick={() => setTheme((t) => (t === 'snow' ? 'default' : 'snow'))}
              title="Toggle theme"
            >
              {theme === 'snow' ? 'Theme: Snow' : 'Theme: Default'}
            </Button>
            {walletAddress ? (
              <div className="flex items-center gap-2 text-xs">
                <Badge
                  variant="secondary"
                  className="rounded-full px-3 py-1 text-xs"
                  style={{ color: 'var(--text)' }}
                >
                  {truncateAddress(walletAddress)}
                </Badge>
                <Badge
                  variant="secondary"
                  className="rounded-full px-3 py-1 text-xs uppercase tracking-wide"
                  style={{ color: 'var(--text)' }}
                >
                  {walletChain === 'solana' ? 'Solana' : 'Ethereum'}
                </Badge>
                {totalUsd && (
                  <Badge
                    variant="secondary"
                    className="rounded-full px-3 py-1 text-xs"
                    style={{ color: 'var(--text)' }}
                  >
                    {totalUsd}
                  </Badge>
                )}
                <Button size="sm" variant="secondary" className="rounded-full" onClick={handleDisconnect}>
                  Disconnect
                </Button>
              </div>
            ) : hasModal && !isTestEnv ? (
              <AppKitButton />
            ) : (
              <Button
                size="sm"
                className="rounded-full"
                onClick={async () => {
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
                  window.alert('Address must be a 0x-prefixed EVM wallet or a Solana base58 string (32–44 characters).')
                }}
              >
                Use Address
              </Button>
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
