/**
 * CHAT ENGINE HOOK
 *
 * Focused hook for managing chat conversations and AI interactions.
 * Extracted from the monolithic useDeFiChatController.
 */

import { useCallback, useRef, useEffect } from 'react'
import { useReducedMotion } from 'framer-motion'
import { useSherpaStore } from '../store'
import { api } from '../services/api'
import { transformBackendPanels } from '../services/panels'
import type { AgentMessage, InlineComponent, InlineComponentKind, InlineComponentVariant } from '../types/defi-ui'
import type { Widget } from '../types/widgets'

// Map backend panel kinds to inline component kinds
function panelKindToComponentKind(panelKind: string): InlineComponentKind {
  const mapping: Record<string, InlineComponentKind> = {
    'portfolio': 'portfolio-card',
    'chart': 'price-chart',
    'prices': 'token-list',
    'trending': 'token-list',
    'swap': 'swap-form',
    'table': 'token-list',
    'card': 'action-card',
    'prediction': 'action-card',
  }
  return mapping[panelKind] || 'action-card'
}

// Get appropriate variant for component kind
function getVariantForKind(kind: string): InlineComponentVariant {
  if (kind === 'swap' || kind === 'chart') return 'expanded'
  if (kind === 'prices' || kind === 'trending' || kind === 'table') return 'standard'
  return 'standard'
}

// Convert backend panels to inline components
function panelsToInlineComponents(panels: any[]): InlineComponent[] {
  return panels.map((panel) => ({
    id: `comp_${panel.id || Math.random().toString(36).slice(2, 9)}`,
    kind: panelKindToComponentKind(panel.kind),
    payload: panel.payload ?? {},
    variant: getVariantForKind(panel.kind),
    title: panel.title,
    createdAt: Date.now(),
  }))
}

