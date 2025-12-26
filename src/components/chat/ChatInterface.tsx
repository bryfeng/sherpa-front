/**
 * CHAT INTERFACE - Redesigned
 *
 * A premium, distinctive chat interface for Sherpa.
 * Features:
 * - Persona-aware styling
 * - Smooth animations
 * - Rich markdown rendering
 * - Contextual quick actions
 */

import React, { memo, useEffect, useState, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Send,
  Bot,
  User,
  ExternalLink,
  Sparkles,
  ChartBar,
  Pin,
  ArrowRight,
  Zap,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import type { AgentAction, AgentMessage } from '../../types/defi-ui'
import type { PersonaId } from '../../store'
import '../../styles/design-system.css'

// ============================================
// PERSONA CONFIGURATION
// ============================================

const personaConfig: Record<PersonaId, {
  name: string
  color: string
  bgColor: string
  icon: string
  gradient: string
}> = {
  friendly: {
    name: 'Friendly',
    color: '#34d399',
    bgColor: 'rgba(52, 211, 153, 0.12)',
    icon: '',
    gradient: 'linear-gradient(135deg, #34d399, #10b981)',
  },
  technical: {
    name: 'Technical',
    color: '#a78bfa',
    bgColor: 'rgba(167, 139, 250, 0.12)',
    icon: '',
    gradient: 'linear-gradient(135deg, #a78bfa, #8b5cf6)',
  },
  professional: {
    name: 'Professional',
    color: '#60a5fa',
    bgColor: 'rgba(96, 165, 250, 0.12)',
    icon: '',
    gradient: 'linear-gradient(135deg, #60a5fa, #3b82f6)',
  },
  educational: {
    name: 'Educational',
    color: '#fbbf24',
    bgColor: 'rgba(251, 191, 36, 0.12)',
    icon: '',
    gradient: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
  },
}

// ============================================
// TYPING INDICATOR
// ============================================

function TypingIndicator({ persona }: { persona: PersonaId }) {
  const config = personaConfig[persona]

  return (
    <div className="flex items-center gap-2">
      <span
        className="text-sm font-medium"
        style={{ color: 'var(--text-muted)' }}
      >
        Thinking
      </span>
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: config.color }}
            animate={{
              scale: [0.8, 1, 0.8],
              opacity: [0.4, 1, 0.4],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.15,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
    </div>
  )
}

// ============================================
// MARKDOWN RENDERER
// ============================================

function MarkdownContent({ text }: { text: string }) {
  const renderLine = (line: string, key: number) => {
    // Headers
    if (line.startsWith('### ')) {
      return (
        <h3
          key={key}
          className="font-display font-semibold text-base mt-4 mb-2"
          style={{ color: 'var(--text)' }}
        >
          {line.slice(4)}
        </h3>
      )
    }
    if (line.startsWith('## ')) {
      return (
        <h2
          key={key}
          className="font-display font-semibold text-lg mt-5 mb-2"
          style={{ color: 'var(--text)' }}
        >
          {line.slice(3)}
        </h2>
      )
    }
    if (line.startsWith('# ')) {
      return (
        <h1
          key={key}
          className="font-display font-bold text-xl mt-6 mb-3"
          style={{ color: 'var(--text)' }}
        >
          {line.slice(2)}
        </h1>
      )
    }

    // Empty line
    if (line.trim() === '') {
      return <div key={key} className="h-3" />
    }

    // Bold and inline code
    const formattedLine = line
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
      .replace(/`(.*?)`/g, '<code class="font-mono text-xs px-1.5 py-0.5 rounded" style="background: var(--surface-2)">$1</code>')

    return (
      <p
        key={key}
        className="text-sm leading-relaxed"
        style={{ color: 'var(--text)' }}
        dangerouslySetInnerHTML={{ __html: formattedLine }}
      />
    )
  }

  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let listBuffer: string[] = []

  const flushList = () => {
    if (listBuffer.length === 0) return
    elements.push(
      <ul key={`list-${elements.length}`} className="space-y-1.5 my-2 ml-4">
        {listBuffer.map((item, i) => (
          <li
            key={i}
            className="text-sm flex items-start gap-2"
            style={{ color: 'var(--text)' }}
          >
            <span
              className="mt-2 w-1 h-1 rounded-full flex-shrink-0"
              style={{ background: 'var(--accent)' }}
            />
            <span dangerouslySetInnerHTML={{
              __html: item
                .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
                .replace(/`(.*?)`/g, '<code class="font-mono text-xs px-1 py-0.5 rounded" style="background: var(--surface-2)">$1</code>')
            }} />
          </li>
        ))}
      </ul>
    )
    listBuffer = []
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.startsWith('- ')) {
      listBuffer.push(line.slice(2))
    } else {
      flushList()
      elements.push(renderLine(line, i))
    }
  }
  flushList()

  return <div className="space-y-1">{elements}</div>
}

