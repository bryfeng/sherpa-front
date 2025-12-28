/**
 * WALLET MENU
 *
 * Dropdown menu for connected wallet with options:
 * - Copy address
 * - View Portfolio
 * - Disconnect
 */

import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDown,
  Copy,
  Wallet,
  LogOut,
  Check,
  ExternalLink,
} from 'lucide-react'

interface WalletMenuProps {
  address: string
  onDisconnect: () => void
  onViewPortfolio?: () => void
}

export function WalletMenu({
  address,
  onDisconnect,
  onViewPortfolio,
}: WalletMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Truncate address for display
  const displayAddress = `${address.slice(0, 6)}...${address.slice(-4)}`

  // Update menu position when opening
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setMenuPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      })
    }
  }, [isOpen])

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
        buttonRef.current?.focus()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy address:', err)
    }
  }

  const handleViewPortfolio = () => {
    setIsOpen(false)
    onViewPortfolio?.()
  }

  const handleDisconnect = () => {
    setIsOpen(false)
    onDisconnect()
  }

  return (
    <>
      <motion.button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg"
        style={{
          background: 'var(--surface-2)',
          border: '1px solid var(--line)',
        }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <div
          className="w-2 h-2 rounded-full"
          style={{ background: 'var(--success)' }}
        />
        <span
          className="text-sm font-mono font-medium"
          style={{ color: 'var(--text)' }}
        >
          {displayAddress}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.15 }}
        >
          <ChevronDown
            className="w-4 h-4"
            style={{ color: 'var(--text-muted)' }}
          />
        </motion.div>
      </motion.button>

      <AnimatePresence>
        {isOpen &&
          createPortal(
            <motion.div
              ref={menuRef}
              role="menu"
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.15 }}
              className="fixed z-50 min-w-[200px] rounded-xl overflow-hidden"
              style={{
                top: menuPosition.top,
                right: menuPosition.right,
                background: 'var(--surface)',
                border: '1px solid var(--line)',
                boxShadow: 'var(--shadow-2)',
              }}
            >
              {/* Address display */}
              <div
                className="px-4 py-3 border-b"
                style={{ borderColor: 'var(--line)' }}
              >
                <p
                  className="text-xs font-medium uppercase tracking-wider mb-1"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Connected Wallet
                </p>
                <p
                  className="text-sm font-mono"
                  style={{ color: 'var(--text)' }}
                >
                  {displayAddress}
                </p>
              </div>

              {/* Menu items */}
              <div className="py-1">
                <button
                  role="menuitem"
                  onClick={handleCopyAddress}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                  style={{ color: 'var(--text)' }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = 'var(--surface-2)')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = 'transparent')
                  }
                >
                  {copied ? (
                    <Check className="w-4 h-4" style={{ color: 'var(--success)' }} />
                  ) : (
                    <Copy className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                  )}
                  <span className="text-sm">
                    {copied ? 'Copied!' : 'Copy Address'}
                  </span>
                </button>

                {onViewPortfolio && (
                  <button
                    role="menuitem"
                    onClick={handleViewPortfolio}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                    style={{ color: 'var(--text)' }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = 'var(--surface-2)')
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = 'transparent')
                    }
                  >
                    <Wallet className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                    <span className="text-sm">View Portfolio</span>
                    <ExternalLink
                      className="w-3 h-3 ml-auto"
                      style={{ color: 'var(--text-muted)' }}
                    />
                  </button>
                )}

                <div
                  className="my-1 mx-3 border-t"
                  style={{ borderColor: 'var(--line)' }}
                />

                <button
                  role="menuitem"
                  onClick={handleDisconnect}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                  style={{ color: 'var(--danger)' }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = 'var(--surface-2)')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = 'transparent')
                  }
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm">Disconnect</span>
                </button>
              </div>
            </motion.div>,
            document.body
          )}
      </AnimatePresence>
    </>
  )
}

export default WalletMenu
