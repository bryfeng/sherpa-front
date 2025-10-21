import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronRight, Loader2, Settings2 } from 'lucide-react'
import type { LLMProviderInfo } from '../../types/llm'

interface SettingsMenuProps {
  selectedModel: string
  providers: LLMProviderInfo[]
  onSelectModel: (model: string) => void
  loading?: boolean
}

export function SettingsMenu({ selectedModel, providers, onSelectModel, loading = false }: SettingsMenuProps) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const handleClick = (event: MouseEvent) => {
      if (!menuRef.current) return
      if (!(event.target instanceof Node)) return
      if (!menuRef.current.contains(event.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const selectedLabel = useMemo(() => {
    for (const provider of providers) {
      const match = provider.models?.find((model) => model.id === selectedModel)
      if (match) return match.label
    }
    return 'Model'
  }, [providers, selectedModel])

  const selectableProviders = useMemo(
    () => providers.filter((provider) => Array.isArray(provider.models) && provider.models.length > 0),
    [providers],
  )

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Settings2 className="h-4 w-4" />
        Settings
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-2 w-64 rounded-2xl border border-slate-200 bg-white/95 p-3 text-sm shadow-xl backdrop-blur"
        >
          <div className="px-2 pb-3">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Workspace Settings</div>
            <div className="mt-1 text-xs text-slate-500">Model: {selectedLabel}</div>
          </div>

          <div className="space-y-4">
            <div>
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-xl border border-dashed border-slate-200 px-3 py-2 text-left text-slate-500"
                disabled
              >
                <span>
                  <div className="text-sm font-medium text-slate-600">Policies</div>
                  <div className="text-xs text-slate-400">Custom policy packs coming soon.</div>
                </span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div>
              <div className="px-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Model</div>
              {loading ? (
                <div className="mt-3 flex items-center gap-2 rounded-xl border border-dashed border-slate-200 px-3 py-2 text-xs text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading model catalog…
                </div>
              ) : selectableProviders.length ? (
                <div className="mt-2 space-y-4">
                  {selectableProviders.map((provider) => {
                    const disabled = provider.status !== 'available'
                    return (
                      <div key={provider.id}>
                        <div className="px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                          {provider.display_name}
                          {disabled && <span className="ml-2 text-amber-500">(unavailable)</span>}
                        </div>
                        <div className="mt-2 space-y-2">
                          {provider.models.map((model) => {
                            const active = model.id === selectedModel
                            return (
                              <button
                                key={model.id}
                                type="button"
                                onClick={() => !disabled && onSelectModel(model.id)}
                                disabled={disabled}
                                className={`flex w-full items-start justify-between gap-2 rounded-xl border px-3 py-2 text-left transition ${
                                  active
                                    ? 'border-primary-400 bg-primary-50 text-primary-900'
                                    : disabled
                                      ? 'border-slate-200 bg-slate-100 text-slate-400'
                                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                }`}
                              >
                                <span>
                                  <div className="text-sm font-semibold">{model.label}</div>
                                  {model.description && <div className="text-xs text-slate-500">{model.description}</div>}
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
              ) : (
                <div className="mt-3 rounded-xl border border-dashed border-slate-200 px-3 py-2 text-xs text-slate-500">
                  No models available for the current configuration.
                </div>
              )}
            </div>

            <div>
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-xl border border-dashed border-slate-200 px-3 py-2 text-left text-slate-500"
                disabled
              >
                <span>
                  <div className="text-sm font-semibold text-slate-600">Theme</div>
                  <div className="text-xs text-slate-400">Theme presets arriving soon.</div>
                </span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SettingsMenu
