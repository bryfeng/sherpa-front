// TODO: Workstream 1 — Shell Split (Monolith → Feature Slices)

import React, { useEffect, useId, useMemo, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Sparkles, Bell, Cpu, Check, Copy } from 'lucide-react'

import type { PersonaId as Persona } from '../../types/persona'
import type { AuthStatus } from '../../store'
import { useSherpaStore } from '../../store'
import { Badge, Button } from '../ui/primitives'
import { HeaderActionMenu, type HeaderActionItem } from './HeaderActionMenu'
import { ExecutionSigningBadge } from '../../workspace/components/ExecutionSigningModal'
import { usePendingApprovals } from '../../workspace/hooks/usePendingApprovals'
import { useAccount } from 'wagmi'

const personaStyles: Record<Persona, { label: string; accent: string; soft: string }> = {
  friendly: {
    label: 'Friendly',
    accent: '#7de3c3',
    soft: 'rgba(125, 227, 195, 0.18)',
  },
  technical: {
    label: 'Technical',
    accent: '#c3a4ff',
    soft: 'rgba(195, 164, 255, 0.18)',
  },
  professional: {
    label: 'Professional',
    accent: '#91a6ff',
    soft: 'rgba(145, 166, 255, 0.2)',
  },
  educational: {
    label: 'Educational',
    accent: '#ffc466',
    soft: 'rgba(255, 196, 102, 0.22)',
  },
}

const personaOrder: Persona[] = ['friendly', 'technical', 'professional', 'educational']

function PersonaBadge({ persona }: { persona: Persona }) {
  const style = personaStyles[persona]
  return (
    <Badge
      variant="outline"
      className="rounded-md"
      style={{
        borderColor: style.accent,
        color: style.accent,
        backgroundColor: style.soft,
      }}
    >
      {style.label}
    </Badge>
  )
}

/**
 * Displays the current LLM model being used
 */
function ModelIndicator() {
  const llmModel = useSherpaStore((state) => state.llmModel)
  const llmProviders = useSherpaStore((state) => state.llmProviders)

  const modelLabel = useMemo(() => {
    for (const provider of llmProviders) {
      const match = provider.models?.find((m) => m.id === llmModel)
      if (match) return match.label
    }
    // Fallback: show abbreviated model ID if no label found
    if (llmModel) {
      // e.g. "claude-sonnet-4-20250514" -> "Claude Sonnet 4"
      const parts = llmModel.split('-')
      if (parts.length >= 3) {
        return parts.slice(0, 3).map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ')
      }
      return llmModel
    }
    return 'Model'
  }, [llmModel, llmProviders])

  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs"
      style={{
        background: 'var(--bg-elev)',
        border: '1px solid var(--line)',
        color: 'var(--text-muted)',
      }}
      title={`Current model: ${llmModel}`}
    >
      <Cpu className="h-3 w-3" style={{ color: 'var(--accent)' }} />
      <span className="font-medium" style={{ color: 'var(--text)' }}>
        {modelLabel}
      </span>
    </div>
  )
}

interface PersonaDropdownProps {
  persona: Persona
  onSelect: (persona: Persona) => void
}

