import type { PersonaId } from '../../App'

export function MessageBubble({ role, content }: { role: 'user' | 'assistant'; content: string; persona: PersonaId }) {
  const isUser = role === 'user'

  return (
    <div className={`group flex ${isUser ? 'justify-end' : 'justify-start'} w-full`}>
      <div className="max-w-[72%]">
        <div
          className={`relative p-4 rounded-2xl shadow-sm border ${
            isUser ? 'bg-primary-600 text-white border-primary-500 rounded-br-sm' : 'bg-white/5 text-slate-100 border-white/10 rounded-bl-sm'
          }`}
        >
          <div className="whitespace-pre-wrap leading-relaxed text-sm">{content}</div>
        </div>
      </div>
    </div>
  )
}
