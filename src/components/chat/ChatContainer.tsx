import { useEffect, useMemo, useRef, useState } from 'react'
import { ChatInput } from './ChatInput'
import { MessageBubble } from './MessageBubble'
import type { PersonaId } from '../../App'
import type { ChatMessage } from '../../types/chat'
import { api } from '../../services/api'

export function ChatContainer({ persona, walletAddress }: { persona: PersonaId; walletAddress?: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = endRef.current as any
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isTyping])

  const placeholder = useMemo(() => {
    switch (persona) {
      case 'technical':
        return 'Ask for deep DeFi analysis…'
      case 'professional':
        return 'Ask for portfolio risk assessment…'
      case 'educational':
        return 'Ask to explain your holdings…'
      default:
        return 'Ask about your portfolio…'
    }
  }, [persona])

  const send = async (text: string) => {
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
      persona,
    }
    setMessages((prev) => [...prev, userMsg])
    setIsTyping(true)

    try {
      const payload = {
        messages: [{ role: 'user', content: text }],
        address: walletAddress,
        chain: 'ethereum',
      }
      const res = await api.chat(payload)
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: res.reply,
        timestamp: new Date().toISOString(),
        persona,
        panels: res.panels,
        sources: res.sources,
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch (e: any) {
      const errMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Sorry, I hit an error contacting the API. ${e?.message || ''}`,
        timestamp: new Date().toISOString(),
        persona,
      }
      setMessages((prev) => [...prev, errMsg])
    } finally {
      setIsTyping(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <span className={`inline-flex h-2.5 w-2.5 rounded-full ${persona === 'friendly' ? 'bg-emerald-500' : persona === 'technical' ? 'bg-violet-500' : persona === 'professional' ? 'bg-slate-500' : 'bg-amber-500'}`} />
          <span className="text-slate-200 capitalize">{persona}</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto space-y-3 p-4">
        {messages.length === 0 && (
          <div className="text-center text-sm text-slate-300/80 py-10">Start by asking about your portfolio performance.</div>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} role={m.role} content={m.content} persona={persona} />
        ))}
        {isTyping && (
          <div className="flex items-center gap-2 text-slate-300 text-sm">
            <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" />
            <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:120ms]" />
            <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:240ms]" />
          </div>
        )}
        <div ref={endRef} />
      </div>
      <div className="p-3 border-t border-white/10 bg-white/5 rounded-b-2xl">
        <ChatInput onSend={send} placeholder={placeholder} />
      </div>
    </div>
  )
}
