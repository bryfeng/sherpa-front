/**
 * APP SHELL - Redesigned
 *
 * The main application shell with:
 * - Premium header with persona selector
 * - Resizable chat + workspace layout
 * - Smooth animations
 * - Theme-aware styling
 */

import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sun,
  Moon,
  Settings,
  PanelRight,
  PanelRightClose,
  Wallet,
  Plus,
} from 'lucide-react'
import { useTheme, usePersona } from '../../store'
import { PersonaSelector } from '../header/PersonaSelector'
import { WalletMenu } from '../header/WalletMenu'
import { ResizablePanel } from '../ui/ResizablePanel'
import '../../styles/design-system.css'

// ============================================
// LOGO
// ============================================

function SherpaLogo() {
  return (
    <div className="flex items-center gap-3">
      {/* Logo mark */}
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, var(--accent), var(--color-secondary, #4da6ff))',
          boxShadow: 'var(--shadow-glow)',
        }}
      >
        {/* Mountain shape */}
        <svg
          viewBox="0 0 24 24"
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ color: 'var(--text-inverse)' }}
        >
          <path d="M8 21l4-10 4 10" />
          <path d="M12 11l-4-5 8 0 -4 5" />
        </svg>
      </div>

      {/* Wordmark */}
      <div>
        <h1
          className="font-display font-bold text-lg tracking-tight"
          style={{ color: 'var(--text)' }}
        >
          Sherpa
        </h1>
        <p
          className="text-[10px] font-medium uppercase tracking-wider -mt-0.5"
          style={{ color: 'var(--text-muted)' }}
        >
          AI Portfolio Guide
        </p>
      </div>
    </div>
  )
}

// ============================================
// HEADER
// ============================================

interface HeaderProps {
  walletAddress?: string | null
  onConnect?: () => void
  onDisconnect?: () => void
  onNewChat?: () => void
  onOpenSettings?: () => void
  onViewPortfolio?: () => void
}

function Header({
  walletAddress,
  onConnect,
  onDisconnect,
  onNewChat,
  onOpenSettings,
  onViewPortfolio,
}: HeaderProps) {
  const { theme, toggleTheme } = useTheme()
  const { persona, setPersona } = usePersona()

  return (
    <header
      className="sticky top-0 z-30 border-b"
      style={{
        background: 'var(--bg)',
        borderColor: 'var(--line)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div className="flex items-center justify-between px-6 py-3">
        {/* Left: Logo + Persona */}
        <div className="flex items-center gap-6">
          <SherpaLogo />
          <div
            className="w-px h-6"
            style={{ background: 'var(--line)' }}
          />
          <PersonaSelector
            value={persona}
            onChange={setPersona}
          />
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* New Chat */}
          <motion.button
            onClick={onNewChat}
            className="sherpa-btn sherpa-btn--ghost sherpa-btn--sm"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Chat</span>
          </motion.button>

          {/* Theme toggle */}
          <motion.button
            onClick={toggleTheme}
            className="p-2 rounded-lg transition-colors"
            style={{
              color: 'var(--text-muted)',
              background: 'transparent',
            }}
            whileHover={{
              scale: 1.05,
              backgroundColor: 'var(--color-hover)',
            }}
            whileTap={{ scale: 0.95 }}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={theme}
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {theme === 'dark' ? (
                  <Sun className="w-4.5 h-4.5" />
                ) : (
                  <Moon className="w-4.5 h-4.5" />
                )}
              </motion.div>
            </AnimatePresence>
          </motion.button>

          {/* Settings */}
          <motion.button
            onClick={onOpenSettings}
            className="p-2 rounded-lg transition-colors"
            style={{
              color: 'var(--text-muted)',
              background: 'transparent',
            }}
            whileHover={{
              scale: 1.05,
              backgroundColor: 'var(--color-hover)',
            }}
            whileTap={{ scale: 0.95 }}
          >
            <Settings className="w-4.5 h-4.5" />
          </motion.button>

          {/* Wallet */}
          {walletAddress ? (
            <WalletMenu
              address={walletAddress}
              onDisconnect={onDisconnect || (() => {})}
              onViewPortfolio={onViewPortfolio}
            />
          ) : (
            <motion.button
              onClick={onConnect}
              className="sherpa-btn sherpa-btn--primary"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Wallet className="w-4 h-4" />
              <span>Connect</span>
            </motion.button>
          )}
        </div>
      </div>
    </header>
  )
}

// ============================================
// WORKSPACE TOGGLE
// ============================================

interface WorkspaceToggleProps {
  isVisible: boolean
  widgetCount: number
  onToggle: () => void
  sessionId?: string
}

function WorkspaceToggle({
  isVisible,
  widgetCount,
  onToggle,
  sessionId,
}: WorkspaceToggleProps) {
  return (
    <div
      className="flex items-center justify-between px-4 py-3 border-b"
      style={{
        borderColor: 'var(--line)',
        background: 'var(--surface-2)',
      }}
    >
      <div className="flex items-center gap-3">
        <motion.button
          onClick={onToggle}
          className="sherpa-btn sherpa-btn--secondary sherpa-btn--sm"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          aria-pressed={isVisible}
        >
          {isVisible ? (
            <PanelRightClose className="w-4 h-4" />
          ) : (
            <PanelRight className="w-4 h-4" />
          )}
          <span>
            Workspace
            {widgetCount > 0 && (
              <span
                className="ml-1.5 px-1.5 py-0.5 text-[10px] font-medium rounded-full"
                style={{
                  background: 'var(--accent-muted)',
                  color: 'var(--accent)',
                }}
              >
                {widgetCount}
              </span>
            )}
          </span>
        </motion.button>

        {!isVisible && (
          <span
            className="text-xs hidden sm:inline"
            style={{ color: 'var(--text-muted)' }}
          >
            Click to show workspace
          </span>
        )}
      </div>

      {/* Session indicator */}
      <div className="flex items-center gap-2">
        <span
          className="text-xs"
          style={{ color: 'var(--text-muted)' }}
        >
          Session
        </span>
        <span
          className="px-2 py-1 text-xs font-mono rounded"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            color: 'var(--text-muted)',
          }}
        >
          {sessionId ? `${sessionId.slice(0, 10)}...` : 'Draft'}
        </span>
      </div>
    </div>
  )
}

