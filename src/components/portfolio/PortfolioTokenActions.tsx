/**
 * PORTFOLIO TOKEN ACTIONS
 *
 * Quick action popup menu for token operations.
 * Shows: Swap, Send, Chart options.
 * Uses portal to avoid overflow clipping issues.
 */

import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { ArrowRightLeft, Send, LineChart } from 'lucide-react'
import type { PortfolioPositionViewModel } from '../../workspace/types'

interface PortfolioTokenActionsProps {
  token: PortfolioPositionViewModel
  onAction: (action: 'swap' | 'send' | 'chart') => void
  onClose: () => void
  triggerRef?: React.RefObject<HTMLButtonElement>
}

export function PortfolioTokenActions({
  token,
  onAction,
  onClose,
  triggerRef,
}: PortfolioTokenActionsProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ top: 0, right: 0, openUp: false })

  const actions = [
    {
      id: 'swap' as const,
      label: 'Swap',
      icon: ArrowRightLeft,
      description: `Swap ${token.symbol}`,
    },
    {
      id: 'send' as const,
      label: 'Send',
      icon: Send,
      description: `Send ${token.symbol}`,
    },
    {
      id: 'chart' as const,
      label: 'Chart',
      icon: LineChart,
      description: `View ${token.symbol} chart`,
    },
  ]

  // Calculate position relative to trigger button
  useEffect(() => {
    if (!triggerRef?.current) return

    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (!rect) return

      const viewportHeight = window.innerHeight
      const menuHeight = 140 // Approximate menu height
      const spaceBelow = viewportHeight - rect.bottom
      const openUp = spaceBelow < menuHeight && rect.top > menuHeight

      setPosition({
        top: openUp ? rect.top - menuHeight : rect.bottom + 4,
        right: window.innerWidth - rect.right,
        openUp,
      })
    }

    updatePosition()

    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)

    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [triggerRef])

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        triggerRef?.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose, triggerRef])

  return createPortal(
    <motion.div
      ref={menuRef}
      className="fixed z-[100] min-w-[120px] rounded-lg overflow-hidden"
      style={{
        top: position.top,
        right: position.right,
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      }}
      initial={{ opacity: 0, scale: 0.95, y: position.openUp ? 8 : -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: position.openUp ? 8 : -8 }}
      transition={{ duration: 0.15 }}
    >
      {actions.map((action) => (
        <button
          key={action.id}
          className="flex items-center gap-2 w-full px-3 py-2.5 text-left text-sm transition-colors"
          style={{
            color: 'var(--text)',
            background: 'transparent',
            border: 'none',
            borderBottom: action.id !== 'chart' ? '1px solid var(--line)' : 'none',
          }}
          onClick={() => onAction(action.id)}
          aria-label={action.description}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <action.icon className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          <span>{action.label}</span>
        </button>
      ))}
    </motion.div>,
    document.body
  )
}

export default PortfolioTokenActions
