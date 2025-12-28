/**
 * PORTFOLIO PANEL
 *
 * Full-screen modal showing detailed portfolio view.
 * Opens from wallet menu "View Portfolio" action.
 */

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, RefreshCw, ExternalLink } from 'lucide-react'
import { usePortfolioSummary } from '../../workspace/hooks/usePortfolioSummary'
import { PortfolioTokenRow } from './PortfolioTokenRow'
import type { PortfolioPositionViewModel } from '../../workspace/types'

interface PortfolioPanelProps {
  isOpen: boolean
  onClose: () => void
  walletAddress?: string
  chain?: string
  onTokenAction?: (action: 'swap' | 'send' | 'chart', token: PortfolioPositionViewModel) => void
}

export function PortfolioPanel({
  isOpen,
  onClose,
  walletAddress,
  chain = 'ethereum',
  onTokenAction,
}: PortfolioPanelProps) {
  const { data, status, error, refresh, isFetching } = usePortfolioSummary({
    walletAddress,
    chain,
    auto: Boolean(walletAddress) && isOpen,
  })

  const [expandedTokens, setExpandedTokens] = React.useState<Set<string>>(new Set())

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

  // Handle escape key
  React.useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Prevent body scroll when open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50"
            style={{ background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-xl flex flex-col"
            style={{
              background: 'var(--bg)',
              borderLeft: '1px solid var(--line)',
              boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.2)',
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-4 border-b"
              style={{ borderColor: 'var(--line)' }}
            >
              <div>
                <h2
                  className="text-lg font-semibold"
                  style={{ color: 'var(--text)' }}
                >
                  Portfolio
                </h2>
                {walletAddress && (
                  <p
                    className="text-xs font-mono mt-0.5"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {walletAddress.slice(0, 10)}...{walletAddress.slice(-8)}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <motion.button
                  onClick={refresh}
                  disabled={isFetching}
                  className="p-2 rounded-lg transition-colors"
                  style={{
                    color: 'var(--text-muted)',
                    background: 'transparent',
                  }}
                  whileHover={{ backgroundColor: 'var(--surface-2)' }}
                  whileTap={{ scale: 0.95 }}
                >
                  <motion.div
                    animate={isFetching ? { rotate: 360 } : { rotate: 0 }}
                    transition={isFetching ? { duration: 1, repeat: Infinity, ease: 'linear' } : {}}
                  >
                    <RefreshCw className="w-4 h-4" />
                  </motion.div>
                </motion.button>

                <motion.button
                  onClick={onClose}
                  className="p-2 rounded-lg transition-colors"
                  style={{
                    color: 'var(--text-muted)',
                    background: 'transparent',
                  }}
                  whileHover={{ backgroundColor: 'var(--surface-2)' }}
                  whileTap={{ scale: 0.95 }}
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {!walletAddress ? (
                <div className="flex items-center justify-center h-full">
                  <p style={{ color: 'var(--text-muted)' }}>
                    Connect a wallet to view your portfolio
                  </p>
                </div>
              ) : status === 'loading' && !data ? (
                <div className="flex items-center justify-center h-32 gap-2">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <RefreshCw className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                  </motion.div>
                  <span style={{ color: 'var(--text-muted)' }}>Loading portfolio...</span>
                </div>
              ) : status === 'error' ? (
                <div className="flex flex-col items-center justify-center h-32 gap-2">
                  <p style={{ color: 'var(--danger)' }}>{error || 'Failed to load portfolio'}</p>
                  <button
                    onClick={refresh}
                    className="text-sm px-3 py-1 rounded-lg"
                    style={{ background: 'var(--surface-2)', color: 'var(--text)' }}
                  >
                    Try again
                  </button>
                </div>
              ) : data ? (
                <>
                  {/* Summary */}
                  <div
                    className="px-6 py-5 border-b"
                    style={{ borderColor: 'var(--line)' }}
                  >
                    <p
                      className="text-xs font-medium uppercase tracking-wider mb-1"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      Total Value
                    </p>
                    <p
                      className="text-3xl font-semibold tabular-nums"
                      style={{ color: 'var(--text)' }}
                    >
                      {data.totalUsdFormatted}
                    </p>
                    <p
                      className="text-sm mt-1"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {data.tokenCount} token{data.tokenCount !== 1 ? 's' : ''} on {chain}
                    </p>
                  </div>

                  {/* Token List */}
                  <div className="portfolio-tokens">
                    {data.allPositions?.map((position) => (
                      <PortfolioTokenRow
                        key={position.symbol}
                        position={position}
                        isExpanded={expandedTokens.has(position.symbol)}
                        onToggleExpand={() => toggleTokenExpand(position.symbol)}
                        onAction={onTokenAction}
                      />
                    ))}
                  </div>
                </>
              ) : null}
            </div>

            {/* Footer */}
            {walletAddress && (
              <div
                className="px-6 py-4 border-t"
                style={{ borderColor: 'var(--line)' }}
              >
                <a
                  href={`https://etherscan.io/address/${walletAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    background: 'var(--surface-2)',
                    color: 'var(--text)',
                  }}
                >
                  <span>View on Etherscan</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default PortfolioPanel
