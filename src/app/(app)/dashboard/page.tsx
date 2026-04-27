export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Dumbbell, Apple, Sparkles, Plus, ChevronRight, Flame, Zap, User } from 'lucide-react'
import { calculateKBJU } from '@/lib/kbju'
import { getCachedProfile, getCachedFoodEntries, getCachedCardioEntries, getCachedTodayWorkout } from '@/lib/supabase/cached'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const today = new Date().toISOString().split('T')[0]

  const [profile, todayWorkout, todayFood, todayCardio] = await Promise.all([
    getCachedProfile(user.id),
    getCachedTodayWorkout(user.id, today),
    getCachedFoodEntries(user.id, today),
    getCachedCardioEntries(user.id, today),
  ])

  const totalCalories = todayFood?.reduce((sum, e) => sum + e.calories, 0) ?? 0
  const totalCardioCalories = todayCardio?.reduce((sum, e) => sum + e.calories_burned, 0) ?? 0
  const totalProtein = todayFood?.reduce((sum, e) => sum + e.protein_g, 0) ?? 0
  const totalFat = todayFood?.reduce((sum, e) => sum + e.fat_g, 0) ?? 0
  const totalCarbs = todayFood?.reduce((sum, e) => sum + e.carbs_g, 0) ?? 0

  const kbju = profile ? calculateKBJU(profile) : null
  const calorieGoal = kbju?.calories ?? 2000

  const effectiveGoal = calorieGoal + totalCardioCalories
  const calProgress = Math.min((totalCalories / effectiveGoal) * 100, 100)

  const name = profile?.name || user.email?.split('@')[0] || 'Спортсмен'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Доброе утро' : hour < 18 ? 'Добрый день' : 'Добрый вечер'

  const todayStr = new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="px-4 pt-8 pb-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-7">
        <div>
          <p className="text-zinc-500 text-sm font-medium capitalize">{todayStr}</p>
          <h1 className="text-[28px] font-bold text-white mt-0.5 leading-tight">
            {greeting}, {name.split(' ')[0]}
          </h1>
        </div>
        <Link href="/profile" className="w-10 h-10 bg-[#111] border border-white/[0.07] rounded-xl flex items-center justify-center mt-1 flex-shrink-0">
          <User className="w-5 h-5 text-zinc-400" />
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-[#111] border border-white/[0.07] rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-orange-500/20 flex items-center justify-center">
              <Flame className="w-4 h-4 text-orange-400" />
            </div>
            <span className="text-zinc-500 text-xs font-medium">Калории</span>
          </div>
          <p className="text-2xl font-bold text-white leading-none">{Math.round(totalCalories)}</p>
          <p className="text-zinc-600 text-xs mt-1">из {Math.round(calorieGoal)} ккал</p>
          <div className="mt-3 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-orange-500 rounded-full" style={{ width: `${calProgress}%` }} />
          </div>
          {totalCardioCalories > 0 && (
            <div className="mt-2 flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-red-400 text-xs font-medium">−{totalCardioCalories} ккал сожжено</span>
            </div>
          )}
        </div>

        <div className="bg-[#111] border border-white/[0.07] rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Zap className="w-4 h-4 text-blue-400" />
            </div>
            <span className="text-zinc-500 text-xs font-medium">Макросы</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-zinc-500 text-xs">Белки</span>
              <span className="text-white text-sm font-semibold">{Math.round(totalProtein)}г</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-500 text-xs">Жиры</span>
              <span className="text-white text-sm font-semibold">{Math.round(totalFat)}г</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-500 text-xs">Углеводы</span>
              <span className="text-white text-sm font-semibold">{Math.round(totalCarbs)}г</span>
            </div>
          </div>
        </div>
      </div>

      {/* Today's workout */}
      <div className="mb-3">
        {todayWorkout ? (
          <Link href={`/workouts/${todayWorkout.id}`} className="block bg-blue-600 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-200 text-xs font-medium mb-1">Тренировка сегодня</p>
                <p className="text-white font-bold text-lg leading-tight">{todayWorkout.name}</p>
              </div>
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <ChevronRight className="w-5 h-5 text-white" />
              </div>
            </div>
          </Link>
        ) : (
          <div className="bg-[#111] border border-white/[0.07] rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center">
                <Dumbbell className="w-5 h-5 text-zinc-500" />
              </div>
              <div>
                <p className="text-white font-medium text-sm">Тренировок нет</p>
                <p className="text-zinc-600 text-xs">Начни первую сегодня</p>
              </div>
            </div>
            <Link
              href="/workouts/new"
              className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0"
            >
              <Plus className="w-4 h-4 text-white" />
            </Link>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 mt-4">
        <Link
          href="/nutrition/add"
          className="bg-[#111] border border-white/[0.07] rounded-2xl p-4 flex items-center gap-3"
        >
          <div className="w-9 h-9 bg-green-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Apple className="w-5 h-5 text-green-400" />
          </div>
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm">Питание</p>
            <p className="text-zinc-600 text-xs truncate">Добавить приём</p>
          </div>
        </Link>

        <Link
          href="/ai"
          className="bg-[#111] border border-white/[0.07] rounded-2xl p-4 flex items-center gap-3"
        >
          <div className="w-9 h-9 bg-purple-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-purple-400" />
          </div>
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm">ИИ тренер</p>
            <p className="text-zinc-600 text-xs truncate">Спросить совет</p>
          </div>
        </Link>
      </div>
    </div>
  )
}
