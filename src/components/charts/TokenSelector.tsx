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

  return (
    <div ref={containerRef} className="relative inline-flex items-center gap-1.5">
      {/* Selected token button */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm font-semibold transition hover:border-[var(--accent)]"
        style={{
          borderColor: 'var(--accent)',
          background: 'var(--accent-muted)',
          color: 'var(--accent)',
        }}
      >
        {selectedToken?.symbol || 'Select'}
        <ChevronDown className="h-3.5 w-3.5" />
      </button>

      {/* Quick token buttons */}
      {POPULAR_TOKENS.slice(0, 4)
        .filter((t) => t.id !== selectedToken?.id)
        .slice(0, 3)
        .map((token) => (
          <button
            key={token.id}
            type="button"
            onClick={() => handleSelect(token)}
            className="rounded-lg border px-2 py-1.5 text-xs font-medium transition hover:border-[var(--accent)] hover:bg-[var(--hover)]"
            style={{
              borderColor: 'var(--line)',
              background: 'var(--surface-2)',
              color: 'var(--text-muted)',
            }}
          >
            {token.symbol}
          </button>
        ))}

      {/* Dropdown */}
      {isExpanded && (
        <div
          className="absolute left-0 top-full z-20 mt-1.5 w-56 overflow-hidden rounded-xl border shadow-xl"
          style={{ borderColor: 'var(--line)', background: 'var(--bg-elev)' }}
        >
          {/* Search input */}
          <div
            className="flex items-center gap-2 border-b px-3 py-2"
            style={{ borderColor: 'var(--line)', background: 'var(--surface-2)' }}
          >
            <Search className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--text-muted)' }} />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search..."
              autoFocus
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--text-muted)]"
              style={{ color: 'var(--text)' }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="rounded p-0.5 hover:bg-[var(--hover)]"
              >
                <X className="h-3 w-3" style={{ color: 'var(--text-muted)' }} />
              </button>
            )}
          </div>

          {/* Token list */}
          <div className="max-h-48 overflow-y-auto p-1.5">
            {filteredTokens.map((token) => (
              <button
                key={token.id}
                type="button"
                onClick={() => handleSelect(token)}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition hover:bg-[var(--hover)]"
                style={{
                  background: selectedToken?.id === token.id ? 'var(--accent-muted)' : undefined,
                }}
              >
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                  style={{ background: 'var(--surface-2)', color: 'var(--text)' }}
                >
                  {token.symbol.slice(0, 2)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium" style={{ color: 'var(--text)' }}>
                    {token.name}
                  </div>
                  <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    {token.symbol}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
