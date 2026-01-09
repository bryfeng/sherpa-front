/**
 * ARTIFACT PICKER
 *
 * Simple picker for adding widgets to the artifact panel.
 * Works with useSherpaStore (not useWidgetStore).
 */

import React, { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Search,
  Plus,
  TrendingUp,
  Wallet,
  Shield,
  Repeat,
  Clock,
  Check,
} from 'lucide-react'
import { useSherpaStore } from '../../store'
import type { Widget } from '../../types/widgets'

// Available artifacts that can be added
const AVAILABLE_ARTIFACTS = [
  {
    id: 'my-strategies',
    kind: 'my-strategies' as const,
    name: 'My Strategies',
    description: 'View and manage your automated trading strategies',
    icon: Repeat,
    category: 'utility',
    tags: ['strategies', 'automation', 'dca'],
  },
  {
    id: 'risk-policy',
    kind: 'risk-policy' as const,
    name: 'Risk Policy',
    description: 'Configure trading limits and safety controls',
    icon: Shield,
    category: 'utility',
    tags: ['policy', 'risk', 'limits'],
  },
  {
    id: 'portfolio_overview',
    kind: 'portfolio' as const,
    name: 'Portfolio',
    description: 'View your portfolio holdings and balances',
    icon: Wallet,
    category: 'data',
    tags: ['portfolio', 'holdings', 'balance'],
  },
  {
    id: 'trending_tokens',
    kind: 'trending' as const,
    name: 'Trending Tokens',
    description: 'See trending tokens and market movers',
    icon: TrendingUp,
    category: 'data',
    tags: ['trending', 'tokens', 'market'],
  },
  {
    id: 'history-summary',
    kind: 'history-summary' as const,
    name: 'Wallet History',
    description: 'View your recent transaction history',
    icon: Clock,
    category: 'history',
    tags: ['history', 'transactions', 'activity'],
  },
]

interface ArtifactPickerProps {
  isOpen: boolean
  onClose: () => void
  walletAddress?: string
}

export function ArtifactPicker({ isOpen, onClose, walletAddress }: ArtifactPickerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const addWidget = useSherpaStore((s) => s.addWidget)
  const artifactTabs = useSherpaStore((s) => s.artifactTabs)
  const widgets = useSherpaStore((s) => s.widgets)

  // Filter artifacts based on search
  const filteredArtifacts = useMemo(() => {
    if (!searchQuery.trim()) return AVAILABLE_ARTIFACTS
    const query = searchQuery.toLowerCase()
    return AVAILABLE_ARTIFACTS.filter(
      (a) =>
        a.name.toLowerCase().includes(query) ||
        a.description.toLowerCase().includes(query) ||
        a.tags.some((t) => t.includes(query))
    )
  }, [searchQuery])

  // Check if artifact is already open as a tab
  // Only show as "open" if it's actually in the artifact tabs
  const isArtifactOpen = useCallback(
    (id: string) => {
      // Check if this artifact ID is in tabs AND the widget actually exists
      const inTabs = artifactTabs.includes(id)
      const widgetExists = widgets.some((w) => w.id === id)
      return inTabs && widgetExists
    },
    [artifactTabs, widgets]
  )

  // Add artifact to panel
  const handleAdd = useCallback(
    (artifact: typeof AVAILABLE_ARTIFACTS[number]) => {
      const widget: Widget = {
        id: artifact.id,
        kind: artifact.kind,
        title: artifact.name,
        payload: {
          walletAddress,
        },
        sources: [],
        density: 'full',
      }
      addWidget(widget)
    },
    [addWidget, walletAddress]
  )

  const handleClose = useCallback(() => {
    setSearchQuery('')
    onClose()
  }, [onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className="fixed inset-0 m-auto z-50 rounded-2xl overflow-hidden flex flex-col"
            style={{
              width: 'min(480px, calc(100vw - 2rem))',
              height: 'min(500px, calc(100vh - 4rem))',
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              boxShadow: 'var(--shadow-xl)',
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0"
              style={{ borderColor: 'var(--line)' }}
            >
              <div>
                <h2
                  className="text-base font-semibold"
                  style={{ color: 'var(--text)' }}
                >
                  Add to Artifacts
                </h2>
                <p
                  className="text-xs mt-0.5"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Select a widget to add to your artifact panel
                </p>
              </div>
              <motion.button
                onClick={handleClose}
                className="p-2 rounded-lg transition-colors"
                style={{
                  color: 'var(--text-muted)',
                  background: 'transparent',
                }}
                whileHover={{ background: 'var(--color-hover)' }}
                whileTap={{ scale: 0.95 }}
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>

            {/* Search */}
            <div
              className="px-5 py-3 border-b flex-shrink-0"
              style={{ borderColor: 'var(--line)' }}
            >
              <div
                className="flex items-center gap-3 px-3 py-2 rounded-lg"
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--line)',
                }}
              >
                <Search className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search widgets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent outline-none text-sm"
                  style={{ color: 'var(--text)' }}
                  autoFocus
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="p-1 rounded hover:bg-black/10"
                  >
                    <X className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
                  </button>
                )}
              </div>
            </div>

            {/* Artifact list */}
            <div className="flex-1 overflow-y-auto p-4">
              {filteredArtifacts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Search className="w-10 h-10 mb-3" style={{ color: 'var(--text-muted)' }} />
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    No widgets found
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredArtifacts.map((artifact) => {
                    const isOpen = isArtifactOpen(artifact.id)
                    const Icon = artifact.icon

                    return (
                      <motion.button
                        key={artifact.id}
                        onClick={() => !isOpen && handleAdd(artifact)}
                        disabled={isOpen}
                        className="w-full text-left p-3 rounded-xl border transition-all flex items-center gap-3"
                        style={{
                          background: isOpen ? 'var(--accent-muted)' : 'var(--surface)',
                          borderColor: isOpen ? 'var(--accent)' : 'var(--line)',
                          opacity: isOpen ? 0.7 : 1,
                          cursor: isOpen ? 'default' : 'pointer',
                        }}
                        whileHover={!isOpen ? { scale: 1.01, borderColor: 'var(--accent)' } : undefined}
                        whileTap={!isOpen ? { scale: 0.99 } : undefined}
                      >
                        {/* Icon */}
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{
                            background: 'var(--surface-2)',
                            color: 'var(--accent)',
                          }}
                        >
                          <Icon className="w-5 h-5" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <h4
                            className="font-medium text-sm"
                            style={{ color: 'var(--text)' }}
                          >
                            {artifact.name}
                          </h4>
                          <p
                            className="text-xs mt-0.5 truncate"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            {artifact.description}
                          </p>
                        </div>

                        {/* Status */}
                        <div className="flex-shrink-0">
                          {isOpen ? (
                            <div
                              className="w-6 h-6 rounded-full flex items-center justify-center"
                              style={{
                                background: 'var(--accent)',
                                color: 'var(--text-inverse)',
                              }}
                            >
                              <Check className="w-4 h-4" />
                            </div>
                          ) : (
                            <div
                              className="w-6 h-6 rounded-full flex items-center justify-center border"
                              style={{
                                borderColor: 'var(--line)',
                                color: 'var(--text-muted)',
                              }}
                            >
                              <Plus className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                      </motion.button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              className="px-5 py-3 border-t flex items-center justify-end flex-shrink-0"
              style={{
                borderColor: 'var(--line)',
                background: 'var(--surface-2)',
              }}
            >
              <motion.button
                onClick={handleClose}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{
                  background: 'var(--accent)',
                  color: 'var(--text-inverse)',
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Done
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default ArtifactPicker
