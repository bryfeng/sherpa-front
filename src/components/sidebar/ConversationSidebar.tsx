import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { PanelLeftClose, Plus, Search, Loader2 } from 'lucide-react'
import { ConversationList } from './ConversationList'
import { useConversations } from '../../hooks/useConversations'

interface ConversationSidebarProps {
  isVisible: boolean
  walletAddress: string | null
  onNewChat: () => void
  onCollapse: () => void
}

export function ConversationSidebar({
  isVisible,
  walletAddress,
  onNewChat,
  onCollapse,
}: ConversationSidebarProps) {
  const {
    conversations,
    isLoading,
    isEmpty,
    currentConversationId,
    selectConversation,
    renameConversation,
    archiveConversation,
    deleteConversation,
    searchQuery,
    setSearchQuery,
  } = useConversations({ walletAddress })

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.aside
          initial={{ opacity: 0, x: -20, width: 0 }}
          animate={{ opacity: 1, x: 0, width: 280 }}
          exit={{ opacity: 0, x: -20, width: 0 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="hidden lg:flex flex-col border-r overflow-hidden shrink-0"
          style={{ borderColor: 'var(--line)', background: 'var(--surface-2)' }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between gap-2 border-b px-4 py-3 shrink-0"
            style={{ borderColor: 'var(--line)' }}
          >
            <span
              className="text-xs font-medium uppercase tracking-wide"
              style={{ color: 'var(--text-muted)' }}
            >
              History
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={onNewChat}
                className="p-1.5 rounded-md hover:bg-[var(--surface-3)] transition-colors"
                title="New conversation"
              >
                <Plus className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
              </button>
              <button
                onClick={onCollapse}
                className="p-1.5 rounded-md hover:bg-[var(--surface-3)] transition-colors"
                title="Close sidebar"
              >
                <PanelLeftClose className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="px-3 py-2 shrink-0">
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg border"
              style={{ borderColor: 'var(--line)', background: 'var(--surface-3)' }}
            >
              <Search className="h-4 w-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ color: 'var(--text)' }}
              />
            </div>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto px-2 py-2">
            {!walletAddress ? (
              <div
                className="flex flex-col items-center justify-center py-8 px-4 text-center"
                style={{ color: 'var(--text-muted)' }}
              >
                <p className="text-sm">Connect a wallet</p>
                <p className="text-xs mt-1">to see your conversation history</p>
              </div>
            ) : isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--text-muted)' }} />
              </div>
            ) : (
              <ConversationList
                groups={conversations}
                currentConversationId={currentConversationId}
                onSelect={selectConversation}
                onRename={renameConversation}
                onArchive={archiveConversation}
                onDelete={deleteConversation}
              />
            )}
          </div>

          {/* Footer */}
          {walletAddress && !isEmpty && (
            <div
              className="border-t px-3 py-2 shrink-0"
              style={{ borderColor: 'var(--line)' }}
            >
              <button
                onClick={onNewChat}
                className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  background: 'var(--accent)',
                  color: 'white',
                }}
              >
                <Plus className="h-4 w-4" />
                New Conversation
              </button>
            </div>
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  )
}

export default ConversationSidebar
