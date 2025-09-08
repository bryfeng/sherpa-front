import { useEffect, useRef, useState } from 'react'

export function ChatInput({ onSend, placeholder }: { onSend: (text: string) => void; placeholder: string }) {
  const [text, setText] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!ref.current) return
    ref.current.style.height = '0px'
    ref.current.style.height = ref.current.scrollHeight + 'px'
  }, [text])

  const send = () => {
    const t = text.trim()
    if (!t) return
    onSend(t)
    setText('')
  }

  const onKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="border border-white/10 bg-white/5 backdrop-blur rounded-xl p-2 flex items-end gap-2">
      <textarea
        ref={ref}
        value={text}
        rows={1}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="flex-1 resize-none outline-none text-sm p-2 bg-transparent placeholder:text-slate-400 text-slate-100"
      />
      <button onClick={send} className="rounded-full bg-gradient-to-br from-primary-500 to-primary-600 text-white px-4 py-2 text-sm shadow hover:opacity-95">
        Send
      </button>
    </div>
  )
}
