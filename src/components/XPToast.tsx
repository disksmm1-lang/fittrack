'use client'

import { useEffect, useState } from 'react'
import { Star, TrendingUp } from 'lucide-react'

interface XPToastData {
  xpGained: number
  newAchievements: { key: string; name: string; icon: string; xp_reward: number }[]
  levelUp: boolean
  newLevel: number
  newStreak: number
}

interface ToastItem {
  id: string
  type: 'xp' | 'achievement' | 'levelup' | 'streak'
  text: string
  icon: string
}

let globalShowToasts: ((data: XPToastData) => void) | null = null

export function showXPToasts(data: XPToastData) {
  globalShowToasts?.(data)
}

const EVENT_MAP: Record<string, string> = {
  workout_complete: 'workout',
  food_entry:       'food_entry',
  cardio_entry:     'cardio_entry',
}

export async function awardXPAndShow(reason: string, challengeValue = 1): Promise<XPToastData | null> {
  try {
    const [xpRes] = await Promise.all([
      fetch('/api/gamification/award-xp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      }),
      EVENT_MAP[reason] ? fetch('/api/gamification/update-challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: EVENT_MAP[reason], value: challengeValue }),
      }) : Promise.resolve(),
    ])
    if (!xpRes.ok) return null
    const data: XPToastData = await xpRes.json()
    showXPToasts(data)
    return data
  } catch {
    return null
  }
}

export default function XPToastProvider() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    globalShowToasts = (data: XPToastData) => {
      const items: ToastItem[] = []

      if (data.xpGained > 0) {
        items.push({ id: `xp-${Date.now()}`, type: 'xp', text: `+${data.xpGained} XP`, icon: '⚡' })
      }
      if (data.newStreak > 1) {
        items.push({ id: `streak-${Date.now()}`, type: 'streak', text: `🔥 Стрик ${data.newStreak} дней!`, icon: '🔥' })
      }
      if (data.levelUp) {
        items.push({ id: `level-${Date.now()}`, type: 'levelup', text: `Уровень ${data.newLevel}!`, icon: '⭐' })
      }
      for (const ach of data.newAchievements) {
        items.push({ id: `ach-${ach.key}`, type: 'achievement', text: ach.name, icon: ach.icon })
      }

      if (items.length === 0) return

      setToasts(prev => [...prev, ...items])
      setTimeout(() => {
        setToasts(prev => prev.filter(t => !items.find(i => i.id === t.id)))
      }, 3000)
    }
    return () => { globalShowToasts = null }
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl shadow-lg text-sm font-semibold animate-in fade-in slide-in-from-top-2 duration-300
            ${t.type === 'xp'          ? 'bg-yellow-500 text-black' :
              t.type === 'levelup'     ? 'bg-purple-600 text-white' :
              t.type === 'streak'      ? 'bg-orange-500 text-white' :
                                         'bg-zinc-900 border border-white/10 text-white'}`}
        >
          <span>{t.icon}</span>
          <span>{t.text}</span>
          {t.type === 'xp' && <Star className="w-3.5 h-3.5" />}
          {t.type === 'levelup' && <TrendingUp className="w-3.5 h-3.5" />}
        </div>
      ))}
    </div>
  )
}
