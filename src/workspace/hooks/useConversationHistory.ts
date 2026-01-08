/**
 * Conversation History Hook
 *
 * Manages fetching and caching conversation history for a wallet address.
 */

import { useCallback, useEffect, useState } from 'react'
import { api } from '../../services/api'
import type { WorkspaceHookResult, WorkspaceRequestStatus } from '../types'

// ============================================
// Types
// ============================================

export interface ConversationSummary {
  conversationId: string
  convexId?: string | null
  title: string | null
  lastActivity: Date
  lastActivityFormatted: string
  messageCount: number
  archived: boolean
}

export interface ConversationMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  timestampFormatted: string
  metadata?: Record<string, any>
  tokens?: number | null
}

export interface ConversationDetail {
  conversationId: string
  ownerAddress?: string | null
  title: string | null
  archived: boolean
  createdAt: Date
  lastActivity: Date
  totalTokens: number
  messageCount: number
  messages: ConversationMessage[]
}

export interface ConversationsViewModel {
  conversations: ConversationSummary[]
  totalCount: number
  hasConversations: boolean
}

// ============================================
// Formatters
// ============================================

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function formatMessageTime(date: Date): string {
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()

  if (isToday) {
    return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  }

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function transformConversation(raw: any): ConversationSummary {
  const lastActivity = new Date(raw.last_activity)
  return {
    conversationId: raw.conversation_id,
    convexId: raw.convex_id,
    title: raw.title || null,
    lastActivity,
    lastActivityFormatted: formatRelativeTime(lastActivity),
    messageCount: raw.message_count || 0,
    archived: raw.archived || false,
  }
}

function transformConversationDetail(raw: any): ConversationDetail {
  return {
    conversationId: raw.conversation_id,
    ownerAddress: raw.owner_address,
    title: raw.title || null,
    archived: raw.archived || false,
    createdAt: new Date(raw.created_at),
    lastActivity: new Date(raw.last_activity),
    totalTokens: raw.total_tokens || 0,
    messageCount: raw.message_count || 0,
    messages: (raw.messages || []).map((m: any) => {
      const timestamp = new Date(m.timestamp)
      return {
        id: m.id,
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
        timestamp,
        timestampFormatted: formatMessageTime(timestamp),
        metadata: m.metadata,
        tokens: m.tokens,
      }
    }),
  }
}

// ============================================
// useConversations Hook
// ============================================

interface UseConversationsOptions {
  walletAddress?: string
  auto?: boolean
  includeArchived?: boolean
}

export function useConversations(
  options: UseConversationsOptions = {}
): WorkspaceHookResult<ConversationsViewModel> {
  const { walletAddress, auto = true, includeArchived = false } = options

  const [data, setData] = useState<ConversationsViewModel | null>(null)
  const [status, setStatus] = useState<WorkspaceRequestStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [isFetching, setIsFetching] = useState(false)

  const refresh = useCallback(async () => {
    if (!walletAddress) {
      setData(null)
      setStatus('idle')
      return
    }

    setIsFetching(true)
    if (!data) setStatus('loading')

    try {
      const raw = await api.listConversations(walletAddress)
      const conversations = raw
        .map(transformConversation)
        .filter((c) => includeArchived || !c.archived)
        .sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime())

      setData({
        conversations,
        totalCount: conversations.length,
        hasConversations: conversations.length > 0,
      })
      setStatus('success')
      setError(null)
    } catch (err: any) {
      setError(err?.message || 'Failed to load conversations')
      setStatus('error')
    } finally {
      setIsFetching(false)
    }
  }, [walletAddress, includeArchived, data])

  const reset = useCallback(() => {
    setData(null)
    setStatus('idle')
    setError(null)
  }, [])

  // Auto-fetch on mount/address change
  useEffect(() => {
    if (auto && walletAddress) {
      refresh()
    } else if (!walletAddress) {
      reset()
    }
  }, [walletAddress, auto]) // eslint-disable-line react-hooks/exhaustive-deps

  return { data, status, error, isFetching, refresh, reset }
}

// ============================================
// useConversation Hook (Single conversation with messages)
// ============================================

interface UseConversationOptions {
  conversationId?: string
  auto?: boolean
}

export function useConversation(
  options: UseConversationOptions = {}
): WorkspaceHookResult<ConversationDetail> {
  const { conversationId, auto = true } = options

  const [data, setData] = useState<ConversationDetail | null>(null)
  const [status, setStatus] = useState<WorkspaceRequestStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [isFetching, setIsFetching] = useState(false)

  const refresh = useCallback(async () => {
    if (!conversationId) {
      setData(null)
      setStatus('idle')
      return
    }

    setIsFetching(true)
    if (!data) setStatus('loading')

    try {
      const raw = await api.getConversation(conversationId)
      setData(transformConversationDetail(raw))
      setStatus('success')
      setError(null)
    } catch (err: any) {
      setError(err?.message || 'Failed to load conversation')
      setStatus('error')
    } finally {
      setIsFetching(false)
    }
  }, [conversationId, data])

  const reset = useCallback(() => {
    setData(null)
    setStatus('idle')
    setError(null)
  }, [])

  // Auto-fetch on mount/id change
  useEffect(() => {
    if (auto && conversationId) {
      refresh()
    } else if (!conversationId) {
      reset()
    }
  }, [conversationId, auto]) // eslint-disable-line react-hooks/exhaustive-deps

  return { data, status, error, isFetching, refresh, reset }
}

// ============================================
// useConversationMutations Hook
// ============================================

export function useConversationMutations() {
  const [isLoading, setIsLoading] = useState(false)

  const createConversation = useCallback(
    async (address: string, title?: string): Promise<string | null> => {
      setIsLoading(true)
      try {
        const result = await api.createConversation(address, title)
        return result.conversation_id
      } catch (err) {
        console.error('Failed to create conversation:', err)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  const updateTitle = useCallback(
    async (conversationId: string, title: string): Promise<boolean> => {
      setIsLoading(true)
      try {
        await api.updateConversation(conversationId, { title })
        return true
      } catch (err) {
        console.error('Failed to update conversation title:', err)
        return false
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  const archiveConversation = useCallback(
    async (conversationId: string): Promise<boolean> => {
      setIsLoading(true)
      try {
        await api.updateConversation(conversationId, { archived: true })
        return true
      } catch (err) {
        console.error('Failed to archive conversation:', err)
        return false
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  const unarchiveConversation = useCallback(
    async (conversationId: string): Promise<boolean> => {
      setIsLoading(true)
      try {
        await api.updateConversation(conversationId, { archived: false })
        return true
      } catch (err) {
        console.error('Failed to unarchive conversation:', err)
        return false
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  return {
    isLoading,
    createConversation,
    updateTitle,
    archiveConversation,
    unarchiveConversation,
  }
}
