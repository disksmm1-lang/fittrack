'use client'

import { useEffect, useState } from 'react'
import { Trophy } from 'lucide-react'

interface Challenge {
  id: string
  type: string
  title: string
  target: number
  current: number
  completed: boolean
  xp_reward: number
}

export default function WeeklyChallenges() {
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/gamification/challenges')
      .then(r => r.json())
      .then(data => { setChallenges(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading || challenges.length === 0) return null

  return (
    <div className="bg-[#111] border border-white/[0.07] rounded-2xl p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="w-4 h-4 text-yellow-400" />
        <p className="text-white font-bold text-sm">Челленджи недели</p>
      </div>
      <div className="flex flex-col gap-2.5">
        {challenges.map(c => {
          const pct = Math.min((c.current / c.target) * 100, 100)
          return (
            <div key={c.id} className={`rounded-xl p-3 ${c.completed ? 'bg-green-500/10 border border-green-500/20' : 'bg-zinc-900'}`}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className={`text-sm font-medium leading-tight ${c.completed ? 'text-green-400' : 'text-white'}`}>
                  {c.completed ? '✓ ' : ''}{c.title}
                </p>
                <span className="text-yellow-500 text-xs font-semibold flex-shrink-0">+{c.xp_reward} XP</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${c.completed ? 'bg-green-500' : 'bg-blue-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-zinc-600 text-xs flex-shrink-0">{c.current}/{c.target}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
