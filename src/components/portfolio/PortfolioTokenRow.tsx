/**
 * PORTFOLIO TOKEN ROW
 *
 * Individual token row that can expand to show details.
 * Includes allocation %, value, and action menu trigger.
 */

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, MoreVertical } from 'lucide-react'
import type { PortfolioPositionViewModel } from '../../workspace/types'
import { PortfolioTokenActions } from './PortfolioTokenActions'

interface PortfolioTokenRowProps {
  position: PortfolioPositionViewModel
  isExpanded: boolean
  onToggleExpand: () => void
  onAction?: (action: 'swap' | 'send' | 'chart', token: PortfolioPositionViewModel) => void
  // Future: sparkline data
  change24h?: number
}

export function PortfolioTokenRow({
  position,
  isExpanded,
  onToggleExpand,
  onAction,
  change24h,
}: PortfolioTokenRowProps) {
  const [showActions, setShowActions] = useState(false)
  const actionButtonRef = useRef<HTMLButtonElement>(null)

  // Close action menu when clicking outside
  useEffect(() => {
    if (!showActions) return

    const handleClickOutside = (e: MouseEvent) => {
      if (actionButtonRef.current && !actionButtonRef.current.contains(e.target as Node)) {
        setShowActions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showActions])

  // Handle keyboard
  useEffect(() => {
    if (!showActions) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowActions(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [showActions])

  const handleAction = (action: 'swap' | 'send' | 'chart') => {
    setShowActions(false)
    onAction?.(action, position)
  }

  // Format allocation percentage
  const allocationDisplay = position.allocationPercent !== undefined
    ? position.allocationPercent >= 0.1
      ? `${position.allocationPercent.toFixed(1)}%`
      : '<0.1%'
    : null

  // Determine change color
  const changeColor = change24h !== undefined
    ? change24h > 0
      ? 'var(--success)'
      : change24h < 0
        ? 'var(--danger)'
        : 'var(--text-muted)'
    : undefined

  return (
    <div className="portfolio-token-row">
      {/* Main row content */}
      <div
        className="portfolio-token-row__main"
        onClick={onToggleExpand}
      >
        {/* Expand indicator */}
        <motion.div
          className="portfolio-token-row__expand-icon"
          animate={{ rotate: isExpanded ? 90 : 0 }}
          transition={{ duration: 0.15 }}
        >
          <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
        </motion.div>

        {/* Token avatar */}
        <div
          className="portfolio-token-row__avatar"
          style={{ background: 'var(--surface-2)', color: 'var(--text)' }}
        >
          {position.symbol.slice(0, 2)}
        </div>

        {/* Token info */}
        <div className="portfolio-token-row__info">
          <span className="portfolio-token-row__symbol">{position.symbol}</span>
          {allocationDisplay && (
            <span className="portfolio-token-row__allocation">{allocationDisplay}</span>
          )}
        </div>

        {/* Value + Change */}
        <div className="portfolio-token-row__values">
          <span className="portfolio-token-row__usd">{position.usdFormatted}</span>
          {change24h !== undefined && (
            <span
              className="portfolio-token-row__change"
              style={{ color: changeColor }}
            >
              {change24h > 0 ? '+' : ''}{change24h.toFixed(1)}%
            </span>
          )}
        </div>

        {/* Sparkline placeholder - will be added in Phase 2 */}
        <div className="portfolio-token-row__sparkline">
          {/* Future: <PortfolioSparkline data={sparklineData} /> */}
        </div>

        {/* Actions button */}
        <div className="portfolio-token-row__actions" onClick={(e) => e.stopPropagation()}>
          <button
            ref={actionButtonRef}
            className="portfolio-token-row__action-btn"
            onClick={() => setShowActions(!showActions)}
            aria-label="Token actions"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          <AnimatePresence>
            {showActions && (
              <PortfolioTokenActions
                token={position}
                onAction={handleAction}
                onClose={() => setShowActions(false)}
                triggerRef={actionButtonRef}
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Expanded details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            className="portfolio-token-row__details"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="portfolio-token-row__details-inner">
              <div className="portfolio-token-row__detail">
                <span className="portfolio-token-row__detail-label">Name</span>
                <span className="portfolio-token-row__detail-value">{position.name}</span>
              </div>
              {position.balanceFormatted && (
                <div className="portfolio-token-row__detail">
                  <span className="portfolio-token-row__detail-label">Balance</span>
                  <span className="portfolio-token-row__detail-value">
                    {position.balanceFormatted} {position.symbol}
                  </span>
                </div>
              )}
              {position.network && (
                <div className="portfolio-token-row__detail">
                  <span className="portfolio-token-row__detail-label">Network</span>
                  <span className="portfolio-token-row__detail-value">{position.network}</span>
                </div>
              )}
              {position.address && (
                <div className="portfolio-token-row__detail">
                  <span className="portfolio-token-row__detail-label">Contract</span>
                  <span className="portfolio-token-row__detail-value portfolio-token-row__contract">
                    {position.address.slice(0, 6)}...{position.address.slice(-4)}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default PortfolioTokenRow
