/**
 * WIDGET PICKER COMPONENT
 *
 * Modal interface for browsing and adding widgets to the workspace.
 * Organized by category with search and filtering.
 */

import React, { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Search,
  Plus,
  Wallet,
  TrendingUp,
  Zap,
  Sparkles,
  Clock,
  Wrench,
  Lock,
  Check,
} from 'lucide-react'
import type { WidgetCategory, WidgetKind } from '../../types/widget-system'
import {
  WIDGET_REGISTRY,
  WIDGET_CATEGORIES,
  getWidgetsByCategory,
  searchWidgets,
  type WidgetMetadata,
} from '../../lib/widget-registry'
import { useWidgetStore, useWidgetPicker } from '../../store/widget-store'
import '../../styles/design-system.css'

// ============================================
// CATEGORY ICONS
// ============================================

const CATEGORY_ICONS: Record<WidgetCategory, React.ReactNode> = {
  data: <Wallet className="w-5 h-5" />,
  chart: <TrendingUp className="w-5 h-5" />,
  action: <Zap className="w-5 h-5" />,
  insight: <Sparkles className="w-5 h-5" />,
  history: <Clock className="w-5 h-5" />,
  utility: <Wrench className="w-5 h-5" />,
}

// ============================================
// WIDGET CARD
// ============================================

interface WidgetCardProps {
  metadata: WidgetMetadata
  onAdd: () => void
  isAdded: boolean
  isPro: boolean
  hasPro: boolean
}

function WidgetCard({ metadata, onAdd, isAdded, isPro, hasPro }: WidgetCardProps) {
  const categoryInfo = WIDGET_CATEGORIES.find((c) => c.id === metadata.category)
  const canAdd = !isPro || hasPro

  return (
    <motion.button
      onClick={canAdd ? onAdd : undefined}
      disabled={!canAdd}
      className="w-full text-left p-4 rounded-xl border transition-all"
      style={{
        background: isAdded ? 'var(--accent-muted)' : 'var(--surface)',
        borderColor: isAdded ? 'var(--accent)' : 'var(--line)',
        opacity: canAdd ? 1 : 0.5,
        cursor: canAdd ? 'pointer' : 'not-allowed',
      }}
      whileHover={canAdd ? { scale: 1.02, borderColor: 'var(--accent)' } : undefined}
      whileTap={canAdd ? { scale: 0.99 } : undefined}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            background: `${categoryInfo?.color}20`,
            color: categoryInfo?.color,
          }}
        >
          {CATEGORY_ICONS[metadata.category]}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4
              className="font-medium text-sm truncate"
              style={{ color: 'var(--text)' }}
            >
              {metadata.name}
            </h4>
            {isPro && (
              <span
                className="px-1.5 py-0.5 text-[10px] font-medium rounded"
                style={{
                  background: 'var(--warning-muted)',
                  color: 'var(--warning)',
                }}
              >
                PRO
              </span>
            )}
            {metadata.requiresWallet && (
              <Lock className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
            )}
          </div>
          <p
            className="text-xs mt-1 line-clamp-2"
            style={{ color: 'var(--text-muted)' }}
          >
            {metadata.description}
          </p>

          {/* Tags */}
          <div className="flex flex-wrap gap-1 mt-2">
            {metadata.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-1.5 py-0.5 text-[10px] rounded"
                style={{
                  background: 'var(--surface-2)',
                  color: 'var(--text-muted)',
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Add indicator */}
        <div className="flex-shrink-0">
          {isAdded ? (
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{
                background: 'var(--accent)',
                color: 'var(--text-inverse)',
              }}
            >
              <Check className="w-4 h-4" />
            </div>
          ) : canAdd ? (
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center border"
              style={{
                borderColor: 'var(--line)',
                color: 'var(--text-muted)',
              }}
            >
              <Plus className="w-4 h-4" />
            </div>
          ) : (
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{
                background: 'var(--surface-2)',
                color: 'var(--text-muted)',
              }}
            >
              <Lock className="w-3 h-3" />
            </div>
          )}
        </div>
      </div>
    </motion.button>
  )
}

// ============================================
// CATEGORY TAB
// ============================================

interface CategoryTabProps {
  category: typeof WIDGET_CATEGORIES[number]
  isActive: boolean
  count: number
  onClick: () => void
}

