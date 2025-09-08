import { useEffect, useMemo, useState } from 'react'
// Old UI imports kept for reference
// import { PersonaSwitcher } from './components/personas/PersonaSwitcher'
// import { ChatContainer } from './components/chat/ChatContainer'
// import { PanelManager } from './components/panels/PanelManager'
import { api } from './services/api'
import type { PortfolioData } from './types/portfolio'
import { useAccount, useDisconnect } from 'wagmi'
import { truncateAddress } from './services/wallet'
import { AppKitButton } from '@reown/appkit/react'
import DeFiChatAdaptiveUI from './pages/DeFiChatAdaptiveUI'

export type PersonaId = 'friendly' | 'technical' | 'professional' | 'educational'

export function App() {
  const isTestEnv = ((import.meta as any).env?.MODE || '').toLowerCase() === 'test'
  const [persona, setPersona] = useState<PersonaId>('friendly')
  const [health, setHealth] = useState<string>('checking…')
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null)
  const { address, isConnected } = useAccount()
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

  const totalUsd = useMemo(() => {
    if (!portfolio) return null
    const v = typeof portfolio.total_value_usd === 'string' ? parseFloat(portfolio.total_value_usd) : portfolio.total_value_usd
    if (isNaN(v)) return null
    return `$${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
  }, [portfolio])

  useEffect(() => {
    if (isConnected && address) {
      setWalletAddress(address)
      api
        .portfolio(address)
        .then((res) => {
          if (res.success && res.portfolio) setPortfolio(res.portfolio)
        })
        .catch(() => {})
    } else {
      setWalletAddress(null)
      setPortfolio(null)
    }
  }, [isConnected, address])

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600" />
            <h1 className="text-lg font-semibold text-slate-900">Agentic Wallet</h1>
          </div>
          <div className="text-xs text-slate-600 flex items-center gap-3">
            <span className={`inline-block w-2 h-2 rounded-full ${health === 'healthy' ? 'bg-green-500' : 'bg-yellow-500'}`} />
            <span className="capitalize">{health}</span>
            <code className="px-1 rounded bg-slate-50 border border-slate-200 text-slate-700">{import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}</code>
            <div className="w-px h-5 bg-slate-200" />
            {walletAddress ? (
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-700">{truncateAddress(walletAddress)}</span>
                {totalUsd && <span className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-700">{totalUsd}</span>}
                <button onClick={() => disconnect()} className="rounded-lg px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50">Disconnect</button>
              </div>
            ) : (
              hasModal && !isTestEnv ? (
                <AppKitButton />
              ) : (
                <button
                  onClick={async () => {
                    const input = window.prompt('Paste a wallet address (0x…)')
                    if (input && /^0x[a-fA-F0-9]{40}$/.test(input)) {
                      setWalletAddress(input)
                      try {
                        const res = await api.portfolio(input)
                        if (res.success && res.portfolio) setPortfolio(res.portfolio)
                      } catch {}
                    }
                  }}
                  className="rounded-lg px-3 py-1.5 text-white bg-primary-600 hover:opacity-95"
                >
                  Use Address
                </button>
              )
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-7xl">
          <DeFiChatAdaptiveUI />
        </div>
      </main>
    </div>
  )
}
