import React, { useState, useCallback, useRef, useEffect } from 'react'
import { Search, X } from 'lucide-react'

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
    <div ref={containerRef} className="relative">
      <div className="flex flex-wrap items-center gap-2">
        <div
          className="flex items-center gap-2 rounded-xl border px-3 py-2"
          style={{ borderColor: 'var(--line)', background: 'var(--surface-2)' }}
        >
          <Search className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setIsExpanded(true)
            }}
            onFocus={() => setIsExpanded(true)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search token..."
            className="w-32 bg-transparent text-sm outline-none placeholder:text-[var(--text-muted)]"
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

        <div className="flex flex-wrap gap-1.5">
          {POPULAR_TOKENS.slice(0, 6).map((token) => (
            <button
              key={token.id}
              type="button"
              onClick={() => handleSelect(token)}
              className="rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition hover:border-[var(--accent)]"
              style={{
                borderColor: selectedToken?.id === token.id ? 'var(--accent)' : 'var(--line)',
                background: selectedToken?.id === token.id ? 'var(--accent-muted)' : 'var(--surface-2)',
                color: selectedToken?.id === token.id ? 'var(--accent)' : 'var(--text)',
              }}
            >
              {token.symbol}
            </button>
          ))}
        </div>
      </div>

      {isExpanded && filteredTokens.length > 0 && (
        <div
          className="absolute left-0 top-full z-20 mt-2 max-h-64 w-72 overflow-y-auto rounded-xl border shadow-xl"
          style={{ borderColor: 'var(--line)', background: 'var(--bg-elev)' }}
        >
          <div className="p-2">
            <div
              className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: 'var(--text-muted)' }}
            >
              Select token
            </div>
            {filteredTokens.map((token) => (
              <button
                key={token.id}
                type="button"
                onClick={() => handleSelect(token)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-[var(--hover)]"
                style={{
                  background: selectedToken?.id === token.id ? 'var(--accent-muted)' : undefined,
                }}
              >
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold"
                  style={{ background: 'var(--surface-2)', color: 'var(--text)' }}
                >
                  {token.symbol.slice(0, 2)}
                </span>
                <div className="flex-1">
                  <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                    {token.name}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
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
