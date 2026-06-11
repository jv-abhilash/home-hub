import { useState } from 'react'
import { useAppStore } from '../../store/index'
import { useLLM } from '../../hooks/useLLM'
import { X, Send } from 'lucide-react'

export default function ChatPanel() {
  const { chatOpen, setChatOpen, activeModule } = useAppStore()
  const { messages, loading, send } = useLLM(activeModule)
  const [input, setInput] = useState('')

  if (!chatOpen) return null

  async function handleSend() {
    if (!input.trim()) return
    const msg = input
    setInput('')
    await send(msg)
  }

  return (
    <div className="w-80 border-l border-border flex flex-col shrink-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="font-medium text-sm">AI assistant</span>
        <button onClick={() => setChatOpen(false)}>
          <X size={16} className="text-muted-foreground" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground text-center mt-8">
            Ask anything about your {activeModule} data
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`text-sm px-3 py-2 rounded-lg max-w-[90%]
            ${m.role === 'user'
              ? 'bg-primary text-primary-foreground self-end'
              : 'bg-muted self-start'}`}>
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="text-xs text-muted-foreground self-start px-3 py-2">
            Thinking...
          </div>
        )}
      </div>

      <div className="p-3 border-t border-border flex gap-2">
        <input
          className="flex-1 text-sm bg-muted rounded-lg px-3 py-2 outline-none"
          placeholder="Ask something..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
        />
        <button
          onClick={handleSend}
          className="p-2 rounded-lg bg-primary text-primary-foreground"
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  )
}