// Generate unique IDs
function uid(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`
}

// Storage key for conversation persistence
function getStorageKey(address?: string | null) {
  return address ? `sherpa.conversation_id:${address.toLowerCase()}` : 'sherpa.conversation_id:guest'
}

export interface UseChatEngineOptions {
  walletAddress?: string
  llmModel?: string
  onNewWidgets?: (widgets: Widget[]) => void
  onPortfolioRequested?: () => void
}

export function useChatEngine(options: UseChatEngineOptions) {
  const {
    walletAddress,
    llmModel,
    onNewWidgets,
    onPortfolioRequested,
  } = options

  // Store state
  const {
    messages,
    conversationId,
    isTyping,
    inputValue,
    addMessage,
    updateMessage,
    removeMessage,
    setIsTyping,
    setInputValue,
    setConversationId,
    startNewChat: resetChat,
  } = useSherpaStore((state) => ({
    messages: state.messages,
    conversationId: state.conversationId,
    isTyping: state.isTyping,
    inputValue: state.inputValue,
    addMessage: state.addMessage,
    updateMessage: state.updateMessage,
    removeMessage: state.removeMessage,
    setIsTyping: state.setIsTyping,
    setInputValue: state.setInputValue,
    setConversationId: state.setConversationId,
    startNewChat: state.startNewChat,
  }))
  const streamingEnabled = useSherpaStore((state) => state.streamingEnabled)

  const prefersReducedMotion = useReducedMotion() ?? false
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const isMountedRef = useRef(true)
  const lastAnnouncedIdRef = useRef<string | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Load conversation ID from storage on wallet change
  useEffect(() => {
    try {
      const key = getStorageKey(walletAddress)
      const stored = localStorage.getItem(key)
      setConversationId(stored || null)
    } catch {
      setConversationId(null)
    }
  }, [walletAddress, setConversationId])

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      const el = scrollRef.current
      if (!el) return
      el.scrollTo({
        top: el.scrollHeight,
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
      })
    })
  }, [prefersReducedMotion])

  // Focus input
  const focusInput = useCallback(() => {
    const el = inputRef.current
    if (!el) return
    el.focus()
    el.setSelectionRange(el.value.length, el.value.length)
  }, [])

  // Insert text into input
  const insertPrompt = useCallback((text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    const currentValue = useSherpaStore.getState().inputValue
    const newValue = !currentValue.trim()
      ? trimmed
      : currentValue.endsWith('\n')
        ? `${currentValue}${trimmed}`
        : `${currentValue}\n${trimmed}`
    setInputValue(newValue)
    requestAnimationFrame(focusInput)
  }, [focusInput, setInputValue])

  // Send a message with streaming response
  const sendMessageStream = useCallback(async (text: string) => {
    const question = text.trim()
    if (!question) return null

    const assistantMsgId = uid('msg')
    let streamedText = ''

    // Add user message
    addMessage({
      id: uid('msg'),
      role: 'user',
      text: question,
    })

    // Add assistant message with streaming flag
    addMessage({
      id: assistantMsgId,
      role: 'assistant',
      text: '',
      streaming: true,
    })

    setIsTyping(true)

    try {
      const payload = {
        messages: [{ role: 'user', content: question }],
        address: walletAddress,
        chain: 'ethereum',
        conversation_id: conversationId ?? undefined,
        llm_model: llmModel,
      }

      // Stream the response
      const response = await api.chatStream(payload, (delta) => {
        if (!isMountedRef.current) return
        streamedText += delta
        updateMessage(assistantMsgId, { text: streamedText })
        scrollToBottom()
      })

      if (!isMountedRef.current) return null

      // Update conversation ID if changed
      if (response?.conversation_id && response.conversation_id !== conversationId) {
        setConversationId(response.conversation_id)
        try {
          localStorage.setItem(getStorageKey(walletAddress), response.conversation_id)
        } catch {
          // Ignore storage errors
        }
      }

      // Process panels into inline components
      const newPanels = response ? transformBackendPanels(response.panels) : []
      const portfolioRequested = newPanels.some((p) => p.kind === 'portfolio')

      if (portfolioRequested && walletAddress) {
        onPortfolioRequested?.()
      }

      // Convert panels to inline components (embedded in message)
      const inlineComponents = panelsToInlineComponents(newPanels)

      // Also send to widgets callback for backwards compatibility
      if (onNewWidgets && newPanels.length > 0) {
        const nonPortfolioWidgets = newPanels
          .filter((p) => p.kind !== 'portfolio')
          .map((panel): Widget => ({
            id: panel.id,
            kind: panel.kind,
            title: panel.title,
            payload: panel.payload ?? {},
            sources: [],
            density: panel.kind === 'chart' ? 'full' : 'rail',
          }))
        if (nonPortfolioWidgets.length > 0) {
          onNewWidgets(nonPortfolioWidgets)
        }
      }

      // Finalize the message - remove streaming flag and add components/sources
      updateMessage(assistantMsgId, {
        text: streamedText || response?.reply || 'Done.',
        streaming: false,
        components: inlineComponents.length > 0 ? inlineComponents : undefined,
        sources: response?.sources,
      })

      scrollToBottom()
      return response
    } catch (error: any) {
      if (!isMountedRef.current) return null

      // Update the message to show error
      updateMessage(assistantMsgId, {
        text: `Sorry, I encountered an error. ${error?.message || ''}`,
        streaming: false,
      })

      scrollToBottom()
      throw error
    } finally {
      setIsTyping(false)
    }
  }, [
    walletAddress,
    llmModel,
    conversationId,
    addMessage,
    updateMessage,
    setIsTyping,
    setConversationId,
    onNewWidgets,
    onPortfolioRequested,
    scrollToBottom,
  ])

  // Send a message to the AI (non-streaming fallback)
  const sendMessage = useCallback(async (text: string) => {
    const question = text.trim()
    if (!question) return null

    const typingId = uid('msg')

    // Add user message and typing indicator
    addMessage({
      id: uid('msg'),
      role: 'user',
      text: question,
    })

    addMessage({
      id: typingId,
      role: 'assistant',
      text: '',
      typing: true,
    })

    setIsTyping(true)

    try {
      const payload = {
        messages: [{ role: 'user', content: question }],
        address: walletAddress,
        chain: 'ethereum',
        conversation_id: conversationId ?? undefined,
        llm_model: llmModel,
      }

      const response = await api.chat(payload)

      if (!isMountedRef.current) return null

      // Update conversation ID if changed
      if (response?.conversation_id && response.conversation_id !== conversationId) {
        setConversationId(response.conversation_id)
        try {
          localStorage.setItem(getStorageKey(walletAddress), response.conversation_id)
        } catch {
          // Ignore storage errors
        }
      }

      // Process panels into inline components
      const newPanels = transformBackendPanels(response.panels)
      const portfolioRequested = newPanels.some((p) => p.kind === 'portfolio')

      if (portfolioRequested && walletAddress) {
        onPortfolioRequested?.()
      }

      // Convert panels to inline components (embedded in message)
      const inlineComponents = panelsToInlineComponents(newPanels)

      // Also send to widgets callback for backwards compatibility (optional)
      if (onNewWidgets && newPanels.length > 0) {
        const nonPortfolioWidgets = newPanels
          .filter((p) => p.kind !== 'portfolio')
          .map((panel): Widget => ({
            id: panel.id,
            kind: panel.kind,
            title: panel.title,
            payload: panel.payload ?? {},
            sources: [],
            density: panel.kind === 'chart' ? 'full' : 'rail',
          }))
        if (nonPortfolioWidgets.length > 0) {
          onNewWidgets(nonPortfolioWidgets)
        }
      }

      // Remove typing indicator and add response with embedded components
      removeMessage(typingId)
      addMessage({
        id: uid('msg'),
        role: 'assistant',
        text: response.reply || 'Done.',
        components: inlineComponents.length > 0 ? inlineComponents : undefined,
        sources: response.sources,
      })

      scrollToBottom()
      return response
    } catch (error: any) {
      if (!isMountedRef.current) return null

      // Remove typing indicator and add error message
      removeMessage(typingId)
      addMessage({
        id: uid('msg'),
        role: 'assistant',
        text: `Sorry, I encountered an error. ${error?.message || ''}`,
      })

      scrollToBottom()
      throw error
    } finally {
      setIsTyping(false)
    }
  }, [
    walletAddress,
    llmModel,
    conversationId,
    addMessage,
    removeMessage,
    setIsTyping,
    setConversationId,
    onNewWidgets,
    onPortfolioRequested,
    scrollToBottom,
  ])

  // Send current input
  const send = useCallback(async () => {
    const text = inputValue.trim()
    if (!text) return
    setInputValue('')
    try {
      if (streamingEnabled) {
        await sendMessageStream(text)
      } else {
        await sendMessage(text)
      }
    } catch {
      // Error already handled in sendMessage
    }
  }, [inputValue, sendMessage, sendMessageStream, setInputValue, streamingEnabled])

  // Start new conversation
  const startNewChat = useCallback(async () => {
    try {
      if (walletAddress) {
        const response = await api.createConversation(walletAddress)
        const newId = response?.conversation_id
        if (newId) {
          setConversationId(newId)
          try {
            localStorage.setItem(getStorageKey(walletAddress), newId)
          } catch {
            // Ignore storage errors
          }
        }
      } else {
        setConversationId(null)
        try {
          localStorage.removeItem(getStorageKey(null))
        } catch {
          // Ignore storage errors
        }
      }
    } catch {
      setConversationId(null)
    }

    resetChat()
  }, [walletAddress, setConversationId, resetChat])

  return {
    // State
    messages,
    conversationId,
    isTyping,
    inputValue,
    prefersReducedMotion,

    // Refs
    scrollRef,
    inputRef,

    // Actions
    setInputValue,
    send,
    sendMessage,
    sendMessageStream,
    startNewChat,
    insertPrompt,
    scrollToBottom,
    focusInput,

    // Computed
    canSend: inputValue.trim().length > 0,
    conversationDisplay: conversationId ? `${conversationId.slice(0, 10)}...` : 'Draft session',
  }
}
