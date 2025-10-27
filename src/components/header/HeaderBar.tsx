// TODO: Workstream 1 — Shell Split (Monolith → Feature Slices)

import React, { useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { BarChart3, Sparkles, TrendingUp, Wand2 } from 'lucide-react'

import type { PersonaId as Persona } from '../../types/persona'
import { Entitled } from '../Entitled'
import { Badge, Button } from '../ui/primitives'
import { HeaderActionMenu, type HeaderActionItem } from './HeaderActionMenu'

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
      className="rounded-full"
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
        className="rounded-full inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium transition-colors duration-150"
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
        <span className="text-xs" style={{ color: 'var(--muted)' }}>
          Change
        </span>
      </button>
      {open &&
        createPortal(
          <div
            id={menuId}
            role="menu"
            className="z-[60] rounded-2xl p-2 shadow-xl"
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
              style={{ fontSize: 'var(--fs-xs)', color: 'var(--muted)' }}
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
                  className="w-full text-left px-2 py-2 rounded-lg flex items-center gap-2 transition-colors duration-150"
                  style={{
                    background: persona === option ? personaStyles[option].soft : 'transparent',
                    border: `1px solid ${persona === option ? personaStyles[option].accent : 'transparent'}`,
                    color: 'var(--text)',
                  }}
                >
                  <span
                    className="inline-flex h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: personaStyles[option].accent }}
                  />
                  <span className="capitalize font-medium" style={{ color: personaStyles[option].accent }}>
                    {option}
                  </span>
                  {persona === option && (
                    <span className="ml-auto text-xs" style={{ color: personaStyles[option].accent }}>
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

export interface HeaderBarProps {
  persona: Persona
  walletLabel: string
  walletConnected: boolean
  proLabel: string
  onPersonaChange: (persona: Persona) => void
  onNewChat: () => void
  onPlanWorkflow: () => void
  onShowTrending: () => void
  onOpenWorkspace: () => void
  onRequestPro?: (source: 'cta' | 'action') => void
  menuActions?: HeaderActionItem[]
}

function HeaderBarComponent({
  persona,
  walletLabel,
  walletConnected,
  proLabel,
  onPersonaChange,
  onNewChat,
  onPlanWorkflow,
  onShowTrending,
  onOpenWorkspace,
  onRequestPro,
  menuActions = [],
}: HeaderBarProps) {
  const personaLabel = useMemo(() => personaStyles[persona].label, [persona])

  return (
    <div className="flex flex-col gap-4" style={{ color: 'var(--text)' }}>
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="font-semibold" style={{ fontSize: 'var(--fs-2xl)', color: 'var(--text)' }}>
            Sherpa AI workspace
          </h1>
          <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--muted)' }}>
            Guide strategy, chat, and insights without juggling side rails.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex items-center gap-2 rounded-full px-3 py-1.5"
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
          <Badge variant={walletConnected ? 'secondary' : 'outline'} className="rounded-full px-3 py-1 text-xs">
            {walletLabel}
          </Badge>
          <Badge variant="outline" className="rounded-full px-3 py-1 text-xs">
            {proLabel}
          </Badge>
          <Button size="sm" variant="secondary" onClick={onNewChat} className="rounded-full">
            <Sparkles className="mr-1 h-3 w-3" />New chat
          </Button>
          <HeaderActionMenu actions={menuActions} />
        </div>
      </header>

      <div
        className="flex flex-wrap items-center gap-2 rounded-2xl p-3"
        style={{
          background: 'var(--bg-elev)',
          border: '1px solid var(--line)',
          boxShadow: 'var(--shadow-1)',
        }}
      >
        <span
          className="font-semibold uppercase tracking-[0.2em]"
          style={{ fontSize: 'var(--fs-xs)', color: 'var(--muted)' }}
        >
          Focus
        </span>
        <Entitled
          fallback={
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onRequestPro?.('action')}
              className="rounded-full"
              aria-label="Plan workflow (requires Pro)"
            >
              <Wand2 className="mr-1 h-3 w-3" />Plan workflow
            </Button>
          }
        >
          <Button size="sm" variant="secondary" onClick={onPlanWorkflow} className="rounded-full">
            <Wand2 className="mr-1 h-3 w-3" />Plan workflow
          </Button>
        </Entitled>
        <Button size="sm" variant="secondary" onClick={onShowTrending} className="rounded-full">
          <TrendingUp className="mr-1 h-3 w-3" />Trending tokens
        </Button>
        <Button size="sm" variant="outline" onClick={onOpenWorkspace} className="rounded-full">
          <BarChart3 className="mr-1 h-3 w-3" />Open workspace
        </Button>
        <span className="sr-only">Active persona {personaLabel}</span>
      </div>
    </div>
  )
}

export const HeaderBar = React.memo(HeaderBarComponent)

HeaderBar.displayName = 'HeaderBar'