// ============================================
// APP SHELL
// ============================================

export interface AppShellProps {
  // Header props
  walletAddress?: string | null
  onConnect?: () => void
  onDisconnect?: () => void
  onNewChat?: () => void
  onOpenSettings?: () => void
  onViewPortfolio?: () => void

  // Workspace props
  workspaceVisible?: boolean
  onToggleWorkspace?: () => void
  widgetCount?: number
  sessionId?: string

  // Content
  chatContent: React.ReactNode
  workspaceContent?: React.ReactNode
}

export function AppShell({
  walletAddress,
  onConnect,
  onDisconnect,
  onNewChat,
  onOpenSettings,
  onViewPortfolio,
  workspaceVisible = false,
  onToggleWorkspace,
  widgetCount = 0,
  sessionId,
  chatContent,
  workspaceContent,
}: AppShellProps) {
  const { theme } = useTheme()
  const { persona } = usePersona()

  // Apply theme class to document
  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('theme-light', 'theme-snow')
    if (theme === 'light') {
      root.classList.add('theme-light', 'theme-snow')
    }
    root.setAttribute('data-theme', theme)
  }, [theme])

  // Apply persona attribute
  useEffect(() => {
    document.documentElement.setAttribute('data-persona', persona)
  }, [persona])

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--bg)', color: 'var(--text)' }}
    >
      <Header
        walletAddress={walletAddress}
        onConnect={onConnect}
        onDisconnect={onDisconnect}
        onNewChat={onNewChat}
        onOpenSettings={onOpenSettings}
        onViewPortfolio={onViewPortfolio}
      />

      <main className="flex-1 px-6 py-8">
        <div
          className="sherpa-card overflow-hidden"
          style={{
            maxWidth: '1600px',
            margin: '0 auto',
            minHeight: 'calc(100vh - 200px)',
          }}
        >
          <WorkspaceToggle
            isVisible={workspaceVisible}
            widgetCount={widgetCount}
            onToggle={onToggleWorkspace || (() => {})}
            sessionId={sessionId}
          />

          {workspaceVisible ? (
            <div className="flex flex-col lg:flex-row">
              {/* Chat panel - resizable on desktop */}
              <ResizablePanel
                defaultWidth={420}
                minWidth={320}
                maxWidth={600}
                side="left"
                className="hidden lg:block border-r [border-color:var(--line)]"
              >
                <div
                  className="h-full flex flex-col"
                  style={{
                    minHeight: '500px',
                    maxHeight: 'calc(100vh - 260px)',
                  }}
                >
                  <div
                    className="flex items-center justify-between px-4 py-3 border-b"
                    style={{ borderColor: 'var(--line)' }}
                  >
                    <span
                      className="text-xs font-medium uppercase tracking-wider"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      Chat
                    </span>
                    <span
                      className="sherpa-badge sherpa-badge--accent"
                    >
                      Active
                    </span>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    {chatContent}
                  </div>
                </div>
              </ResizablePanel>

              {/* Mobile chat */}
              <div
                className="lg:hidden border-b"
                style={{ borderColor: 'var(--line)' }}
              >
                <div
                  className="flex items-center justify-between px-4 py-3 border-b"
                  style={{ borderColor: 'var(--line)' }}
                >
                  <span
                    className="text-xs font-medium uppercase tracking-wider"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Chat
                  </span>
                  <span className="sherpa-badge sherpa-badge--accent">
                    Active
                  </span>
                </div>
                <div style={{ minHeight: '400px' }}>
                  {chatContent}
                </div>
              </div>

              {/* Workspace panel */}
              <div
                className="flex-1 overflow-auto"
                style={{
                  minHeight: '500px',
                  maxHeight: 'calc(100vh - 260px)',
                }}
              >
                {workspaceContent}
              </div>
            </div>
          ) : (
            <div
              style={{
                minHeight: '500px',
                maxHeight: 'calc(100vh - 200px)',
              }}
            >
              {chatContent}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default AppShell
