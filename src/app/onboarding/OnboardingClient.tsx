'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Send, Dumbbell } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const mdComponents = {
  p: ({ children }: { children?: React.ReactNode }) => <p className="mb-2 last:mb-0">{children}</p>,
  strong: ({ children }: { children?: React.ReactNode }) => <strong className="font-bold text-white">{children}</strong>,
  ul: ({ children }: { children?: React.ReactNode }) => <ul className="list-disc list-inside space-y-1 mb-2">{children}</ul>,
  ol: ({ children }: { children?: React.ReactNode }) => <ol className="list-decimal list-inside space-y-1 mb-2">{children}</ol>,
  li: ({ children }: { children?: React.ReactNode }) => <li className="text-zinc-200">{children}</li>,
  h2: ({ children }: { children?: React.ReactNode }) => <h2 className="text-sm font-bold text-white mb-1.5">{children}</h2>,
  h3: ({ children }: { children?: React.ReactNode }) => <h3 className="text-sm font-semibold text-zinc-200 mb-1">{children}</h3>,
}

const FIRST_MESSAGE: Message = {
  role: 'assistant',
  content: 'Привет! Я твой персональный тренер и нутрициолог. Прежде чем начать — давай познакомимся и составим твой индивидуальный план питания.\n\nЭто займёт около 3 минут. Я задам несколько вопросов, и на основе твоих ответов рассчитаю точную норму калорий и макронутриентов.\n\nДля начала — как тебя зовут?',
}

export default function OnboardingClient() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([FIRST_MESSAGE])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function sendMessage() {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: Message = { role: 'user', content: text }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/ai/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      })
      const data = await res.json()
      setLoading(false)

      const assistantMsg: Message = { role: 'assistant', content: data.content }
      setMessages(prev => [...prev, assistantMsg])

      if (data.profile_saved) {
        setDone(true)
      }
    } catch {
      setLoading(false)
      setMessages(prev => [...prev, { role: 'assistant', content: 'Произошла ошибка. Попробуй ещё раз.' }])
    }
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <div className="px-4 py-5 border-b border-white/[0.06] flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/25">
          <Dumbbell className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-white font-bold">Первичная консультация</p>
          <p className="text-zinc-500 text-xs">Персональный тренер и нутрициолог</p>
        </div>
        {/* Progress hint */}
        <div className="ml-auto">
          <div className="text-zinc-600 text-xs">~3 минуты</div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 max-w-lg mx-auto w-full">
        {messages.map((msg, i) => {
          const prevMsg = messages[i - 1]
          const isFirstInGroup = !prevMsg || prevMsg.role !== msg.role
          return (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} ${!isFirstInGroup ? 'mt-0' : 'mt-1'}`}
            >
              {msg.role === 'assistant' && (
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center mr-2 flex-shrink-0 mt-0.5 ${isFirstInGroup ? 'bg-blue-600/20' : 'opacity-0'}`}>
                  <Dumbbell className="w-4 h-4 text-blue-400" />
                </div>
              )}
              <div className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-sm'
                  : 'bg-zinc-900 border border-white/[0.07] text-zinc-100 rounded-bl-sm'
              }`}>
                {msg.role === 'user' ? msg.content : (
                  <ReactMarkdown components={mdComponents}>{msg.content}</ReactMarkdown>
                )}
              </div>
            </div>
          )
        })}

        {loading && (
          <div className="flex justify-start mt-1">
            <div className="w-8 h-8 bg-blue-600/20 rounded-xl flex items-center justify-center mr-2 flex-shrink-0">
              <Dumbbell className="w-4 h-4 text-blue-400" />
            </div>
            <div className="bg-zinc-900 border border-white/[0.07] rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1 items-center">
                <span className="w-2 h-2 bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Кнопка перехода после завершения */}
      {done && (
        <div className="px-4 pb-4 max-w-lg mx-auto w-full">
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full py-4 rounded-2xl bg-blue-600 text-white font-bold text-base active:bg-blue-700 transition-colors"
          >
            Перейти к приложению →
          </button>
        </div>
      )}

      {/* Input */}
      {!done && (
        <div className="px-4 py-3 border-t border-white/[0.06] max-w-lg mx-auto w-full">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Напиши ответ..."
              className="flex-1 bg-zinc-900 border border-white/[0.07] rounded-xl px-4 py-3 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-blue-500 transition-colors"
              autoFocus
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center disabled:opacity-40 active:bg-blue-700 transition-colors"
            >
              <Send className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
