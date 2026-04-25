'use client'

import { useState } from 'react'
import { Sparkles, Send, Dumbbell, Apple } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function AIClient() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Привет! Я твой ИИ-тренер и диетолог. Спроси меня про тренировки, питание, восстановление — всё что угодно!',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  async function sendMessage(text?: string) {
    const content = text ?? input.trim()
    if (!content || loading) return

    const newMessages: Message[] = [...messages, { role: 'user', content }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.content }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Ошибка. Попробуй ещё раз.' }])
    }

    setLoading(false)
  }

  const quickPrompts = [
    { icon: Dumbbell, text: 'Составь программу на 3 дня в неделю' },
    { icon: Apple, text: 'Что съесть после тренировки?' },
    { icon: Sparkles, text: 'Как быстро восстановиться?' },
  ]

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] max-w-lg mx-auto">
      <div className="flex items-center gap-3 px-4 py-4 border-b border-zinc-800">
        <div className="w-9 h-9 bg-purple-600 rounded-xl flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-white font-semibold">ИИ советник</p>
          <p className="text-zinc-500 text-xs">Тренер и диетолог</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-indigo-500 text-white rounded-br-sm'
                  : 'bg-zinc-900 text-zinc-100 border border-zinc-800 rounded-bl-sm'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        {messages.length === 1 && (
          <div className="flex flex-col gap-2 mt-2">
            {quickPrompts.map(({ icon: Icon, text }) => (
              <button
                key={text}
                onClick={() => sendMessage(text)}
                className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-left text-zinc-300 text-sm"
              >
                <Icon className="w-4 h-4 text-purple-400 flex-shrink-0" />
                {text}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 py-3 border-t border-zinc-800">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Спроси что-нибудь..."
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="w-12 h-12 bg-indigo-500 rounded-xl flex items-center justify-center disabled:opacity-40"
          >
            <Send className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>
    </div>
  )
}
