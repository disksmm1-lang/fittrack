export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, Camera } from 'lucide-react'
import { calculateKBJU } from '@/lib/kbju'
import FoodEntries from './FoodEntries'

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Завтрак',
  lunch: 'Обед',
  dinner: 'Ужин',
  snack: 'Перекус',
}

const MEAL_COLORS: Record<string, string> = {
  breakfast: 'text-orange-400 bg-orange-500/15',
  lunch: 'text-green-400 bg-green-500/15',
  dinner: 'text-blue-400 bg-blue-500/15',
  snack: 'text-purple-400 bg-purple-500/15',
}

export default async function NutritionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = new Date().toISOString().split('T')[0]

  const [{ data: entries }, { data: profile }] = await Promise.all([
    supabase.from('food_entries').select('*').eq('user_id', user.id).eq('date', today).order('created_at'),
    supabase.from('profiles').select('weight, height, age, gender, goal, body_fat, work_type, training_days, training_intensity, activity_level').eq('id', user.id).single(),
  ])

  const totals = (entries ?? []).reduce(
    (acc, e) => ({
      calories: acc.calories + e.calories,
      protein_g: acc.protein_g + e.protein_g,
      fat_g: acc.fat_g + e.fat_g,
      carbs_g: acc.carbs_g + e.carbs_g,
    }),
    { calories: 0, protein_g: 0, fat_g: 0, carbs_g: 0 }
  )

  const kbju = profile ? calculateKBJU(profile) : null
  const calorieGoal = kbju?.calories ?? 2000
  const proteinGoal = kbju?.protein ?? 150
  const fatGoal = kbju?.fat ?? 60
  const carbsGoal = kbju?.carbs ?? 200

  const progress = Math.min((totals.calories / calorieGoal) * 100, 100)
  const remaining = Math.max(0, calorieGoal - totals.calories)

  const byMeal: Record<string, typeof entries> = {}
  for (const e of entries ?? []) {
    if (!byMeal[e.meal_type]) byMeal[e.meal_type] = []
    byMeal[e.meal_type]!.push(e)
  }

  return (
    <div className="px-4 pt-8 pb-6 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-7">
        <h1 className="text-[28px] font-bold text-white">Питание</h1>
        <div className="flex gap-2">
          <Link href="/nutrition/photo" className="w-10 h-10 bg-[#111] border border-white/[0.07] rounded-xl flex items-center justify-center">
            <Camera className="w-5 h-5 text-zinc-400" />
          </Link>
          <Link href="/nutrition/add" className="flex items-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-xl font-semibold text-sm">
            <Plus className="w-4 h-4" />
            Добавить
          </Link>
        </div>
      </div>

      {/* Calories card */}
      <div className="bg-[#111] border border-white/[0.07] rounded-2xl p-5 mb-4">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-1">Сегодня</p>
            <p className="text-4xl font-bold text-white leading-none">{Math.round(totals.calories)}</p>
            <p className="text-zinc-600 text-sm mt-1">из {Math.round(calorieGoal)} ккал</p>
          </div>
          <div className="text-right">
            <p className="text-zinc-500 text-xs font-medium">Осталось</p>
            <p className="text-2xl font-bold text-green-400 leading-none mt-1">{Math.round(remaining)}</p>
            <p className="text-zinc-600 text-xs mt-1">ккал</p>
          </div>
        </div>

        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden mb-5">
          <div
            className="h-full bg-green-500 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Белки', value: totals.protein_g, goal: proteinGoal, color: 'text-blue-400', bg: 'bg-blue-500/10', bar: 'bg-blue-500' },
            { label: 'Жиры', value: totals.fat_g, goal: fatGoal, color: 'text-yellow-400', bg: 'bg-yellow-500/10', bar: 'bg-yellow-500' },
            { label: 'Углеводы', value: totals.carbs_g, goal: carbsGoal, color: 'text-orange-400', bg: 'bg-orange-500/10', bar: 'bg-orange-500' },
          ].map(({ label, value, goal, color, bg, bar }) => (
            <div key={label} className={`${bg} rounded-xl px-3 py-2.5 text-center`}>
              <p className={`text-lg font-bold ${color} leading-none`}>{Math.round(value)}</p>
              <p className="text-zinc-600 text-xs mt-0.5">из {Math.round(goal)}г</p>
              <div className="mt-1.5 h-1 bg-black/20 rounded-full overflow-hidden">
                <div className={`h-full ${bar} rounded-full`} style={{ width: `${Math.min((value / goal) * 100, 100)}%` }} />
              </div>
              <p className="text-zinc-600 text-xs mt-1">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Meals */}
      {['breakfast', 'lunch', 'dinner', 'snack'].map(meal => {
        const mealEntries = byMeal[meal] ?? []
        const mealCals = mealEntries.reduce((s, e) => s + e.calories, 0)
        const colorClass = MEAL_COLORS[meal] ?? 'text-zinc-400 bg-zinc-800'
        return (
          <div key={meal} className="mb-3">
            <div className="bg-[#111] border border-white/[0.07] rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.05]">
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 ${colorClass} rounded-lg flex items-center justify-center`}>
                    <span className="text-xs font-bold">{MEAL_LABELS[meal]?.[0]}</span>
                  </div>
                  <span className="text-white font-semibold text-sm">{MEAL_LABELS[meal]}</span>
                </div>
                <div className="flex items-center gap-3">
                  {mealCals > 0 && <span className="text-zinc-500 text-xs font-medium">{Math.round(mealCals)} ккал</span>}
                  <Link
                    href={`/nutrition/add?meal=${meal}`}
                    className="w-7 h-7 bg-zinc-800 rounded-lg flex items-center justify-center"
                  >
                    <Plus className="w-3.5 h-3.5 text-zinc-400" />
                  </Link>
                </div>
              </div>
              {mealEntries.length > 0 && (
                <FoodEntries entries={mealEntries} />
              )}
            </div>
          </div>
        )
      })}

    </div>
  )
}
