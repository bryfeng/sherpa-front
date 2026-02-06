import React, { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Loader2 } from 'lucide-react'
import { useQuery } from 'convex/react'

import { api } from '../../../convex/_generated/api'
import { useSherpaStore } from '../../store'
import { useUserPreferences } from '../../hooks/useUserPreferences'
import type { LLMProviderInfo } from '../../types/llm'

export interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onOpenRiskPolicy?: () => void
  onOpenSessionKeys?: () => void
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description?: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-lg border px-3 py-2 text-left transition"
      style={{
        borderColor: 'var(--line)',
        background: 'var(--surface-2)',
        color: 'var(--text)',
      }}
      role="switch"
      aria-checked={checked}
    >
      <span>
        <div className="text-sm font-medium">{label}</div>
        {description && (
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {description}
          </div>
        )}
      </span>
      <span
        className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
        style={{ background: checked ? 'var(--accent)' : 'var(--surface-3)' }}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${checked ? 'translate-x-4' : 'translate-x-1'}`}
        />
      </span>
    </button>
  )
}

function DensityToggle({
  value,
  onChange,
}: {
  value: 'comfortable' | 'compact'
  onChange: (value: 'comfortable' | 'compact') => void
}) {
  return (
    <div
      className="inline-flex rounded-lg border p-1"
      style={{ borderColor: 'var(--line)', background: 'var(--surface-2)' }}
    >
      {(['comfortable', 'compact'] as const).map((option) => {
        const active = value === option
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className="px-3 py-1.5 text-xs font-medium rounded-md transition"
            style={{
              background: active ? 'var(--accent)' : 'transparent',
              color: active ? 'var(--text-inverse)' : 'var(--text-muted)',
            }}
          >
            {option === 'comfortable' ? 'Comfortable' : 'Compact'}
          </button>
        )
      })}
    </div>
  )
}

function ModelSelector({
  providers,
  loading,
  selectedModel,
  onSelectModel,
}: {
  providers: LLMProviderInfo[]
  loading: boolean
  selectedModel: string
  onSelectModel: (model: string) => void
}) {
  const selectedLabel = useMemo(() => {
    for (const provider of providers) {
      const match = provider.models?.find((model) => model.id === selectedModel)
      if (match) return match.label
    }
    return 'Model'
  }, [providers, selectedModel])

  if (loading) {
    return (
      <div className="rounded-lg border border-dashed px-3 py-2 text-xs" style={{ borderColor: 'var(--line)', color: 'var(--text-muted)' }}>
        Loading model catalog…
      </div>
    )
  }

  if (!providers.length) {
    return (
      <div className="rounded-lg border border-dashed px-3 py-2 text-xs" style={{ borderColor: 'var(--line)', color: 'var(--text-muted)' }}>
        No models available for the current configuration.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="text-xs uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>
        Current model: {selectedLabel}
      </div>
      <div className="space-y-4">
        {providers.map((provider) => {
          const disabled = provider.status !== 'available'
          const models = provider.models ?? []
          if (!models.length) return null
          return (
            <div key={provider.id}>
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>
                {provider.display_name}
                {disabled && <span className="ml-2 text-amber-500">(unavailable)</span>}
              </div>
              <div className="mt-2 space-y-2">
                {models.map((model) => {
                  const active = model.id === selectedModel
                  return (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => !disabled && onSelectModel(model.id)}
                      disabled={disabled}
                      className="flex w-full items-start justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition disabled:opacity-60"
                      style={{
                        borderColor: active ? 'var(--accent)' : 'var(--line)',
                        background: active ? 'var(--accent-muted)' : 'var(--surface-2)',
                        color: active ? 'var(--accent)' : 'var(--text)',
                      }}
                    >
                      <span>
                        <div className="text-sm font-semibold">{model.label}</div>
                        {model.description && (
                          <div className="text-xs" style={{ color: active ? 'var(--accent)' : 'var(--text-muted)' }}>
                            {model.description}
                          </div>
                        )}
                      </span>
                      {active && <Check className="mt-1 h-4 w-4" />}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** Helper to determine if a chain is Solana based on name/aliases */
function isSolanaChain(chain: { name: string; aliases: string[] }): boolean {
  const nameLower = chain.name.toLowerCase()
  return nameLower === 'solana' || chain.aliases.some((a) => a.toLowerCase() === 'solana')
}

/** Get the API identifier for a chain (first alias or lowercased name) */
function getChainApiId(chain: { name: string; aliases: string[] }): string {
  return chain.aliases[0]?.toLowerCase() || chain.name.toLowerCase()
}

export function SettingsModal({ isOpen, onClose, onOpenRiskPolicy, onOpenSessionKeys }: SettingsModalProps) {
  const {
    llmModel,
    llmProviders,
    llmProvidersLoading,
    setLlmModel,
    streamingEnabled,
    setStreamingEnabled,
    chatDensity,
    setChatDensity,
    txNotifications,
    setTxNotifications,
    walletAddress,
    chainId,
  } = useSherpaStore((state) => ({
    llmModel: state.llmModel,
    llmProviders: state.llmProviders,
    llmProvidersLoading: state.llmProvidersLoading,
    setLlmModel: state.setLlmModel,
    streamingEnabled: state.streamingEnabled,
    setStreamingEnabled: state.setStreamingEnabled,
    chatDensity: state.chatDensity,
    setChatDensity: state.setChatDensity,
    txNotifications: state.txNotifications,
    setTxNotifications: state.setTxNotifications,
    walletAddress: state.wallet.address,
    chainId: state.auth.session?.chainId,
  }))

  // User preferences for chain selection
  const { enabledChains, toggleChain, isLoading: prefsLoading } = useUserPreferences(walletAddress)

  // Fetch available chains from Convex
  const chainsData = useQuery(api.chains.listEnabled)

  // Determine wallet type (EVM vs Solana)
  const walletType: 'evm' | 'solana' = chainId === 'solana' ? 'solana' : 'evm'

  // Show testnets toggle (for development)
  const [showTestnets, setShowTestnets] = useState(false)

  // Filter and transform chains based on wallet type
  const availableChains = useMemo(() => {
    if (!chainsData) return []

    return chainsData
      .filter((chain) => showTestnets || !chain.isTestnet)
      .filter((chain) => {
        const isSolana = isSolanaChain(chain)
        return walletType === 'solana' ? isSolana : !isSolana
      })
      .map((chain) => ({
        id: getChainApiId(chain),
        name: chain.name,
        chainId: chain.chainId,
        isTestnet: chain.isTestnet,
      }))
      .sort((a, b) => {
        // Testnets at the bottom
        if (a.isTestnet !== b.isTestnet) return a.isTestnet ? 1 : -1
        // Mainnet first
        return a.chainId === 1 ? -1 : b.chainId === 1 ? 1 : a.chainId - b.chainId
      })
  }, [chainsData, walletType, showTestnets])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.button
            type="button"
            aria-label="Close settings"
            className="fixed inset-0 z-40 bg-black/50"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:items-center"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
          >
            <div
              className="w-full max-w-3xl rounded-2xl border shadow-2xl overflow-hidden"
              style={{ borderColor: 'var(--line)', background: 'var(--bg-elev)' }}
              role="dialog"
              aria-modal="true"
              aria-label="Settings"
            >
              <div
                className="flex items-center justify-between border-b px-5 py-4"
                style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}
              >
                <div>
                  <div className="text-base font-semibold" style={{ color: 'var(--text)' }}>
                    Settings
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Keep responses predictable and the workspace focused.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md px-2 py-1 text-xs font-medium transition"
                  style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}
                >
                  Close
                </button>
              </div>

              <div className="max-h-[70vh] overflow-y-auto px-5 py-5 space-y-6">
                <section className="space-y-3">
                  <div>
                    <div className="text-sm font-semibold">General</div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Model selection and response behavior.
                    </div>
                  </div>
                  <ModelSelector
                    providers={llmProviders}
                    loading={llmProvidersLoading}
                    selectedModel={llmModel}
                    onSelectModel={setLlmModel}
                  />
                  <ToggleRow
                    label="Streaming responses"
                    description="Show tokens as they arrive (off by default)."
                    checked={streamingEnabled}
                    onChange={setStreamingEnabled}
                  />
                </section>

                <section className="space-y-3">
                  <div>
                    <div className="text-sm font-semibold">Policies</div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Configure limits and session controls.
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => {
                        onOpenRiskPolicy?.()
                        onClose()
                      }}
                      className="rounded-lg border px-3 py-2 text-left text-sm transition"
                      style={{ borderColor: 'var(--line)', background: 'var(--surface-2)', color: 'var(--text)' }}
                    >
                      <div className="font-medium">Risk policy</div>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        Limits, slippage, and approvals
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onOpenSessionKeys?.()
                        onClose()
                      }}
                      className="rounded-lg border px-3 py-2 text-left text-sm transition"
                      style={{ borderColor: 'var(--line)', background: 'var(--surface-2)', color: 'var(--text)' }}
                    >
                      <div className="font-medium">Session keys</div>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        Delegated access sessions
                      </div>
                    </button>
                  </div>
                </section>

                {/* Portfolio Chains Section */}
                {walletAddress && (
                  <section className="space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm font-semibold">Portfolio Chains</div>
                        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          Select which chains to include in your portfolio view.
                          {walletType === 'solana' && ' (Solana wallet detected)'}
                        </div>
                      </div>
                      {/* Show Testnets Toggle */}
                      <button
                        type="button"
                        onClick={() => setShowTestnets(!showTestnets)}
                        className="flex items-center gap-2 rounded-md px-2 py-1 text-xs transition"
                        style={{
                          background: showTestnets ? 'var(--warning-muted, rgba(234, 179, 8, 0.15))' : 'var(--surface-2)',
                          border: `1px solid ${showTestnets ? 'var(--warning, #eab308)' : 'var(--line)'}`,
                          color: showTestnets ? 'var(--warning, #eab308)' : 'var(--text-muted)',
                        }}
                      >
                        <span
                          className="relative inline-flex h-4 w-7 items-center rounded-full transition-colors"
                          style={{ background: showTestnets ? 'var(--warning, #eab308)' : 'var(--surface-3)' }}
                        >
                          <span
                            className={`inline-block h-3 w-3 transform rounded-full bg-white transition ${showTestnets ? 'translate-x-3' : 'translate-x-0.5'}`}
                          />
                        </span>
                        <span>Testnets</span>
                      </button>
                    </div>
                    {!chainsData || prefsLoading ? (
                      <div className="flex items-center gap-2 py-4" style={{ color: 'var(--text-muted)' }}>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Loading chains...</span>
                      </div>
                    ) : availableChains.length === 0 ? (
                      <div className="text-sm py-2" style={{ color: 'var(--text-muted)' }}>
                        No chains available for your wallet type.
                      </div>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {availableChains.map((chain) => {
                          const isEnabled = enabledChains.includes(chain.id)
                          const isOnlyEnabled = isEnabled && enabledChains.length === 1
                          return (
                            <button
                              key={chain.id}
                              type="button"
                              onClick={() => !isOnlyEnabled && toggleChain(chain.id, !isEnabled)}
                              disabled={isOnlyEnabled}
                              className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition disabled:opacity-50 disabled:cursor-not-allowed"
                              style={{
                                borderColor: isEnabled ? 'var(--accent)' : 'var(--line)',
                                background: isEnabled ? 'var(--accent-muted)' : 'var(--surface-2)',
                                color: isEnabled ? 'var(--accent)' : 'var(--text)',
                              }}
                              title={isOnlyEnabled ? 'At least one chain must be enabled' : undefined}
                            >
                              <span className="flex items-center gap-1.5">
                                <span className="text-sm font-medium">{chain.name}</span>
                                {chain.isTestnet && (
                                  <span
                                    className="text-[10px] px-1.5 py-0.5 rounded"
                                    style={{
                                      background: 'var(--warning-muted, rgba(234, 179, 8, 0.15))',
                                      color: 'var(--warning, #eab308)',
                                    }}
                                  >
                                    Testnet
                                  </span>
                                )}
                              </span>
                              <span
                                className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
                                style={{ background: isEnabled ? 'var(--accent)' : 'var(--surface-3)' }}
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${isEnabled ? 'translate-x-4' : 'translate-x-1'}`}
                                />
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Tip: You can also ask Sherpa to update these settings via chat.
                    </div>
                  </section>
                )}

                <section className="space-y-3">
                  <div>
                    <div className="text-sm font-semibold">Appearance</div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Reduce visual density without changing the theme.
                    </div>
                  </div>
                  <DensityToggle value={chatDensity} onChange={setChatDensity} />
                </section>

                <section className="space-y-3">
                  <div>
                    <div className="text-sm font-semibold">Notifications</div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      In-app alerts only for early access.
                    </div>
                  </div>
                  <ToggleRow
                    label="Transaction confirmations & failures"
                    description="Surface key updates in the workspace."
                    checked={txNotifications}
                    onChange={setTxNotifications}
                  />
                </section>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default SettingsModal
