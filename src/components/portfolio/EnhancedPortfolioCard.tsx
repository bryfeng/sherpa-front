/**
 * ENHANCED PORTFOLIO CARD
 *
 * Expandable portfolio inline card with tiered detail levels:
 * - Compact: Total value + top 3-5 tokens
 * - Expanded: Full list with allocation %, balances, and action menus
 */

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, RefreshCw, ExternalLink } from 'lucide-react'
import { usePortfolioSummary } from '../../workspace/hooks/usePortfolioSummary'
import { PortfolioTokenRow } from './PortfolioTokenRow'
import type { PortfolioPositionViewModel } from '../../workspace/types'

interface EnhancedPortfolioCardProps {
  walletAddress?: string
  chain?: string
  onTokenAction?: (action: 'swap' | 'send' | 'chart', token: PortfolioPositionViewModel) => void
  onViewFull?: () => void
}

export function EnhancedPortfolioCard({
  walletAddress,
  chain = 'ethereum',
  onTokenAction,
  onViewFull,
}: EnhancedPortfolioCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [expandedTokens, setExpandedTokens] = useState<Set<string>>(new Set())

  const { data, status, error, refresh, isFetching } = usePortfolioSummary({
    walletAddress,
    chain,
    auto: Boolean(walletAddress),
  })

  // Show top 5 in compact mode, all in expanded mode
  const displayPositions = useMemo(() => {
    if (!data?.allPositions) return []
    return isExpanded ? data.allPositions : data.allPositions.slice(0, 5)
  }, [data?.allPositions, isExpanded])

  const hasMoreTokens = (data?.allPositions?.length ?? 0) > 5

  const toggleTokenExpand = (symbol: string) => {
    setExpandedTokens((prev) => {
      const next = new Set(prev)
      if (next.has(symbol)) {
        next.delete(symbol)
      } else {
        next.add(symbol)
      }
      return next
    })
  }

  // Loading state
  if (!walletAddress) {
    return (
      <div className="enhanced-portfolio-card">
        <div className="text-center py-6">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Connect wallet to view portfolio
          </p>
        </div>
      </div>
    )
  }

  if (status === 'loading' && !data) {
    return (
      <div className="enhanced-portfolio-card">
        <div className="flex items-center justify-center py-8 gap-2">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <RefreshCw className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          </motion.div>
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Loading portfolio...
          </span>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="enhanced-portfolio-card">
        <div className="text-center py-6">
          <p className="text-sm mb-2" style={{ color: 'var(--danger)' }}>
            {error || 'Failed to load portfolio'}
          </p>
          <button
            onClick={refresh}
            className="text-sm px-3 py-1 rounded-lg transition-colors"
            style={{
              background: 'var(--surface-2)',
              color: 'var(--text)',
            }}
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  if (!data) {
    return null
  }

  return (
    <div className="enhanced-portfolio-card">
      {/* Header - Click to expand/collapse */}
      <motion.div
        className="portfolio-header"
        onClick={() => hasMoreTokens && setIsExpanded(!isExpanded)}
        style={{ cursor: hasMoreTokens ? 'pointer' : 'default' }}
        whileHover={hasMoreTokens ? { backgroundColor: 'var(--surface-2)' } : undefined}
      >
        <div className="portfolio-header__main">
          <div className="portfolio-header__value">
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Total Value
            </span>
            <div className="flex items-center gap-2">
              <span
                className="text-2xl font-semibold tabular-nums"
                style={{ color: 'var(--text)' }}
              >
                {data.totalUsdFormatted}
              </span>
              {isFetching && (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <RefreshCw className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
                </motion.div>
              )}
            </div>
          </div>

          <div className="portfolio-header__meta">
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {data.tokenCount} token{data.tokenCount !== 1 ? 's' : ''}
            </span>
            {onViewFull && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onViewFull()
                }}
                className="portfolio-view-full-btn"
              >
                <span>View Full</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {hasMoreTokens && (
          <div className="portfolio-header__expand">
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            ) : (
              <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            )}
          </div>
        )}
      </motion.div>

      {/* Token List */}
      <div className="portfolio-tokens">
        <AnimatePresence mode="popLayout">
          {displayPositions.map((position, index) => (
            <motion.div
              key={position.symbol}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, delay: index * 0.03 }}
            >
              <PortfolioTokenRow
                position={position}
                isExpanded={expandedTokens.has(position.symbol)}
                onToggleExpand={() => toggleTokenExpand(position.symbol)}
                onAction={onTokenAction}
              />
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Show more indicator */}
        {!isExpanded && hasMoreTokens && (
          <motion.div
            className="portfolio-show-more"
            onClick={() => setIsExpanded(true)}
            whileHover={{ backgroundColor: 'var(--surface-2)' }}
          >
            <span style={{ color: 'var(--text-muted)' }}>
              +{(data.allPositions?.length ?? 0) - 5} more tokens
            </span>
            <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default EnhancedPortfolioCard
