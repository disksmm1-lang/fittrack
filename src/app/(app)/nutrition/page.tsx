export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, Camera } from 'lucide-react'

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
    supabase.from('profiles').select('weight, height, age, gender, goal, activity_level').eq('id', user.id).single(),
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

  let calorieGoal = 2000
  if (profile?.weight && profile?.height && profile?.age && profile?.gender) {
    const bmr = profile.gender === 'male'
      ? 10 * profile.weight + 6.25 * profile.height - 5 * profile.age + 5
      : 10 * profile.weight + 6.25 * profile.height - 5 * profile.age - 161
    const activityMultipliers: Record<string, number> = {
      sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9
    }
    const multiplier = activityMultipliers[profile.activity_level ?? 'moderate'] ?? 1.55
    const tdee = bmr * multiplier
    calorieGoal = profile.goal === 'lose_weight' ? tdee - 500 : profile.goal === 'gain_muscle' ? tdee + 300 : tdee
  }

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
            { label: 'Белки', value: totals.protein_g, color: 'text-blue-400', bg: 'bg-blue-500/10' },
            { label: 'Жиры', value: totals.fat_g, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
            { label: 'Углеводы', value: totals.carbs_g, color: 'text-orange-400', bg: 'bg-orange-500/10' },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={`${bg} rounded-xl px-3 py-2.5 text-center`}>
              <p className={`text-lg font-bold ${color} leading-none`}>{Math.round(value)}</p>
              <p className="text-zinc-600 text-xs mt-1">{label}, г</p>
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
                <div className="px-4 py-2">
                  {mealEntries.map((e, idx) => (
                    <div
                      key={e.id}
                      className={`flex justify-between items-center py-2.5 ${idx < mealEntries.length - 1 ? 'border-b border-white/[0.04]' : ''}`}
                    >
                      <div>
                        <p className="text-white text-sm font-medium">{e.food_name}</p>
                        <p className="text-zinc-600 text-xs">{e.amount_grams}г</p>
                      </div>
                      <p className="text-zinc-400 text-sm font-semibold">{Math.round(e.calories)} ккал</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
