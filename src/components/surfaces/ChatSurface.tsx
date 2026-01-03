// TODO: Workstream 1 — Shell Split (Monolith → Feature Slices)

import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Bot, ExternalLink, Send, Star, User, X, BarChart3, Pin } from 'lucide-react'

import type { AgentAction, AgentMessage } from '../../types/defi-ui'
import { Button, Textarea } from '../ui/primitives'
import { useToastContext } from '../../providers/ToastProvider'

function SourceBadge({ src }: { src: any }) {
  let label = ''
  let href: string | undefined
  let title: string | undefined

  if (typeof src === 'string') {
    href = src.startsWith('http') ? src : undefined
    if (href) {
      try {
        const url = new URL(src)
        label = url.hostname.replace(/^www\./, '')
        title = src
      } catch {
        label = src
      }
    } else {
      label = src
    }
  } else if (src && typeof src === 'object') {
    href = (src.url || src.href || src.link) as string | undefined
    title = (src.description || src.summary) as string | undefined
    const name = (src.title || src.name || src.id || src.label || href) as string | undefined
    if (name) label = String(name)
    else if (href) {
      try {
        const url = new URL(href)
        label = url.hostname.replace(/^www\./, '')
      } catch {
        label = href
      }
    } else {
      label = 'source'
    }
  }

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        title={title || `Open ${label}`}
        className="chip chip--accent"
      >
        <span className="truncate max-w-[140px]">{label}</span>
        <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
      </a>
    )
  }

  return <span className="chip">{label}</span>
}

function MarkdownRenderer({ text }: { text: string }) {
  const lines = text.split(/\n/)
  const elements: React.ReactNode[] = []
  let listBuffer: string[] = []

  function applyInline(value: string) {
    return value.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  }

  function flushList() {
    if (listBuffer.length === 0) return
    elements.push(
      <ul key={`ul-${elements.length}`} className="list-disc pl-5 space-y-1">
        {listBuffer.map((item, index) => (
          <li key={index} dangerouslySetInnerHTML={{ __html: applyInline(item) }} />
        ))}
      </ul>,
    )
    listBuffer = []
  }

  for (const raw of lines) {
    const line = raw.trimEnd()
    if (line.startsWith('- ')) {
      listBuffer.push(line.slice(2))
      continue
    }
    flushList()
    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={`h3-${elements.length}`} className="font-semibold mt-2" style={{ color: 'var(--text)' }}>
          {line.slice(4)}
        </h3>,
      )
    } else if (line.startsWith('## ')) {
      elements.push(
        <h2 key={`h2-${elements.length}`} className="font-semibold mt-3" style={{ color: 'var(--text)' }}>
          {line.slice(3)}
        </h2>,
      )
    } else if (line.startsWith('# ')) {
      elements.push(
        <h1 key={`h1-${elements.length}`} className="font-semibold mt-4" style={{ color: 'var(--text)' }}>
          {line.slice(2)}
        </h1>,
      )
    } else if (line.length === 0) {
      elements.push(<div key={`sp-${elements.length}`} className="h-2" />)
    } else {
      elements.push(
        <p
          key={`p-${elements.length}`}
          className="text-sm"
          style={{ color: 'var(--text)' }}
          dangerouslySetInnerHTML={{ __html: applyInline(line) }}
        />,
      )
    }
  }
  flushList()
  return <div className="space-y-1">{elements}</div>
}

