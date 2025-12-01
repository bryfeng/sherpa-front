// TODO: Workstream 1 — Shell Split (Monolith → Feature Slices)

import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Bot, ExternalLink, Send, Star, User, X, BarChart3, Pin } from 'lucide-react'

import type { AgentAction, AgentMessage } from '../../types/defi-ui'
import { Badge, Button, Textarea } from '../ui/primitives'

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

    const bubbleClasses = isUser
      ? 'bg-[var(--accent)] text-[var(--text-inverse)]'
      : 'bg-[var(--surface)] border border-[var(--line)] text-[var(--text)]'

    const typingColor = isUser ? 'var(--text-inverse)' : 'var(--text-muted)'

    return (
      <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
        {!isUser && (
          <div className="h-8 w-8 rounded-full bg-[var(--surface-2)] border border-[var(--line)] flex items-center justify-center">
            <Bot className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
          </div>
        )}
        <div className={`max-w-[72%] rounded-2xl p-4 shadow-sm ${bubbleClasses}`}>
          {m.typing ? (
            <div className="text-sm flex items-center gap-2" style={{ color: typingColor }}>
              <span>Thinking</span>
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
            <div className="mt-3 flex flex-wrap gap-[var(--s1)]" role="group" aria-label="Assistant suggestions">
              {actions.map((action, index) => (
                <Button
                  key={action.id}
                  ref={(el) => {
                    actionRefs.current[index] = el
                  }}
                  size="sm"
                  variant={isUser ? 'secondary' : 'default'}
                  onClick={() => onAction(action)}
                  onKeyDown={(event) => handleActionKeyDown(event, index)}
                  className="rounded-full"
                >
                  {action.label}
                </Button>
              ))}
            </div>
          )}
          {m.sources && m.sources.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
              <span>Sources:</span>
              {m.sources.map((source: any, index: number) => (
                <SourceBadge key={index} src={source} />
              ))}
            </div>
          )}
        </div>
        {isUser && (
          <div className="h-8 w-8 rounded-full bg-[var(--surface-2)] border border-[var(--line)] flex items-center justify-center">
            <User className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
          </div>
        )}
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

export function ChatSurface({
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
  const canSend = inputValue.trim().length > 0

  const handleSend = () => {
    if (!canSend) return
    onSend()
  }

  return (
    <div className="flex h-full flex-col">
      <div
        ref={containerRef}
        className="flex-1 space-y-4 overflow-y-auto px-4 pt-4 pb-6"
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
      <div className="border-t border-[var(--line)] bg-[var(--bg-elev)]/80 px-4 py-[var(--s2)]">
        <div className="space-y-[var(--s2)]">
          <div
            className="rounded-2xl border bg-[var(--bg)]/80 p-[var(--s2)] shadow-inner"
            style={{ borderColor: 'var(--line)' }}
          >
            <div className="flex flex-col gap-[var(--s1)] sm:flex-row sm:items-end">
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
                placeholder="Ask about a token, protocol, or action…"
                aria-label="Chat message"
                className="flex-1 min-h-[48px]"
              />
              <Button onClick={handleSend} size="md" disabled={!canSend}>
                <Send className="mr-2 h-4 w-4" />Send
              </Button>
            </div>
            <div className="mt-[var(--s1)] flex flex-wrap items-center gap-[var(--s1)]">
              <Button size="sm" variant="outline" onClick={onOpenWorkspace}>
                <BarChart3 className="mr-1 h-3.5 w-3.5" />Open workspace
              </Button>
              <Button size="sm" variant="outline" onClick={onPinLatest} disabled={!canPinLatest}>
                <Pin className="mr-1 h-3.5 w-3.5" />Pin latest panel
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="rounded-full px-2 py-0.5">
                {proBadgeLabel}
              </Badge>
              <span>Adaptive CTAs are generated by the agent.</span>
            </div>
            {!pro && (
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => onProUpsell('cta')} className="rounded-full">
                  <Star className="mr-1 h-3 w-3" />Upgrade to Pro
                </Button>
              </div>
            )}
          </div>
          {showProInfo && !pro && (
            <div
              className="rounded-2xl border p-4 text-xs shadow-sm"
              style={{ borderColor: 'rgba(90,164,255,.3)', background: 'rgba(90,164,255,.14)', color: 'var(--text)' }}
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
                      <Button size="sm" variant="secondary" onClick={onCopyToken} className="rounded-full px-3 py-1 text-[11px]">
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