function PersonaDropdown({ persona, onSelect }: PersonaDropdownProps) {
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 224,
  })
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([])
  const menuId = useId()

  useEffect(() => {
    if (!open) return
    function updatePosition() {
      const rect = wrapRef.current?.getBoundingClientRect()
      if (!rect) return
      setCoords({ top: rect.bottom + window.scrollY + 8, left: rect.left + window.scrollX, width: Math.max(224, rect.width) })
    }
    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setOpen(false)
        const trigger = wrapRef.current?.querySelector('button') as HTMLButtonElement | null
        trigger?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    const raf = window.requestAnimationFrame(() => {
      const currentIndex = Math.max(personaOrder.indexOf(persona), 0)
      const target = itemRefs.current[currentIndex] || itemRefs.current[0]
      target?.focus()
    })
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('keydown', onKey)
      window.cancelAnimationFrame(raf)
      itemRefs.current = []
    }
  }, [open, persona])

  const focusOption = React.useCallback((index: number) => {
    if (!personaOrder.length) return
    const normalized = (index + personaOrder.length) % personaOrder.length
    const el = itemRefs.current[normalized]
    el?.focus()
  }, [])

  const handlePersonaKey = (event: React.KeyboardEvent<HTMLButtonElement>, index: number, option: Persona) => {
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        event.preventDefault()
        focusOption(index + 1)
        break
      case 'ArrowUp':
      case 'ArrowLeft':
        event.preventDefault()
        focusOption(index - 1)
        break
      case 'Home':
        event.preventDefault()
        focusOption(0)
        break
      case 'End':
        event.preventDefault()
        focusOption(personaOrder.length - 1)
        break
      case 'Enter':
      case ' ': {
        event.preventDefault()
        onSelect(option)
        setOpen(false)
        break
      }
      default:
        break
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            setOpen(true)
          }
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        className="rounded-md inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium transition-colors duration-150"
        style={{
          background: 'var(--bg-elev)',
          border: '1px solid var(--line)',
          color: 'var(--text)',
          boxShadow: 'var(--shadow-1)',
        }}
      >
        <span
          className="inline-flex h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: personaStyles[persona].accent }}
        />
        <span className="capitalize font-medium" style={{ color: personaStyles[persona].accent }}>
          {persona}
        </span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Change
        </span>
      </button>
      {open &&
        createPortal(
          <div
            id={menuId}
            role="menu"
            className="z-[60] rounded-lg p-2 shadow-xl"
            style={{
              position: 'absolute',
              top: coords.top,
              left: coords.left,
              width: coords.width,
              background: 'var(--bg-elev)',
              border: '1px solid var(--line)',
              boxShadow: 'var(--shadow-2)',
            }}
          >
            <div
              className="px-3 py-2 font-semibold uppercase tracking-[0.2em]"
              style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}
            >
              Personas
            </div>
            <div className="flex flex-col gap-1">
              {personaOrder.map((option, index) => (
                <button
                  key={option}
                  ref={(el) => {
                    itemRefs.current[index] = el
                  }}
                  role="menuitemradio"
                  aria-checked={persona === option}
                  onClick={() => {
                    onSelect(option)
                    setOpen(false)
                  }}
                  onKeyDown={(event) => handlePersonaKey(event, index, option)}
                  className="w-full text-left px-2 py-1.5 rounded-md flex items-center gap-2 transition-colors duration-150"
                  style={{
                    background: persona === option ? personaStyles[option].soft : 'transparent',
                    border: `1px solid ${persona === option ? personaStyles[option].accent : 'transparent'}`,
                    color: 'var(--text)',
                    fontSize: 'var(--fs-sm)',
                  }}
                >
                  <span
                    className="inline-flex h-2 w-2 rounded-full"
                    style={{ backgroundColor: personaStyles[option].accent }}
                  />
                  <span className="capitalize font-medium" style={{ color: personaStyles[option].accent, fontSize: 'var(--fs-sm)' }}>
                    {option}
                  </span>
                  {persona === option && (
                    <span className="ml-auto" style={{ color: personaStyles[option].accent, fontSize: 'var(--fs-xs)' }}>
                      Current
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}

/**
 * Copyable wallet address badge with visual feedback
 */
function CopyableWalletBadge({ label, fullAddress }: { label: string; fullAddress?: string }) {
  const [copied, setCopied] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleCopy = useCallback(async () => {
    const addressToCopy = fullAddress || label
    try {
      await navigator.clipboard.writeText(addressToCopy)
      setCopied(true)

      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      // Reset after 2 seconds
      timeoutRef.current = setTimeout(() => {
        setCopied(false)
      }, 2000)
    } catch (err) {
      console.error('Failed to copy address:', err)
    }
  }, [fullAddress, label])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return (
    <button
      onClick={handleCopy}
      className="group inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all duration-200 cursor-pointer"
      style={{
        background: copied ? 'var(--success-muted, rgba(34, 197, 94, 0.15))' : 'var(--surface-2)',
        border: `1px solid ${copied ? 'var(--success, #22c55e)' : 'var(--line)'}`,
        color: copied ? 'var(--success, #22c55e)' : 'var(--text)',
      }}
      title={copied ? 'Copied!' : `Click to copy: ${fullAddress || label}`}
    >
      {copied ? (
        <>
          <Check className="h-3 w-3" />
          <span>Copied!</span>
        </>
      ) : (
        <>
          <span>{label}</span>
          <Copy
            className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ color: 'var(--text-muted)' }}
          />
        </>
      )}
    </button>
  )
}

/**
 * Badge showing pending strategy executions count
 * Uses wagmi's useAccount internally for wallet address
 */
function PendingExecutionsBadge() {
  const { address } = useAccount()
  const { count } = usePendingApprovals(address ?? null)

  // Don't render anything if no wallet or no pending executions
  if (!address || count === 0) return null

  return (
    <div
      className="relative inline-flex items-center justify-center rounded-md p-2 transition-colors"
      style={{
        background: 'var(--bg-elev)',
        border: '1px solid var(--line)',
      }}
      title={`${count} pending execution${count > 1 ? 's' : ''}`}
    >
      <Bell className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
      <span
        className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white"
        style={{ backgroundColor: 'var(--accent, #f5a623)' }}
      >
        {count > 9 ? '9+' : count}
      </span>
      <ExecutionSigningBadge />
    </div>
  )
}

export interface HeaderBarProps {
  persona: Persona
  walletLabel: string
  walletAddress?: string // Full address for copy functionality
  walletConnected: boolean
  proLabel: string
  authStatus?: AuthStatus
  authError?: string | null
  onRetryAuth?: () => void
  onPersonaChange: (persona: Persona) => void
  onNewChat: () => void
  onConnectWallet?: () => void
  onDisconnectWallet?: () => void
  menuActions?: HeaderActionItem[]
}

function HeaderBarComponent({
  persona,
  walletLabel,
  walletAddress,
  walletConnected,
  proLabel,
  authStatus,
  authError,
  onRetryAuth,
  onPersonaChange,
  onNewChat,
  onConnectWallet,
  onDisconnectWallet,
  menuActions = [],
}: HeaderBarProps) {
  const authLabel =
    authStatus && authStatus !== 'idle'
      ? authStatus === 'signed_in'
        ? 'Signed in'
        : authStatus === 'signing'
          ? 'Signing in…'
          : 'Sign-in failed'
      : null
  const authTone =
    authStatus === 'signed_in'
      ? 'var(--success)'
      : authStatus === 'error'
        ? 'var(--danger)'
        : 'var(--text-muted)'

  return (
    <div className="flex flex-col gap-4" style={{ color: 'var(--text)' }}>
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="font-semibold" style={{ fontSize: 'var(--fs-2xl)', color: 'var(--text)' }}>
            Sherpa AI workspace
          </h1>
          <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>
            Guide strategy, chat, and insights without juggling side rails.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex items-center gap-2 rounded-md px-2.5 py-1"
            style={{
              background: 'var(--bg-elev)',
              border: '1px solid var(--line)',
              boxShadow: 'var(--shadow-1)',
            }}
          >
            <PersonaBadge persona={persona} />
            <div className="min-w-[160px] max-w-[220px]">
              <PersonaDropdown persona={persona} onSelect={onPersonaChange} />
            </div>
          </div>
          <ModelIndicator />
          {walletConnected ? (
            <div className="inline-flex items-center gap-1.5">
              <CopyableWalletBadge label={walletLabel} fullAddress={walletAddress} />
              {onDisconnectWallet && (
                <button
                  onClick={onDisconnectWallet}
                  className="rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors hover:bg-[var(--surface-3)]"
                  style={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--line)',
                    color: 'var(--text-muted)',
                  }}
                  title="Disconnect wallet"
                >
                  Disconnect
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={onConnectWallet}
              className="rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
              style={{
                background: 'var(--accent)',
                color: 'var(--text-inverse)',
              }}
            >
              Connect Wallet
            </button>
          )}
          {walletConnected && authLabel && (
            <div className="inline-flex items-center gap-2">
              <span title={authError || undefined}>
                <Badge
                  variant="outline"
                  className="rounded-md px-2.5 py-0.5 text-xs"
                  style={{ color: authTone, borderColor: authTone }}
                >
                  {authLabel}
                </Badge>
              </span>
              {authStatus === 'error' && onRetryAuth && (
                <button
                  onClick={onRetryAuth}
                  className="rounded-md px-2 py-0.5 text-[11px] font-medium"
                  style={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--line)',
                    color: 'var(--text)',
                  }}
                >
                  Retry
                </button>
              )}
            </div>
          )}
          <Badge variant="outline" className="rounded-md px-2.5 py-0.5 text-xs">
            {proLabel}
          </Badge>
          <Button size="sm" variant="secondary" onClick={onNewChat} className="rounded-md">
            <Sparkles className="mr-1 h-3 w-3" />New chat
          </Button>
          <PendingExecutionsBadge />
          <HeaderActionMenu actions={menuActions} />
        </div>
      </header>
    </div>
  )
}

export const HeaderBar = React.memo(HeaderBarComponent)

HeaderBar.displayName = 'HeaderBar'