// ============================================
// SOURCE BADGE
// ============================================

function SourceBadge({ source }: { source: any }) {
  const getSourceInfo = () => {
    if (typeof source === 'string') {
      const isUrl = source.startsWith('http')
      if (isUrl) {
        try {
          const url = new URL(source)
          return { label: url.hostname.replace(/^www\./, ''), href: source }
        } catch {
          return { label: source }
        }
      }
      return { label: source }
    }

    if (source && typeof source === 'object') {
      const href = source.url || source.href || source.link
      const label = source.title || source.name || source.id || source.label
      if (label) return { label, href }
      if (href) {
        try {
          const url = new URL(href)
          return { label: url.hostname.replace(/^www\./, ''), href }
        } catch {
          return { label: href, href }
        }
      }
    }

    return { label: 'source' }
  }

  const { label, href } = getSourceInfo()

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="sherpa-chip group"
        style={{
          background: 'var(--surface-2)',
          border: '1px solid var(--line)',
        }}
      >
        <span className="truncate max-w-[120px]">{label}</span>
        <ExternalLink
          className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity"
        />
      </a>
    )
  }

  return (
    <span
      className="sherpa-badge sherpa-badge--default"
    >
      {label}
    </span>
  )
}

// ============================================
// ACTION BUTTON
// ============================================

interface ActionButtonProps {
  action: AgentAction
  onClick: () => void
  isUserMessage?: boolean
}

