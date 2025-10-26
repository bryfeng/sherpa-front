// TODO: Workstream 1 — Shell Split (Monolith → Feature Slices)

import React, { useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { BarChart3, Sparkles, TrendingUp, Wand2 } from 'lucide-react'

import type { PersonaId as Persona } from '../../types/persona'
import { Badge, Button } from '../ui/primitives'

const personaStyles: Record<
  Persona,
  { label: string; badge: string; text: string; dot: string; hover: string; border: string; ring: string }
> = {
  friendly: {
    label: 'Friendly',
    badge: 'bg-emerald-100 text-emerald-700',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
    hover: 'hover:bg-emerald-50',
    border: 'border-emerald-300',
    ring: 'focus:ring-emerald-200',
  },
  technical: {
    label: 'Technical',
    badge: 'bg-violet-100 text-violet-700',
    text: 'text-violet-700',
    dot: 'bg-violet-500',
    hover: 'hover:bg-violet-50',
    border: 'border-violet-300',
    ring: 'focus:ring-violet-200',
  },
  professional: {
    label: 'Professional',
    badge: 'bg-slate-100 text-slate-700',
    text: 'text-slate-700',
    dot: 'bg-slate-500',
    hover: 'hover:bg-slate-50',
    border: 'border-slate-300',
    ring: 'focus:ring-slate-200',
  },
  educational: {
    label: 'Educational',
    badge: 'bg-amber-100 text-amber-700',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
    hover: 'hover:bg-amber-50',
    border: 'border-amber-300',
    ring: 'focus:ring-amber-200',
  },
}

const personaOrder: Persona[] = ['friendly', 'technical', 'professional', 'educational']

function PersonaBadge({ persona }: { persona: Persona }) {
  const style = personaStyles[persona]
  return <Badge className={`rounded-full ${style.badge}`}>{style.label}</Badge>
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
        className={`rounded-full bg-white text-slate-900 ${personaStyles[persona].border} ${personaStyles[persona].hover} focus:ring-2 ${personaStyles[persona].ring} inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium transition`}
      >
        <span className={`inline-flex h-2.5 w-2.5 rounded-full ${personaStyles[persona].dot}`} />
        <span className={`capitalize font-medium ${personaStyles[persona].text}`}>{persona}</span>
        <span className="text-xs text-slate-500">Change</span>
      </button>
      {open &&
        createPortal(
          <div
            id={menuId}
            role="menu"
            className="z-[60] rounded-2xl border border-slate-200 bg-white p-2 shadow-xl"
            style={{ position: 'absolute', top: coords.top, left: coords.left, width: coords.width }}
          >
            <div className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Personas</div>
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
                  className={`w-full text-left px-2 py-2 rounded-lg flex items-center gap-2 ${personaStyles[option].hover}`}
                >
                  <span className={`inline-flex h-2.5 w-2.5 rounded-full ${personaStyles[option].dot}`} />
                  <span className={`capitalize font-medium ${personaStyles[option].text}`}>{option}</span>
                  {persona === option && <span className={`ml-auto text-xs ${personaStyles[option].text}`}>Current</span>}
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
}: HeaderBarProps) {
  const personaLabel = useMemo(() => personaStyles[persona].label, [persona])

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-slate-900">Sherpa AI workspace</h1>
          <p className="text-sm text-slate-600">Guide strategy, chat, and insights without juggling side rails.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
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
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white/80 p-3 shadow-sm">
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Focus</span>
        <Button size="sm" variant="secondary" onClick={onPlanWorkflow} className="rounded-full">
          <Wand2 className="mr-1 h-3 w-3" />Plan workflow
        </Button>
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
