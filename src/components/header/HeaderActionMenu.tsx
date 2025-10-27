// TODO: Workstream 10 — Header/Footer Simplification

import React, { useEffect, useRef, useState } from 'react'
import { MoreVertical } from 'lucide-react'

export interface HeaderActionItem {
  id: string
  label: string
  description?: string
  onSelect: () => void
  disabled?: boolean
}

export interface HeaderActionMenuProps {
  actions: HeaderActionItem[]
}

export function HeaderActionMenu({ actions }: HeaderActionMenuProps) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return

    function handleClick(event: MouseEvent) {
      const target = event.target as Node | null
      if (!target) return
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return
      setOpen(false)
    }

    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }

    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  if (!actions.length) return null

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="h-10 w-10 rounded-full border border-[var(--line)] bg-[var(--bg-elev)] text-[var(--text)] shadow-sm transition hover:bg-[var(--bg)]"
      >
        <MoreVertical className="mx-auto h-5 w-5" aria-hidden="true" />
        <span className="sr-only">Open more actions</span>
      </button>
      {open && (
        <div
          ref={menuRef}
          role="menu"
          className="absolute right-0 z-40 mt-2 w-56 rounded-2xl border border-[var(--line)] bg-[var(--bg-elev)]/95 p-2 shadow-2xl backdrop-blur"
        >
          <div className="px-3 py-2 text-[var(--fs-xs)] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
            Workspace tools
          </div>
          <div className="flex flex-col gap-1">
            {actions.map((action) => (
              <button
                key={action.id}
                type="button"
                role="menuitem"
                onClick={() => {
                  if (action.disabled) return
                  setOpen(false)
                  action.onSelect()
                }}
                disabled={action.disabled}
                className="flex w-full flex-col rounded-xl border border-transparent px-3 py-2 text-left text-[var(--fs-sm)] text-[var(--text)] transition hover:border-[var(--accent)] hover:bg-[var(--bg)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="font-medium">{action.label}</span>
                {action.description && (
                  <span className="text-[var(--fs-xs)] text-[var(--text-muted)]">{action.description}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default HeaderActionMenu
