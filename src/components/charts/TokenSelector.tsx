import React, { useState, useCallback, useRef, useEffect } from 'react'
import { ChevronDown, Search, X } from 'lucide-react'

export interface TokenOption {
  id: string
  symbol: string
  name: string
}

const POPULAR_TOKENS: TokenOption[] = [
  { id: 'ethereum', symbol: 'ETH', name: 'Ethereum' },
  { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin' },
  { id: 'solana', symbol: 'SOL', name: 'Solana' },
  { id: 'binancecoin', symbol: 'BNB', name: 'BNB' },
  { id: 'ripple', symbol: 'XRP', name: 'XRP' },
  { id: 'cardano', symbol: 'ADA', name: 'Cardano' },
  { id: 'avalanche-2', symbol: 'AVAX', name: 'Avalanche' },
  { id: 'polkadot', symbol: 'DOT', name: 'Polkadot' },
  { id: 'matic-network', symbol: 'MATIC', name: 'Polygon' },
  { id: 'chainlink', symbol: 'LINK', name: 'Chainlink' },
  { id: 'uniswap', symbol: 'UNI', name: 'Uniswap' },
  { id: 'aave', symbol: 'AAVE', name: 'Aave' },
]

interface TokenSelectorProps {
  selectedToken: TokenOption | null
  onSelectToken: (token: TokenOption) => void
}

export function TokenSelector({ selectedToken, onSelectToken }: TokenSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const filteredTokens = searchQuery.trim()
    ? POPULAR_TOKENS.filter(
        (token) =>
          token.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
          token.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          token.id.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : POPULAR_TOKENS

  const handleSelect = useCallback(
    (token: TokenOption) => {
      onSelectToken(token)
      setSearchQuery('')
      setIsExpanded(false)
    },
    [onSelectToken]
  )

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && filteredTokens.length > 0) {
      handleSelect(filteredTokens[0])
    }
    if (e.key === 'Escape') {
      setSearchQuery('')
      setIsExpanded(false)
    }
  }

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsExpanded(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Get quick tokens (top 4 excluding selected)
  const quickTokens = POPULAR_TOKENS.slice(0, 4)
    .filter((t) => t.id !== selectedToken?.id)
    .slice(0, 3)

  return (
    <div ref={containerRef} className="relative inline-flex items-center gap-1">
      {/* Selected token dropdown trigger */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-semibold transition-all hover:opacity-80"
        style={{
          background: 'var(--accent)',
          color: '#fff',
        }}
      >
        {selectedToken?.symbol || 'Select'}
        <ChevronDown
          className="h-3.5 w-3.5 transition-transform"
          style={{ transform: isExpanded ? 'rotate(180deg)' : undefined }}
        />
      </button>

      {/* Quick token buttons - consistent style */}
      {quickTokens.map((token) => (
        <button
          key={token.id}
          type="button"
          onClick={() => handleSelect(token)}
          className="rounded-lg px-2.5 py-1.5 text-sm font-medium transition-all hover:bg-[var(--accent)] hover:text-white"
          style={{
            background: 'var(--surface-2)',
            color: 'var(--text)',
          }}
        >
          {token.symbol}
        </button>
      ))}

      {/* Dropdown */}
      {isExpanded && (
        <div
          className="absolute left-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-xl border shadow-2xl"
          style={{
            borderColor: 'var(--line)',
            background: 'var(--bg-elev)',
            boxShadow: '0 20px 40px -10px rgba(0,0,0,0.2)',
          }}
        >
          {/* Search input */}
          <div
            className="flex items-center gap-2 border-b px-3 py-2.5"
            style={{ borderColor: 'var(--line)' }}
          >
            <Search className="h-4 w-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search tokens..."
              autoFocus
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--text-muted)]"
              style={{ color: 'var(--text)' }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="rounded p-1 hover:bg-[var(--hover)]"
              >
                <X className="h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
              </button>
            )}
          </div>

          {/* Token list */}
          <div className="max-h-64 overflow-y-auto p-1.5">
            {filteredTokens.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                No tokens found
              </div>
            ) : (
              filteredTokens.map((token) => {
                const isSelected = selectedToken?.id === token.id
                return (
                  <button
                    key={token.id}
                    type="button"
                    onClick={() => handleSelect(token)}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-[var(--hover)]"
                    style={{
                      background: isSelected ? 'var(--accent-muted)' : undefined,
                    }}
                  >
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                      style={{
                        background: isSelected ? 'var(--accent)' : 'var(--surface-2)',
                        color: isSelected ? '#fff' : 'var(--text)',
                      }}
                    >
                      {token.symbol.slice(0, 2)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium" style={{ color: 'var(--text)' }}>
                        {token.name}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {token.symbol}
                      </div>
                    </div>
                    {isSelected && (
                      <span className="text-xs font-medium" style={{ color: 'var(--accent)' }}>
                        Selected
                      </span>
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