const MessageBubble = React.memo(
  function MessageBubble({ m, onAction }: { m: AgentMessage; onAction: (a: AgentAction) => void }) {
    const isUser = m.role === 'user'
    const actions = m.actions || []
    const actionRefs = React.useRef<Array<HTMLButtonElement | null>>([])

    React.useEffect(() => {
      actionRefs.current = actionRefs.current.slice(0, actions.length)
    }, [actions.length])

    const focusAction = (index: number) => {
      if (!actions.length) return
      const normalized = (index + actions.length) % actions.length
      const el = actionRefs.current[normalized]
      el?.focus()
    }

    const handleActionKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          event.preventDefault()
          focusAction(index + 1)
          break
        case 'ArrowLeft':
        case 'ArrowUp':
          event.preventDefault()
          focusAction(index - 1)
          break
        case 'Home':
          event.preventDefault()
          focusAction(0)
          break
        case 'End':
          event.preventDefault()
          focusAction(actions.length - 1)
          break
        default:
          break
      }
    }

    const typingColor = isUser ? 'var(--text-inverse)' : 'var(--accent)'

    return (
      <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar - Flat design */}
        {isUser ? (
          <div
            className="h-8 w-8 flex-shrink-0 rounded-md flex items-center justify-center"
            style={{ background: 'var(--accent)' }}
          >
            <User className="h-4 w-4" style={{ color: 'var(--text-inverse)' }} />
          </div>
        ) : (
          <div
            className="h-8 w-8 flex-shrink-0 rounded-md flex items-center justify-center"
            style={{ background: 'var(--accent-muted)', border: '1px solid var(--line)' }}
          >
            <Bot className="h-4 w-4" style={{ color: 'var(--accent)' }} />
          </div>
        )}

        {/* Message bubble - Flat design */}
        <div
          className="max-w-[75%] rounded-lg px-4 py-3"
          style={{
            background: isUser ? 'var(--accent)' : 'var(--surface-2)',
            color: isUser ? 'var(--text-inverse)' : 'var(--text)',
            border: isUser ? 'none' : '1px solid var(--line)',
          }}
        >
          {m.typing ? (
            <div className="text-sm flex items-center gap-2" style={{ color: typingColor }}>
              <span style={{ color: isUser ? 'var(--text-inverse)' : 'var(--text-muted)' }}>Thinking</span>
              <span className="inline-flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:-0.2s]" style={{ background: typingColor }}></span>
                <span className="w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:-0.1s]" style={{ background: typingColor }}></span>
                <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: typingColor }}></span>
              </span>
            </div>
          ) : (
            <div className="text-sm leading-relaxed">
              {isUser ? <span className="whitespace-pre-wrap">{m.text}</span> : <MarkdownRenderer text={m.text} />}
            </div>
          )}
          {actions.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Assistant suggestions">
              {actions.map((action, index) => (
                <button
                  key={action.id}
                  ref={(el) => {
                    actionRefs.current[index] = el
                  }}
                  onClick={() => onAction(action)}
                  onKeyDown={(event) => handleActionKeyDown(event, index)}
                  className="rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
                  style={{
                    background: isUser ? 'rgba(255,255,255,0.15)' : 'var(--accent-muted)',
                    color: isUser ? 'var(--text-inverse)' : 'var(--accent)',
                    border: isUser ? '1px solid rgba(255,255,255,0.2)' : '1px solid transparent',
                  }}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
          {m.sources && m.sources.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs" style={{ color: isUser ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)' }}>
              <span>Sources:</span>
              {m.sources.map((source: any, index: number) => (
                <SourceBadge key={index} src={source} />
              ))}
            </div>
          )}
        </div>
      </div>
    )
  },
  (prev, next) => prev.m === next.m && prev.onAction === next.onAction,
)

export interface ChatSurfaceProps {
  containerRef: React.RefObject<HTMLDivElement>
  inputRef: React.RefObject<HTMLTextAreaElement>
  messages: AgentMessage[]
  onAction: (action: AgentAction) => void
  isAssistantTyping: boolean
  prefersReducedMotion: boolean
  ariaAnnouncement: string
  inputValue: string
  onInputChange: (value: string) => void
  onSend: () => void
  onOpenWorkspace: () => void
  onPinLatest: () => void
  canPinLatest: boolean
  proBadgeLabel: string
  pro: boolean
  showProInfo: boolean
  onDismissProInfo: () => void
  onProUpsell: (source: 'cta' | 'action') => void
  proRequirement: string
  proTokenAddress?: string | null
  proContractDisplay: string | null
  proExplorerUrl?: string | null
  copiedToken: boolean
  onCopyToken: () => void
}

