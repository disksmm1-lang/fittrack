export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Dumbbell, Apple, Sparkles, TrendingUp, Plus } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const today = new Date().toISOString().split('T')[0]

  const [{ data: profile }, { data: todayWorkout }, { data: todayFood }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('workouts').select('id, name').eq('user_id', user.id).eq('date', today).maybeSingle(),
    supabase.from('food_entries').select('calories, protein_g, fat_g, carbs_g').eq('user_id', user.id).eq('date', today),
  ])

  const totalCalories = todayFood?.reduce((sum, e) => sum + e.calories, 0) ?? 0
  const totalProtein = todayFood?.reduce((sum, e) => sum + e.protein_g, 0) ?? 0
  const totalFat = todayFood?.reduce((sum, e) => sum + e.fat_g, 0) ?? 0
  const totalCarbs = todayFood?.reduce((sum, e) => sum + e.carbs_g, 0) ?? 0

  const name = profile?.name || user.email?.split('@')[0] || 'Спортсмен'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Доброе утро' : hour < 18 ? 'Добрый день' : 'Добрый вечер'

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <div className="mb-6">
        <p className="text-zinc-400 text-sm">{greeting},</p>
        <h1 className="text-2xl font-bold text-white">{name} 👋</h1>
      </div>

      {/* Today's workout */}
      <div className="mb-4">
        <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Dumbbell className="w-5 h-5 text-indigo-400" />
              <span className="font-semibold text-white">Тренировка сегодня</span>
            </div>
            <Link href="/workouts/new" className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center">
              <Plus className="w-4 h-4 text-white" />
            </Link>
          </div>
          {todayWorkout ? (
            <Link href={`/workouts/${todayWorkout.id}`} className="block">
              <p className="text-indigo-400 font-medium">{todayWorkout.name}</p>
              <p className="text-zinc-500 text-sm">Нажми чтобы открыть</p>
            </Link>
          ) : (
            <p className="text-zinc-500 text-sm">Тренировок нет. Начни сейчас!</p>
          )}
        </div>
      </div>

      {/* Nutrition summary */}
      <div className="mb-4">
        <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Apple className="w-5 h-5 text-green-400" />
              <span className="font-semibold text-white">Питание сегодня</span>
            </div>
            <Link href="/nutrition/add" className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
              <Plus className="w-4 h-4 text-white" />
            </Link>
          </div>
          <div className="flex justify-between">
            <div className="text-center">
              <p className="text-xl font-bold text-white">{Math.round(totalCalories)}</p>
              <p className="text-zinc-500 text-xs">ккал</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-blue-400">{Math.round(totalProtein)}г</p>
              <p className="text-zinc-500 text-xs">белки</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-yellow-400">{Math.round(totalFat)}г</p>
              <p className="text-zinc-500 text-xs">жиры</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-orange-400">{Math.round(totalCarbs)}г</p>
              <p className="text-zinc-500 text-xs">углеводы</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/ai" className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800 flex flex-col gap-2">
          <Sparkles className="w-6 h-6 text-purple-400" />
          <p className="font-semibold text-white text-sm">ИИ советник</p>
          <p className="text-zinc-500 text-xs">Получи рекомендации</p>
        </Link>
        <Link href="/profile" className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800 flex flex-col gap-2">
          <TrendingUp className="w-6 h-6 text-indigo-400" />
          <p className="font-semibold text-white text-sm">Мой прогресс</p>
          <p className="text-zinc-500 text-xs">Статистика и цели</p>
        </Link>
      </div>
    </div>
  )
}