function ActionButton({ action, onClick, isUserMessage }: ActionButtonProps) {
  const getIcon = () => {
    switch (action.type) {
      case 'show_panel':
        return <ChartBar className="w-3.5 h-3.5" />
      case 'simulate':
        return <Zap className="w-3.5 h-3.5" />
      case 'swap':
        return <ArrowRight className="w-3.5 h-3.5" />
      case 'subscribe':
        return <Sparkles className="w-3.5 h-3.5" />
      default:
        return null
    }
  }

  return (
    <motion.button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
      style={{
        background: isUserMessage
          ? 'rgba(255, 255, 255, 0.15)'
          : 'var(--accent-muted)',
        color: isUserMessage ? 'var(--text-inverse)' : 'var(--accent)',
        border: isUserMessage
          ? '1px solid rgba(255, 255, 255, 0.2)'
          : '1px solid transparent',
      }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {getIcon()}
      <span>{action.label}</span>
    </motion.button>
  )
}

// ============================================
// MESSAGE BUBBLE
// ============================================

interface MessageBubbleProps {
  message: AgentMessage
  persona: PersonaId
  onAction: (action: AgentAction) => void
  prefersReducedMotion?: boolean
}

const MessageBubble = memo(function MessageBubble({
  message,
  persona,
  onAction,
  prefersReducedMotion,
}: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const config = personaConfig[persona]
  const actions = message.actions || []
  const sources = message.sources || []

  return (
    <motion.div
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
      initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Avatar */}
      <div
        className="sherpa-avatar flex-shrink-0"
        style={isUser ? {
          background: 'var(--accent)',
        } : {
          background: config.bgColor,
          border: '1px solid var(--line)',
        }}
      >
        {isUser ? (
          <User className="w-4 h-4" style={{ color: 'var(--text-inverse)' }} />
        ) : (
          <Bot className="w-4 h-4" style={{ color: config.color }} />
        )}
      </div>

      {/* Message content */}
      <div
        className="max-w-[75%] rounded-xl px-4 py-3"
        style={{
          background: isUser ? 'var(--accent)' : 'var(--surface)',
          color: isUser ? 'var(--text-inverse)' : 'var(--text)',
          border: isUser ? 'none' : '1px solid var(--line)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {/* Typing indicator or content */}
        {message.typing ? (
          <TypingIndicator persona={persona} />
        ) : (
          <>
            {isUser ? (
              <p className="text-sm whitespace-pre-wrap">{message.text}</p>
            ) : (
              <MarkdownContent text={message.text} />
            )}
          </>
        )}

        {/* Action buttons */}
        {actions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {actions.map((action) => (
              <ActionButton
                key={action.id}
                action={action}
                onClick={() => onAction(action)}
                isUserMessage={isUser}
              />
            ))}
          </div>
        )}

        {/* Sources */}
        {sources.length > 0 && (
          <div
            className="mt-3 pt-2 flex flex-wrap items-center gap-2 text-xs border-t"
            style={{
              borderColor: isUser
                ? 'rgba(255, 255, 255, 0.15)'
                : 'var(--line)',
              color: isUser ? 'rgba(255, 255, 255, 0.7)' : 'var(--text-muted)',
            }}
          >
            <span>Sources:</span>
            {sources.map((source, i) => (
              <SourceBadge key={i} source={source} />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
})

// ============================================
// QUICK ACTION PILLS
// ============================================

interface QuickAction {
  id: string
  label: string
  icon: React.ReactNode
  prompt: string
}

const defaultQuickActions: QuickAction[] = [
  {
    id: 'portfolio',
    label: 'My Portfolio',
    icon: <Wallet className="w-3.5 h-3.5" />,
    prompt: 'Show my portfolio',
  },
  {
    id: 'trending',
    label: 'Trending',
    icon: <TrendingUp className="w-3.5 h-3.5" />,
    prompt: 'What are trending tokens right now?',
  },
  {
    id: 'top-coins',
    label: 'Top Coins',
    icon: <ChartBar className="w-3.5 h-3.5" />,
    prompt: 'Show me the top coins today',
  },
]

// ============================================
// CHAT INPUT
// ============================================

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  onQuickAction?: (prompt: string) => void
  disabled?: boolean
  placeholder?: string
  inputRef?: React.RefObject<HTMLTextAreaElement>
}

function ChatInput({
  value,
  onChange,
  onSend,
  onQuickAction,
  disabled,
  placeholder,
  inputRef,
}: ChatInputProps) {
  const canSend = value.trim().length > 0

  // Rotating placeholder
  const placeholders = [
    'Ask about a token, protocol, or action...',
    'Show me the ETH price chart',
    'What are trending tokens right now?',
    'Analyze my portfolio performance',
    'Compare gas fees across chains',
  ]

  const [placeholderIndex, setPlaceholderIndex] = useState(0)

  useEffect(() => {
    if (value.trim().length > 0) return
    const interval = setInterval(() => {
      setPlaceholderIndex((i) => (i + 1) % placeholders.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [value, placeholders.length])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (canSend) onSend()
    }
  }

  return (
    <div
      className="border-t"
      style={{
        borderColor: 'var(--line)',
        background: 'var(--bg-elevated)',
      }}
    >
      <div className="p-4 space-y-3">
        {/* Quick actions */}
        <div className="flex flex-wrap gap-2">
          {defaultQuickActions.map((action) => (
            <button
              key={action.id}
              onClick={() => onQuickAction?.(action.prompt)}
              className="sherpa-chip"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--line)',
              }}
            >
              {action.icon}
              <span>{action.label}</span>
            </button>
          ))}
        </div>

        {/* Input area */}
        <div
          className="rounded-xl p-3"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--line)',
          }}
        >
          <div className="flex items-end gap-3">
            <textarea
              ref={inputRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder || placeholders[placeholderIndex]}
              disabled={disabled}
              rows={1}
              className="flex-1 min-h-[52px] max-h-[200px] resize-none bg-transparent text-base outline-none"
              style={{
                color: 'var(--text)',
                fontFamily: 'var(--font-body)',
              }}
            />
            <motion.button
              onClick={onSend}
              disabled={!canSend || disabled}
              className="sherpa-btn sherpa-btn--primary flex-shrink-0"
              style={{
                opacity: canSend ? 1 : 0.4,
                cursor: canSend ? 'pointer' : 'not-allowed',
              }}
              whileHover={canSend ? { scale: 1.02 } : undefined}
              whileTap={canSend ? { scale: 0.98 } : undefined}
            >
              <Send className="w-4 h-4" />
              <span>Send</span>
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// MAIN CHAT INTERFACE
// ============================================

export interface ChatInterfaceProps {
  messages: AgentMessage[]
  persona: PersonaId
  inputValue: string
  isTyping: boolean
  onInputChange: (value: string) => void
  onSend: () => void
  onAction: (action: AgentAction) => void
  onQuickAction?: (prompt: string) => void
  scrollRef?: React.RefObject<HTMLDivElement>
  inputRef?: React.RefObject<HTMLTextAreaElement>
  prefersReducedMotion?: boolean
  ariaAnnouncement?: string
}

export function ChatInterface({
  messages,
  persona,
  inputValue,
  isTyping,
  onInputChange,
  onSend,
  onAction,
  onQuickAction,
  scrollRef,
  inputRef,
  prefersReducedMotion,
  ariaAnnouncement,
}: ChatInterfaceProps) {
  return (
    <div
      className="flex flex-col h-full"
      data-persona={persona}
    >
      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-4"
        role="log"
        aria-live="polite"
        aria-busy={isTyping}
      >
        <AnimatePresence mode="popLayout">
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              persona={persona}
              onAction={onAction}
              prefersReducedMotion={prefersReducedMotion}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Accessibility announcement */}
      <div className="sr-only" aria-live="polite" aria-atomic="false">
        {ariaAnnouncement}
      </div>

      {/* Input area */}
      <ChatInput
        value={inputValue}
        onChange={onInputChange}
        onSend={onSend}
        onQuickAction={onQuickAction}
        disabled={isTyping}
        inputRef={inputRef}
      />
    </div>
  )
}

export default ChatInterface