function CategoryTab({ category, isActive, count, onClick }: CategoryTabProps) {
  return (
    <motion.button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
      style={{
        background: isActive ? 'var(--accent-muted)' : 'transparent',
        color: isActive ? 'var(--accent)' : 'var(--text-muted)',
        border: `1px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
      }}
      whileHover={!isActive ? { background: 'var(--color-hover)' } : undefined}
      whileTap={{ scale: 0.98 }}
    >
      <span style={{ color: category.color }}>{CATEGORY_ICONS[category.id]}</span>
      <span className="text-sm font-medium">{category.name}</span>
      <span
        className="text-xs px-1.5 py-0.5 rounded-full"
        style={{
          background: isActive ? 'var(--accent)' : 'var(--surface-2)',
          color: isActive ? 'var(--text-inverse)' : 'var(--text-muted)',
        }}
      >
        {count}
      </span>
    </motion.button>
  )
}

// ============================================
// WIDGET PICKER MODAL
// ============================================

interface WidgetPickerProps {
  /** Whether user has pro access */
  hasPro?: boolean
  /** Wallet address (for wallet-required widgets) */
  walletAddress?: string | null
}

export function WidgetPicker({ hasPro = false, walletAddress }: WidgetPickerProps) {
  const { isOpen, category: initialCategory, close } = useWidgetPicker()
  const addWidget = useWidgetStore((s) => s.addWidget)
  const widgets = useWidgetStore((s) => s.widgets)

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<WidgetCategory | 'all'>(
    initialCategory || 'all'
  )
  const [justAdded, setJustAdded] = useState<Set<WidgetKind>>(new Set())

  // Filter widgets based on search and category
  const filteredWidgets = useMemo(() => {
    let results: WidgetMetadata[] = []

    if (searchQuery.trim()) {
      results = searchWidgets(searchQuery)
    } else if (selectedCategory === 'all') {
      results = Object.values(WIDGET_REGISTRY)
    } else {
      results = getWidgetsByCategory(selectedCategory)
    }

    // Sort: wallet-not-required first, then pro last
    return results.sort((a, b) => {
      if (a.requiresWallet !== b.requiresWallet) {
        return a.requiresWallet ? 1 : -1
      }
      if (a.requiresPro !== b.requiresPro) {
        return a.requiresPro ? 1 : -1
      }
      return 0
    })
  }, [searchQuery, selectedCategory])

  // Count widgets per category
  const categoryCounts = useMemo(() => {
    const counts: Record<WidgetCategory, number> = {
      data: 0,
      chart: 0,
      action: 0,
      insight: 0,
      history: 0,
      utility: 0,
    }
    Object.values(WIDGET_REGISTRY).forEach((w) => {
      counts[w.category]++
    })
    return counts
  }, [])

  // Check if widget is already in workspace
  const isWidgetAdded = useCallback(
    (kind: WidgetKind) => {
      return widgets.some((w) => w.kind === kind) || justAdded.has(kind)
    },
    [widgets, justAdded]
  )

  // Add widget handler
  const handleAddWidget = useCallback(
    (kind: WidgetKind) => {
      addWidget({ kind })
      setJustAdded((prev) => new Set([...prev, kind]))

      // Clear from "just added" after animation
      setTimeout(() => {
        setJustAdded((prev) => {
          const next = new Set(prev)
          next.delete(kind)
          return next
        })
      }, 1000)
    },
    [addWidget]
  )

  // Reset state on close
  const handleClose = useCallback(() => {
    close()
    setSearchQuery('')
    setSelectedCategory('all')
    setJustAdded(new Set())
  }, [close])

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
              width: 'min(800px, calc(100vw - 2rem))',
              height: 'min(600px, calc(100vh - 4rem))',
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              boxShadow: 'var(--shadow-xl)',
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0"
              style={{ borderColor: 'var(--line)' }}
            >
              <div>
                <h2
                  className="text-lg font-semibold"
                  style={{ color: 'var(--text)' }}
                >
                  Add Widget
                </h2>
                <p
                  className="text-sm mt-0.5"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Customize your workspace with widgets
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
              className="px-6 py-4 border-b flex-shrink-0"
              style={{ borderColor: 'var(--line)' }}
            >
              <div
                className="flex items-center gap-3 px-4 py-2.5 rounded-lg"
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--line)',
                }}
              >
                <Search className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search widgets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent outline-none text-sm"
                  style={{ color: 'var(--text)' }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="p-1 rounded hover:bg-black/10"
                  >
                    <X className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                  </button>
                )}
              </div>
            </div>

            {/* Categories */}
            <div
              className="px-6 py-3 border-b overflow-x-auto flex-shrink-0"
              style={{ borderColor: 'var(--line)' }}
            >
              <div className="flex items-center gap-2">
                <motion.button
                  onClick={() => setSelectedCategory('all')}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
                  style={{
                    background: selectedCategory === 'all' ? 'var(--accent-muted)' : 'transparent',
                    color: selectedCategory === 'all' ? 'var(--accent)' : 'var(--text-muted)',
                    border: `1px solid ${selectedCategory === 'all' ? 'var(--accent)' : 'transparent'}`,
                  }}
                  whileHover={selectedCategory !== 'all' ? { background: 'var(--color-hover)' } : undefined}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="text-sm font-medium">All</span>
                  <span
                    className="text-xs px-1.5 py-0.5 rounded-full"
                    style={{
                      background: selectedCategory === 'all' ? 'var(--accent)' : 'var(--surface-2)',
                      color: selectedCategory === 'all' ? 'var(--text-inverse)' : 'var(--text-muted)',
                    }}
                  >
                    {Object.keys(WIDGET_REGISTRY).length}
                  </span>
                </motion.button>

                {WIDGET_CATEGORIES.map((category) => (
                  <CategoryTab
                    key={category.id}
                    category={category}
                    isActive={selectedCategory === category.id}
                    count={categoryCounts[category.id]}
                    onClick={() => setSelectedCategory(category.id)}
                  />
                ))}
              </div>
            </div>

            {/* Widget list */}
            <div className="flex-1 overflow-y-auto p-6">
              {filteredWidgets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Search className="w-12 h-12 mb-4" style={{ color: 'var(--text-muted)' }} />
                  <p style={{ color: 'var(--text-muted)' }}>
                    No widgets found matching &ldquo;{searchQuery}&rdquo;
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredWidgets.map((metadata) => (
                    <WidgetCard
                      key={metadata.kind}
                      metadata={metadata}
                      onAdd={() => handleAddWidget(metadata.kind)}
                      isAdded={isWidgetAdded(metadata.kind)}
                      isPro={metadata.requiresPro}
                      hasPro={hasPro}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              className="px-6 py-4 border-t flex items-center justify-between flex-shrink-0"
              style={{
                borderColor: 'var(--line)',
                background: 'var(--surface-2)',
              }}
            >
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {!walletAddress && (
                  <>
                    <Lock className="w-3 h-3 inline mr-1" />
                    Connect wallet for full access
                  </>
                )}
              </p>
              <motion.button
                onClick={handleClose}
                className="sherpa-btn sherpa-btn--secondary"
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

export default WidgetPicker
