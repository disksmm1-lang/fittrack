export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProfileForm from './ProfileForm'
import { xpProgressInLevel } from '@/lib/gamification'
import { Flame, Trophy } from 'lucide-react'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: userAchievements }, { data: allAchievements }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('user_achievements').select('achievement_key, unlocked_at').eq('user_id', user.id),
    supabase.from('achievements').select('*').order('category'),
  ])

  const xp = profile?.xp ?? 0
  const level = profile?.level ?? 1
  const streak = profile?.streak_days ?? 0
  const { current: xpCurrent, needed: xpNeeded } = xpProgressInLevel(xp)
  const unlockedKeys = new Set((userAchievements ?? []).map(a => a.achievement_key))

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-white mb-5">Профиль</h1>

      {/* Level & XP card */}
      <div className="bg-[#111] border border-white/[0.07] rounded-2xl p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-600/20 rounded-2xl flex items-center justify-center">
              <span className="text-2xl font-bold text-purple-400">{level}</span>
            </div>
            <div>
              <p className="text-white font-bold">Уровень {level}</p>
              <p className="text-zinc-500 text-xs">{xp} XP всего</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-orange-500/15 px-3 py-1.5 rounded-xl">
            <Flame className="w-4 h-4 text-orange-400" />
            <span className="text-orange-400 font-bold text-sm">{streak}</span>
            <span className="text-orange-400/70 text-xs">дней</span>
          </div>
        </div>
        <div className="mb-1 flex justify-between text-xs text-zinc-600">
          <span>{xpCurrent} / {xpNeeded} XP</span>
          <span>до уровня {level + 1}</span>
        </div>
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-purple-500 rounded-full transition-all"
            style={{ width: `${Math.min((xpCurrent / xpNeeded) * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* Achievements */}
      <div className="bg-[#111] border border-white/[0.07] rounded-2xl p-4 mb-5">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-4 h-4 text-yellow-400" />
          <p className="text-white font-bold">Достижения</p>
          <span className="text-zinc-600 text-xs ml-auto">{unlockedKeys.size} / {(allAchievements ?? []).length}</span>
        </div>
        <div className="grid grid-cols-4 gap-2.5">
          {(allAchievements ?? []).map(ach => {
            const unlocked = unlockedKeys.has(ach.key)
            return (
              <div
                key={ach.key}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${unlocked ? 'bg-zinc-800/60' : 'bg-zinc-900/40 opacity-35'}`}
                title={ach.description}
              >
                <span className={`text-2xl ${unlocked ? '' : 'grayscale'}`}>{ach.icon}</span>
                <p className="text-center text-zinc-400 text-[10px] leading-tight line-clamp-2">{ach.name}</p>
                {ach.xp_reward > 0 && (
                  <span className={`text-[9px] font-semibold ${unlocked ? 'text-yellow-500' : 'text-zinc-600'}`}>+{ach.xp_reward} XP</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <ProfileForm profile={profile} userId={user.id} email={user.email ?? ''} />
    </div>
  )
}
