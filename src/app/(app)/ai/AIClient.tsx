'use client'

import { useState, useRef, useEffect } from 'react'
import { Sparkles, Send, Dumbbell, Apple, Zap, Trash2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

function splitIntoChunks(text: string): string[] {
  const parts = text.split(/\n{2,}/).map(p => p.trim()).filter(Boolean)
  if (parts.length <= 1) return parts

  const merged: string[] = []
  let buffer = ''
  for (const part of parts) {
    if (buffer && buffer.length < 60) {
      buffer += '\n\n' + part
    } else {
      if (buffer) merged.push(buffer)
      buffer = part
    }
  }
  if (buffer) merged.push(buffer)

  if (merged.length > 4) {
    const result: string[] = []
    const chunkSize = Math.ceil(merged.length / 4)
    for (let i = 0; i < merged.length; i += chunkSize) {
      result.push(merged.slice(i, i + chunkSize).join('\n\n'))
    }
    return result
  }

  return merged
}

const mdComponents = {
  p: ({ children }: { children?: React.ReactNode }) => <p className="mb-2 last:mb-0">{children}</p>,
  strong: ({ children }: { children?: React.ReactNode }) => <strong className="font-bold text-white">{children}</strong>,
  ul: ({ children }: { children?: React.ReactNode }) => <ul className="list-disc list-inside space-y-1 mb-2">{children}</ul>,
  ol: ({ children }: { children?: React.ReactNode }) => <ol className="list-decimal list-inside space-y-1 mb-2">{children}</ol>,
  li: ({ children }: { children?: React.ReactNode }) => <li className="text-zinc-200">{children}</li>,
  h1: ({ children }: { children?: React.ReactNode }) => <h1 className="text-base font-bold text-white mb-2">{children}</h1>,
  h2: ({ children }: { children?: React.ReactNode }) => <h2 className="text-sm font-bold text-white mb-1.5">{children}</h2>,
  h3: ({ children }: { children?: React.ReactNode }) => <h3 className="text-sm font-semibold text-zinc-200 mb-1">{children}</h3>,
  code: ({ children }: { children?: React.ReactNode }) => <code className="bg-zinc-800 px-1 py-0.5 rounded text-xs text-blue-300">{children}</code>,
  hr: () => <hr className="border-zinc-700 my-2" />,
}

const WELCOME: Message = {
  role: 'assistant',
  content: 'Привет! Я твой ИИ-тренер и диетолог. Спроси меня про тренировки, питание, восстановление — всё что угодно!',
}

export default function AIClient({ initialHistory, userId }: {
  initialHistory: Message[]
  userId: string
}) {
  const supabase = createClient()
  const router = useRouter()

  const [messages, setMessages] = useState<Message[]>(
    initialHistory.length > 0 ? initialHistory : [WELCOME]
  )
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [typing, setTyping] = useState(false)
  const [clearing, setClearing] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading, typing])

  async function saveMessage(role: 'user' | 'assistant', content: string) {
    await supabase.from('chat_messages').insert({ user_id: userId, role, content })
  }

  async function clearHistory() {
    setClearing(true)
    await supabase.from('chat_messages').delete().eq('user_id', userId)
    setMessages([WELCOME])
    setClearing(false)
  }

  async function sendMessage(text?: string) {
    const content = text ?? input.trim()
    if (!content || loading || typing) return

    const userMsg: Message = { role: 'user', content }
    const newMessages: Message[] = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    await saveMessage('user', content)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      })
      const data = await res.json()
      setLoading(false)

      if (data.workout_saved || data.workout_deleted || data.workout_updated || data.food_logged) {
        router.refresh()
      }

      const chunks = splitIntoChunks(data.content)

      for (let i = 0; i < chunks.length; i++) {
        if (i > 0) {
          setTyping(true)
          await new Promise(r => setTimeout(r, 600 + Math.random() * 600))
          setTyping(false)
          await new Promise(r => setTimeout(r, 100))
        }
        const chunk = chunks[i]!
        setMessages(prev => [...prev, { role: 'assistant', content: chunk }])
        await saveMessage('assistant', chunk)
      }
    } catch {
      setLoading(false)
      setMessages(prev => [...prev, { role: 'assistant', content: 'Ошибка. Попробуй ещё раз.' }])
    }
  }

  const quickPrompts = [
    { icon: Dumbbell, text: 'Составь программу на 3 дня в неделю' },
    { icon: Apple, text: 'Что съесть после тренировки?' },
    { icon: Zap, text: 'Как быстро восстановиться?' },
  ]

  const showTyping = loading || typing
  const isFirstOpen = initialHistory.length === 0

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-white/[0.06]">
        <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-600/25">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-white font-bold">ИИ советник</p>
          <p className="text-zinc-600 text-xs">Тренер и диетолог</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-zinc-600 text-xs">Онлайн</span>
          </div>
          {messages.length > 1 && (
            <button
              onClick={clearHistory}
              disabled={clearing}
              className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center text-zinc-500 active:bg-zinc-700"
              title="Очистить историю"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2">
        {messages.map((msg, i) => {
          const prevMsg = messages[i - 1]
          const isFirstInGroup = !prevMsg || prevMsg.role !== msg.role
          return (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} ${!isFirstInGroup ? 'mt-0' : 'mt-1'}`}>
              {msg.role === 'assistant' && (
                <div className={`w-7 h-7 rounded-xl flex items-center justify-center mr-2 flex-shrink-0 mt-0.5 ${isFirstInGroup ? 'bg-purple-600/20' : 'opacity-0'}`}>
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-sm'
                    : 'bg-[#111] text-zinc-100 border border-white/[0.07] rounded-bl-sm'
                }`}
              >
                {msg.role === 'user' ? msg.content : (
                  <ReactMarkdown components={mdComponents}>
                    {msg.content}
                  </ReactMarkdown>
                )}
              </div>
            </div>
          )
        })}

        {showTyping && (
          <div className="flex justify-start mt-1">
            <div className="w-7 h-7 bg-purple-600/20 rounded-xl flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="bg-[#111] border border-white/[0.07] rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        {isFirstOpen && messages.length === 1 && (
          <div className="flex flex-col gap-2 mt-2">
            <p className="text-zinc-600 text-xs font-medium mb-1">Быстрые вопросы</p>
            {quickPrompts.map(({ icon: Icon, text }) => (
              <button
                key={text}
                onClick={() => sendMessage(text)}
                className="flex items-center gap-3 bg-[#111] border border-white/[0.07] rounded-xl px-4 py-3 text-left text-zinc-300 text-sm active:bg-zinc-800 transition-colors"
              >
                <div className="w-7 h-7 bg-purple-600/15 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon className="w-3.5 h-3.5 text-purple-400" />
                </div>
                {text}
              </button>
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-white/[0.06]">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Спроси что-нибудь..."
            className="flex-1 bg-zinc-900 border border-white/[0.07] rounded-xl px-4 py-3 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors"
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading || typing}
            className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center disabled:opacity-40 active:bg-purple-700 transition-colors"
          >
            <Send className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>
    </div>
  )
}
