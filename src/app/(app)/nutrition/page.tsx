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

  // Calculate TDEE if profile complete
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

  const byMeal: Record<string, typeof entries> = {}
  for (const e of entries ?? []) {
    if (!byMeal[e.meal_type]) byMeal[e.meal_type] = []
    byMeal[e.meal_type]!.push(e)
  }

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Питание</h1>
        <div className="flex gap-2">
          <Link href="/nutrition/photo" className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center">
            <Camera className="w-5 h-5 text-zinc-300" />
          </Link>
          <Link href="/nutrition/add" className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl font-medium text-sm">
            <Plus className="w-4 h-4" />
            Добавить
          </Link>
        </div>
      </div>

      {/* Calories progress */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-white font-semibold">Калории</span>
          <span className="text-zinc-400 text-sm">{Math.round(totals.calories)} / {Math.round(calorieGoal)} ккал</span>
        </div>
        <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between mt-3">
          {[
            { label: 'Белки', value: totals.protein_g, color: 'text-blue-400' },
            { label: 'Жиры', value: totals.fat_g, color: 'text-yellow-400' },
            { label: 'Углеводы', value: totals.carbs_g, color: 'text-orange-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="text-center">
              <p className={`font-semibold ${color}`}>{Math.round(value)}г</p>
              <p className="text-zinc-500 text-xs">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Meals */}
      {['breakfast', 'lunch', 'dinner', 'snack'].map(meal => {
        const mealEntries = byMeal[meal] ?? []
        const mealCals = mealEntries.reduce((s, e) => s + e.calories, 0)
        return (
          <div key={meal} className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-zinc-400 text-sm font-medium">{MEAL_LABELS[meal]}</span>
              {mealCals > 0 && <span className="text-zinc-500 text-xs">{Math.round(mealCals)} ккал</span>}
            </div>
            <div className="flex flex-col gap-2">
              {mealEntries.map(e => (
                <div key={e.id} className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 flex justify-between items-center">
                  <div>
                    <p className="text-white text-sm font-medium">{e.food_name}</p>
                    <p className="text-zinc-500 text-xs">{e.amount_grams}г</p>
                  </div>
                  <p className="text-zinc-400 text-sm">{Math.round(e.calories)} ккал</p>
                </div>
              ))}
              <Link
                href={`/nutrition/add?meal=${meal}`}
                className="border border-dashed border-zinc-700 rounded-xl py-3 flex items-center justify-center gap-2 text-zinc-500 text-sm"
              >
                <Plus className="w-4 h-4" />
                Добавить {MEAL_LABELS[meal].toLowerCase()}
              </Link>
            </div>
          </div>
        )
      })}
    </div>
  )
}