function ChatSurfaceComponent({
  containerRef,
  inputRef,
  messages,
  onAction,
  isAssistantTyping,
  prefersReducedMotion,
  ariaAnnouncement,
  inputValue,
  onInputChange,
  onSend,
  onOpenWorkspace,
  onPinLatest,
  canPinLatest,
  proBadgeLabel,
  pro,
  showProInfo,
  onDismissProInfo,
  onProUpsell,
  proRequirement,
  proTokenAddress,
  proContractDisplay,
  proExplorerUrl,
  copiedToken,
  onCopyToken,
}: ChatSurfaceProps) {
  const { showToast } = useToastContext()
  const canSend = inputValue.trim().length > 0

  const placeholderExamples = [
    'Ask about a token, protocol, or action…',
    'Show me the ETH price chart',
    'What are trending tokens right now?',
    'Analyze my portfolio performance',
    'Compare gas fees across chains',
    'Explain how Uniswap works',
  ]

  const [placeholderIndex, setPlaceholderIndex] = React.useState(0)

  React.useEffect(() => {
    if (inputValue.trim().length > 0) return
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholderExamples.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [inputValue, placeholderExamples.length])

  const handleSend = () => {
    if (!canSend) return
    onSend()
  }

  const handleCopyWithToast = () => {
    onCopyToken()
    showToast('Contract address copied to clipboard', 'success')
  }

  return (
    <div className="flex h-full flex-col min-h-0 overflow-hidden">
      <div
        ref={containerRef}
        className="flex-1 space-y-4 overflow-y-auto px-4 pt-4 pb-6 min-h-0"
        role="log"
        aria-live="polite"
        aria-relevant="additions text"
        aria-busy={isAssistantTyping}
        tabIndex={0}
      >
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0, y: -6 }}
              transition={prefersReducedMotion ? { duration: 0 } : undefined}
            >
              <MessageBubble m={message} onAction={onAction} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <div className="sr-only" aria-live="polite" aria-atomic="false">
        {ariaAnnouncement}
      </div>
      <div
        className="border-t px-4 py-4 shrink-0"
        style={{ borderColor: 'var(--line)', background: 'var(--bg-elev)' }}
      >
        <div className="space-y-3">
          {/* Main input container - Flat design */}
          <div
            className="rounded-lg p-3"
            style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <Textarea
                ref={inputRef}
                value={inputValue}
                onChange={(event) => onInputChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    handleSend()
                  }
                }}
                placeholder={placeholderExamples[placeholderIndex]}
                aria-label="Chat message"
                className="flex-1 min-h-[52px] text-base"
                style={{ fontSize: '15px' }}
              />
              <button
                onClick={handleSend}
                disabled={!canSend}
                className="flex items-center justify-center gap-2 rounded-md px-4 py-2.5 font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: canSend ? 'var(--accent)' : 'var(--surface-2)',
                  color: canSend ? 'var(--text-inverse)' : 'var(--text-muted)',
                }}
              >
                <Send className="h-4 w-4" />
                <span>Send</span>
              </button>
            </div>
            {/* Quick actions row */}
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3" style={{ borderColor: 'var(--line)' }}>
              <button
                onClick={onOpenWorkspace}
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors"
                style={{ color: 'var(--text-muted)', background: 'var(--surface-2)', border: '1px solid var(--line)' }}
              >
                <BarChart3 className="h-3.5 w-3.5" />
                <span>Workspace</span>
              </button>
              <button
                onClick={onPinLatest}
                disabled={!canPinLatest}
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-40"
                style={{ color: 'var(--text-muted)', background: 'var(--surface-2)', border: '1px solid var(--line)' }}
                title="Pin latest content to artifacts panel"
              >
                <Pin className="h-3.5 w-3.5" />
                <span>Pin to Artifacts</span>
              </button>
            </div>
          </div>

          {/* Pro badge row - simplified */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-1">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {proBadgeLabel}
            </span>
            {!pro && (
              <button
                onClick={() => onProUpsell('cta')}
                className="flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors"
                style={{
                  color: 'var(--accent)',
                  background: 'var(--accent-muted)',
                }}
              >
                <Star className="h-3 w-3" />
                <span>Upgrade to Pro</span>
              </button>
            )}
          </div>
          {showProInfo && !pro && (
            <div
              className="rounded-lg border p-4 text-xs"
              style={{ borderColor: 'var(--line)', background: 'var(--accent-muted)', color: 'var(--text)' }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="mt-[2px] rounded-full border p-1"
                  style={{ borderColor: 'var(--accent)', background: 'rgba(90,164,255,.2)' }}
                >
                  <Star className="h-3.5 w-3.5" style={{ color: 'var(--accent)' }} />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                        Unlock Sherpa Pro
                      </p>
                      <p className="mt-1 text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                        {proRequirement}
                      </p>
                    </div>
                    <button
                      onClick={onDismissProInfo}
                      className="rounded-full p-1"
                      style={{ color: 'var(--accent)' }}
                      aria-label="Dismiss Pro info"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  {proTokenAddress && (
                    <div className="flex flex-wrap items-center gap-2 text-[11px]" style={{ color: 'var(--text)' }}>
                      <code className="rounded-lg border px-2 py-1 font-mono text-[11px] tracking-tight" style={{ borderColor: 'var(--accent)', background: 'rgba(90,164,255,.16)' }}>
                        {proContractDisplay}
                      </code>
                      <Button size="sm" variant="secondary" onClick={handleCopyWithToast} className="rounded-full px-3 py-1 text-[11px]">
                        {copiedToken ? 'Copied' : 'Copy contract'}
                      </Button>
                      {proExplorerUrl && (
                        <a
                          href={proExplorerUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="chip chip--accent"
                        >
                          View explorer
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-3 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                <span className="font-medium" style={{ color: 'var(--text)' }}>
                  Pro perks:
                </span>{' '}
                deeper simulations, fee benchmarking, and guided DeFi workflows tailored to your wallet state.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export const ChatSurface = React.memo(ChatSurfaceComponent)
ChatSurface.displayName = 'ChatSurface'
