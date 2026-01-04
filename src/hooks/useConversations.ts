import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useCallback, useMemo } from 'react'
import { useConversationSidebar, useSherpaStore } from '../store'
import {
  groupConversationsByDate,
  filterConversationsBySearch,
  type ConversationSummary,
  type ConversationGroup,
} from '../utils/dateGroups'
import type { Id } from '../../convex/_generated/dataModel'

export interface UseConversationsOptions {
  walletAddress: string | null
  chain?: string
  includeArchived?: boolean
}

export interface UseConversationsReturn {
  // Data
  conversations: ConversationGroup[]
  allConversations: ConversationSummary[]
  isLoading: boolean
  isEmpty: boolean
  conversationCount: number

  // Current conversation
  currentConversationId: string | null

  // Actions
  selectConversation: (id: string) => void
  createConversation: () => Promise<string | null>
  renameConversation: (id: string, title: string) => Promise<void>
  archiveConversation: (id: string) => Promise<void>
  deleteConversation: (id: string) => Promise<void>

  // Search
  searchQuery: string
  setSearchQuery: (query: string) => void
}

export function useConversations(options: UseConversationsOptions): UseConversationsReturn {
  const { walletAddress, chain = 'ethereum', includeArchived = false } = options

  // Get sidebar state
  const { searchQuery, setSidebarSearchQuery } = useConversationSidebar()

  // Get current conversation ID and actions from store
  const conversationId = useSherpaStore((state) => state.conversationId)
  const setConversationId = useSherpaStore((state) => state.setConversationId)
  const startNewChat = useSherpaStore((state) => state.startNewChat)

  // Convex query for conversation list
  const rawConversations = useQuery(
    api.conversations.listByWalletAddress,
    walletAddress ? { address: walletAddress, chain, includeArchived } : 'skip'
  )

  // Convex mutations
  const updateTitleMutation = useMutation(api.conversations.updateTitle)
  const archiveMutation = useMutation(api.conversations.archive)
  const removeMutation = useMutation(api.conversations.remove)

  // Transform to ConversationSummary array
  const allConversations: ConversationSummary[] = useMemo(() => {
    if (!rawConversations) return []
    return rawConversations.map((conv) => ({
      _id: conv._id,
      title: conv.title,
      archived: conv.archived,
      totalTokens: conv.totalTokens,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
    }))
  }, [rawConversations])

  // Group by date
  const groupedConversations = useMemo(
    () => groupConversationsByDate(allConversations),
    [allConversations]
  )

  // Filter by search
  const filteredConversations = useMemo(
    () => filterConversationsBySearch(groupedConversations, searchQuery),
    [groupedConversations, searchQuery]
  )

  // Select a conversation
  const selectConversation = useCallback(
    (id: string) => {
      setConversationId(id)
      // Messages will be loaded by the chat controller when conversationId changes
    },
    [setConversationId]
  )

  // Create a new conversation
  const createConversation = useCallback(async (): Promise<string | null> => {
    // Just start a new chat - conversation will be created when first message is sent
    startNewChat()
    return null
  }, [startNewChat])

  // Rename a conversation
  const renameConversation = useCallback(
    async (id: string, title: string) => {
      await updateTitleMutation({
        conversationId: id as Id<'conversations'>,
        title,
      })
    },
    [updateTitleMutation]
  )

  // Archive a conversation
  const archiveConversation = useCallback(
    async (id: string) => {
      await archiveMutation({
        conversationId: id as Id<'conversations'>,
      })

      // If archiving current conversation, start a new one
      if (conversationId === id) {
        startNewChat()
      }
    },
    [archiveMutation, conversationId, startNewChat]
  )

  // Delete a conversation
  const deleteConversation = useCallback(
    async (id: string) => {
      await removeMutation({
        conversationId: id as Id<'conversations'>,
      })

      // If deleting current conversation, start a new one
      if (conversationId === id) {
        startNewChat()
      }
    },
    [removeMutation, conversationId, startNewChat]
  )

  return {
    // Data
    conversations: filteredConversations,
    allConversations,
    isLoading: rawConversations === undefined,
    isEmpty: allConversations.length === 0,
    conversationCount: allConversations.length,

    // Current
    currentConversationId: conversationId,

    // Actions
    selectConversation,
    createConversation,
    renameConversation,
    archiveConversation,
    deleteConversation,

    // Search
    searchQuery,
    setSearchQuery: setSidebarSearchQuery,
  }
}
