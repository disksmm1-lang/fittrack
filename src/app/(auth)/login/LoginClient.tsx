'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Dumbbell } from 'lucide-react'

export default function LoginClient() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(error.message)
      } else {
        setMessage('Проверь почту для подтверждения')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError('Неверный email или пароль')
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-[#0a0a0a]">
      {/* Background accent */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm relative">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-blue-600/30">
            <Dumbbell className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">FitTrack AI</h1>
          <p className="text-zinc-500 text-sm mt-1">Тренировки и питание с ИИ</p>
        </div>

        {/* Tabs */}
        <div className="flex bg-zinc-900 rounded-xl p-1 mb-6">
          <button
            type="button"
            onClick={() => { setIsSignUp(false); setError(''); setMessage('') }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              !isSignUp ? 'bg-white text-black' : 'text-zinc-500'
            }`}
          >
            Войти
          </button>
          <button
            type="button"
            onClick={() => { setIsSignUp(true); setError(''); setMessage('') }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              isSignUp ? 'bg-white text-black' : 'text-zinc-500'
            }`}
          >
            Регистрация
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3.5 rounded-xl bg-zinc-900 border border-white/[0.07] text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 text-base transition-colors"
          />
          <input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full px-4 py-3.5 rounded-xl bg-zinc-900 border border-white/[0.07] text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 text-base transition-colors"
          />

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
          {message && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
              <p className="text-green-400 text-sm">{message}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-xl bg-blue-600 text-white font-bold text-base disabled:opacity-50 active:bg-blue-700 transition-colors mt-1 shadow-lg shadow-blue-600/20"
          >
            {loading ? 'Загрузка...' : isSignUp ? 'Создать аккаунт' : 'Войти'}
          </button>
        </form>
      </div>
    </div>
  )
}
