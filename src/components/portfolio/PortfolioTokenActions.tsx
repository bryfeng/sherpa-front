/**
 * PORTFOLIO TOKEN ACTIONS
 *
 * Quick action popup menu for token operations.
 * Shows: Swap, Send, Chart options.
 */

import React from 'react'
import { motion } from 'framer-motion'
import { ArrowRightLeft, Send, LineChart } from 'lucide-react'
import type { PortfolioPositionViewModel } from '../../workspace/types'

interface PortfolioTokenActionsProps {
  token: PortfolioPositionViewModel
  onAction: (action: 'swap' | 'send' | 'chart') => void
  onClose: () => void
}

export function PortfolioTokenActions({
  token,
  onAction,
  onClose,
}: PortfolioTokenActionsProps) {
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

  return (
    <motion.div
      className="portfolio-actions-menu"
      initial={{ opacity: 0, scale: 0.95, y: -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -8 }}
      transition={{ duration: 0.15 }}
    >
      {actions.map((action) => (
        <button
          key={action.id}
          className="portfolio-actions-menu__item"
          onClick={() => onAction(action.id)}
          aria-label={action.description}
        >
          <action.icon className="w-4 h-4" />
          <span>{action.label}</span>
        </button>
      ))}
    </motion.div>
  )
}

export default PortfolioTokenActions
