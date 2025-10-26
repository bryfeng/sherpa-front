// TODO: Workstream 1 — Shell Split (Monolith → Feature Slices)

import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Bot,
  ExternalLink,
  Send,
  Sparkles,
  Star,
  User,
  X,
} from 'lucide-react'

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
        className="inline-flex items-center gap-1 rounded-full border border-slate-300 px-2 py-0.5 hover:bg-slate-50 text-slate-700"
      >
        <span className="truncate max-w-[140px]">{label}</span>
        <ExternalLink className="h-3 w-3 shrink-0 text-slate-500" aria-hidden="true" />
      </a>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-300 px-2 py-0.5 text-slate-600">
      {label}
    </span>
  )
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
      elements.push(<h3 key={`h3-${elements.length}`} className="font-semibold text-slate-900 mt-2">{line.slice(4)}</h3>)
    } else if (line.startsWith('## ')) {
      elements.push(<h2 key={`h2-${elements.length}`} className="font-semibold text-slate-900 mt-3">{line.slice(3)}</h2>)
    } else if (line.startsWith('# ')) {
      elements.push(<h1 key={`h1-${elements.length}`} className="font-semibold text-slate-900 mt-4">{line.slice(2)}</h1>)
    } else if (line.length === 0) {
      elements.push(<div key={`sp-${elements.length}`} className="h-2" />)
    } else {
      elements.push(<p key={`p-${elements.length}`} className="text-slate-800" dangerouslySetInnerHTML={{ __html: applyInline(line) }} />)
    }
  }
  flushList()
  return <div className="space-y-1">{elements}</div>
}

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

  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="h-8 w-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
          <Bot className="h-4 w-4 text-slate-700" />
        </div>
      )}
      <div className={`max-w-[72%] rounded-2xl p-4 shadow-sm ${isUser ? 'bg-primary-600 text-white' : 'bg-white border border-slate-200 text-slate-800 sherpa-surface'}`}>
        {m.typing ? (
          <div className="text-sm text-slate-500 flex items-center gap-2">
            <span>Thinking</span>
            <span className="inline-flex gap-1">
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.2s]"></span>
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.1s]"></span>
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
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
          <div className="mt-2 text-xs text-slate-500 flex flex-wrap items-center gap-2">
            <span className="text-slate-600">Sources:</span>
            {m.sources.map((source: any, index: number) => (
              <SourceBadge key={index} src={source} />
            ))}
          </div>
        )}
      </div>
      {isUser && (
        <div className="h-8 w-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
          <User className="h-4 w-4 text-slate-700" />
        </div>
      )}
    </div>
  )
}

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
  proBadgeLabel: string
  pro: boolean
  showProInfo: boolean
  onDismissProInfo: () => void
  onProUpsell: (source: 'cta' | 'action') => void
  manualUnlockAvailable: boolean
  onManualUnlock: () => void
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
  proBadgeLabel,
  pro,
  showProInfo,
  onDismissProInfo,
  onProUpsell,
  manualUnlockAvailable,
  onManualUnlock,
  proRequirement,
  proTokenAddress,
  proContractDisplay,
  proExplorerUrl,
  copiedToken,
  onCopyToken,
}: ChatSurfaceProps) {
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
      <div className="border-t border-slate-200 bg-white/70 px-4 py-4">
        <div className="space-y-3">
          <div className="flex w-full items-center gap-2 rounded-2xl border border-slate-200 bg-white/80 p-2 shadow-inner">
            <Textarea
              ref={inputRef}
              value={inputValue}
              onChange={(event) => onInputChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  onSend()
                }
              }}
              placeholder="Ask about a token, protocol, or action…"
              aria-label="Chat message"
              className="min-h-[44px] flex-1 border-0 bg-transparent p-2 focus:border-0 focus:ring-0"
            />
            <Button onClick={onSend} className="h-10 rounded-xl px-4">
              <Send className="mr-2 h-4 w-4" />Send
            </Button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="rounded-full px-2 py-0.5">{proBadgeLabel}</Badge>
              <span>Adaptive CTAs are generated by the agent.</span>
            </div>
            {!pro && (
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => onProUpsell('cta')} className="rounded-full">
                  <Star className="mr-1 h-3 w-3" />Upgrade to Pro
                </Button>
                {manualUnlockAvailable && (
                  <Button size="sm" variant="secondary" onClick={onManualUnlock} className="rounded-full">
                    <Sparkles className="mr-1 h-3 w-3" />Dev Unlock
                  </Button>
                )}
              </div>
            )}
          </div>
          {showProInfo && !pro && (
            <div className="rounded-2xl border border-primary-200/80 bg-primary-50/80 p-4 text-xs text-primary-900 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="mt-[2px] rounded-full border border-primary-200 bg-white/60 p-1">
                  <Star className="h-3.5 w-3.5 text-primary-600" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-primary-900">Unlock Sherpa Pro</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-primary-900/80">{proRequirement}</p>
                    </div>
                    <button
                      onClick={onDismissProInfo}
                      className="rounded-full p-1 text-primary-700 hover:bg-primary-100"
                      aria-label="Dismiss Pro info"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  {proTokenAddress && (
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-primary-900">
                      <code className="rounded-lg border border-primary-200 bg-white/80 px-2 py-1 font-mono text-[11px] tracking-tight">
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
                          className="inline-flex items-center gap-1 rounded-full border border-primary-200 px-2 py-1 text-[11px] text-primary-800 hover:bg-primary-100"
                        >
                          View explorer
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-3 text-[11px] text-primary-900/70">
                <span className="font-medium text-primary-900">Pro perks:</span> deeper simulations, fee benchmarking, and guided DeFi workflows tailored to your wallet state.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
