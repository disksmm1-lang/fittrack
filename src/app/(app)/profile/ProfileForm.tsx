'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'

interface Profile {
  id: string
  name?: string
  age?: number
  gender?: string
  weight?: number
  height?: number
  goal?: string
  activity_level?: string
}

export default function ProfileForm({ profile, userId, email }: { profile: Profile | null; userId: string; email: string }) {
  const supabase = createClient()
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [form, setForm] = useState({
    name: profile?.name ?? '',
    age: profile?.age?.toString() ?? '',
    gender: profile?.gender ?? 'male',
    weight: profile?.weight?.toString() ?? '',
    height: profile?.height?.toString() ?? '',
    goal: profile?.goal ?? 'maintain',
    activity_level: profile?.activity_level ?? 'moderate',
  })

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
    setSaved(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await supabase.from('profiles').upsert({
      id: userId,
      email,
      name: form.name,
      age: form.age ? parseInt(form.age) : null,
      gender: form.gender,
      weight: form.weight ? parseFloat(form.weight) : null,
      height: form.height ? parseFloat(form.height) : null,
      goal: form.goal,
      activity_level: form.activity_level,
    })
    setSaving(false)
    setSaved(true)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  // Calculate KBZHU if data is available
  let kbzhu = null
  if (form.weight && form.height && form.age && form.gender) {
    const w = parseFloat(form.weight)
    const h = parseFloat(form.height)
    const a = parseInt(form.age)
    const bmr = form.gender === 'male' ? 10 * w + 6.25 * h - 5 * a + 5 : 10 * w + 6.25 * h - 5 * a - 161
    const multipliers: Record<string, number> = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 }
    const tdee = bmr * (multipliers[form.activity_level] ?? 1.55)
    const calories = form.goal === 'lose_weight' ? tdee - 500 : form.goal === 'gain_muscle' ? tdee + 300 : tdee
    const protein = w * (form.goal === 'gain_muscle' ? 2.2 : 1.8)
    const fat = calories * 0.25 / 9
    const carbs = (calories - protein * 4 - fat * 9) / 4
    kbzhu = { calories: Math.round(calories), protein: Math.round(protein), fat: Math.round(fat), carbs: Math.round(carbs) }
  }

  const selectClass = "w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-indigo-500 text-base"
  const inputClass = "w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 text-base"
  const labelClass = "text-zinc-400 text-sm mb-1 block"

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-4">
      <div>
        <p className="text-zinc-500 text-xs mb-3">{email}</p>
      </div>

      <div>
        <label className={labelClass}>Имя</label>
        <input className={inputClass} placeholder="Имя" value={form.name} onChange={e => update('name', e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Возраст</label>
          <input className={inputClass} type="number" placeholder="25" value={form.age} onChange={e => update('age', e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Пол</label>
          <select className={selectClass} value={form.gender} onChange={e => update('gender', e.target.value)}>
            <option value="male">Мужской</option>
            <option value="female">Женский</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Вес (кг)</label>
          <input className={inputClass} type="number" step="0.1" placeholder="75" value={form.weight} onChange={e => update('weight', e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Рост (см)</label>
          <input className={inputClass} type="number" placeholder="175" value={form.height} onChange={e => update('height', e.target.value)} />
        </div>
      </div>

      <div>
        <label className={labelClass}>Цель</label>
        <select className={selectClass} value={form.goal} onChange={e => update('goal', e.target.value)}>
          <option value="lose_weight">Похудеть</option>
          <option value="maintain">Поддерживать вес</option>
          <option value="gain_muscle">Набрать мышцы</option>
        </select>
      </div>

      <div>
        <label className={labelClass}>Активность</label>
        <select className={selectClass} value={form.activity_level} onChange={e => update('activity_level', e.target.value)}>
          <option value="sedentary">Сидячий образ жизни</option>
          <option value="light">Лёгкая активность (1-3 дня в неделю)</option>
          <option value="moderate">Средняя (3-5 дней)</option>
          <option value="active">Высокая (6-7 дней)</option>
          <option value="very_active">Очень высокая (2 раза в день)</option>
        </select>
      </div>

      {kbzhu && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <p className="text-white font-semibold mb-3">Твоя норма КБЖУ</p>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <p className="text-white font-bold text-lg">{kbzhu.calories}</p>
              <p className="text-zinc-500 text-xs">ккал</p>
            </div>
            <div>
              <p className="text-blue-400 font-bold text-lg">{kbzhu.protein}г</p>
              <p className="text-zinc-500 text-xs">белки</p>
            </div>
            <div>
              <p className="text-yellow-400 font-bold text-lg">{kbzhu.fat}г</p>
              <p className="text-zinc-500 text-xs">жиры</p>
            </div>
            <div>
              <p className="text-orange-400 font-bold text-lg">{kbzhu.carbs}г</p>
              <p className="text-zinc-500 text-xs">углеводы</p>
            </div>
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={saving}
        className="w-full py-3 rounded-xl bg-indigo-500 text-white font-semibold disabled:opacity-50"
      >
        {saving ? 'Сохраняю...' : saved ? 'Сохранено ✓' : 'Сохранить'}
      </button>

      <button
        type="button"
        onClick={handleLogout}
        className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-zinc-800 text-zinc-400 font-medium"
      >
        <LogOut className="w-4 h-4" />
        Выйти
      </button>
    </form>
  )
}
