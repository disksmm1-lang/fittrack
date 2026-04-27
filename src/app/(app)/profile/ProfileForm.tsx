'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { LogOut, RefreshCw } from 'lucide-react'
import { calculateKBJU } from '@/lib/kbju'

interface Profile {
  id: string
  name?: string
  age?: number
  gender?: string
  weight?: number
  height?: number
  goal?: string
  body_fat?: number
  work_type?: string
  training_days?: number
  training_intensity?: string
  activity_level?: string
  experience?: string
  sleep_hours?: number
  stress_level?: string
  food_restrictions?: string
}

export default function ProfileForm({ profile, userId, email }: { profile: Profile | null; userId: string; email: string }) {
  const supabase = createClient()
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const [form, setForm] = useState({
    name: profile?.name ?? '',
    age: profile?.age?.toString() ?? '',
    gender: profile?.gender ?? 'male',
    weight: profile?.weight?.toString() ?? '',
    height: profile?.height?.toString() ?? '',
    goal: profile?.goal ?? 'maintain',
    body_fat: profile?.body_fat?.toString() ?? '',
    work_type: profile?.work_type ?? 'sedentary',
    training_days: profile?.training_days?.toString() ?? '3',
    training_intensity: profile?.training_intensity ?? 'moderate',
    experience: profile?.experience ?? 'beginner',
    sleep_hours: profile?.sleep_hours?.toString() ?? '',
    stress_level: profile?.stress_level ?? 'moderate',
    food_restrictions: profile?.food_restrictions ?? '',
  })

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
    setSaved(false)
  }

  const kbju = calculateKBJU({
    gender: form.gender,
    age: form.age ? parseInt(form.age) : null,
    weight: form.weight ? parseFloat(form.weight) : null,
    height: form.height ? parseFloat(form.height) : null,
    goal: form.goal,
    body_fat: form.body_fat ? parseFloat(form.body_fat) : null,
    work_type: form.work_type,
    training_days: form.training_days ? parseInt(form.training_days) : null,
    training_intensity: form.training_intensity,
  })

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const activityMap: Record<string, string> = {
      '0': 'sedentary', '1': 'sedentary', '2': 'light',
      '3': 'moderate', '4': 'moderate', '5': 'active', '6': 'active', '7': 'very_active',
    }
    await supabase.from('profiles').upsert({
      id: userId,
      email,
      name: form.name,
      age: form.age ? parseInt(form.age) : null,
      gender: form.gender,
      weight: form.weight ? parseFloat(form.weight) : null,
      height: form.height ? parseFloat(form.height) : null,
      goal: form.goal,
      body_fat: form.body_fat ? parseFloat(form.body_fat) : null,
      work_type: form.work_type,
      training_days: form.training_days ? parseInt(form.training_days) : null,
      training_intensity: form.training_intensity,
      experience: form.experience,
      sleep_hours: form.sleep_hours ? parseFloat(form.sleep_hours) : null,
      stress_level: form.stress_level,
      food_restrictions: form.food_restrictions || null,
      activity_level: activityMap[form.training_days] ?? 'moderate',
    })
    setSaving(false)
    setSaved(true)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  async function handleReOnboarding() {
    await supabase.from('profiles').update({ onboarding_completed: false }).eq('id', userId)
    router.push('/onboarding')
  }

  const sel = "w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-blue-500 text-sm"
  const inp = "w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 text-sm"
  const lbl = "text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-1.5 block"

  const GOAL_LABELS: Record<string, string> = {
    lose_weight: 'Похудеть',
    maintain: 'Поддерживать вес',
    gain_muscle: 'Набрать мышцы',
    recomposition: 'Рекомпозиция тела',
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-4">
      <p className="text-zinc-600 text-xs">{email}</p>

      <div>
        <label className={lbl}>Имя</label>
        <input className={inp} placeholder="Имя" value={form.name} onChange={e => update('name', e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lbl}>Возраст</label>
          <input className={inp} type="number" placeholder="25" value={form.age} onChange={e => update('age', e.target.value)} />
        </div>
        <div>
          <label className={lbl}>Пол</label>
          <select className={sel} value={form.gender} onChange={e => update('gender', e.target.value)}>
            <option value="male">Мужской</option>
            <option value="female">Женский</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lbl}>Вес (кг)</label>
          <input className={inp} type="number" step="0.1" placeholder="75" value={form.weight} onChange={e => update('weight', e.target.value)} />
        </div>
        <div>
          <label className={lbl}>Рост (см)</label>
          <input className={inp} type="number" placeholder="175" value={form.height} onChange={e => update('height', e.target.value)} />
        </div>
      </div>

      <div>
        <label className={lbl}>Цель</label>
        <select className={sel} value={form.goal} onChange={e => update('goal', e.target.value)}>
          {Object.entries(GOAL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <div>
        <label className={lbl}>Работа</label>
        <select className={sel} value={form.work_type} onChange={e => update('work_type', e.target.value)}>
          <option value="sedentary">Сидячая (офис, водитель)</option>
          <option value="standing">На ногах (магазин, больница)</option>
          <option value="physical">Физический труд</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lbl}>Тренировок в неделю</label>
          <select className={sel} value={form.training_days} onChange={e => update('training_days', e.target.value)}>
            {[0,1,2,3,4,5,6,7].map(n => <option key={n} value={n}>{n} {n === 0 ? '(нет)' : n === 7 ? '(каждый день)' : ''}</option>)}
          </select>
        </div>
        <div>
          <label className={lbl}>Интенсивность</label>
          <select className={sel} value={form.training_intensity} onChange={e => update('training_intensity', e.target.value)}>
            <option value="light">Лёгкая</option>
            <option value="moderate">Умеренная</option>
            <option value="intense">Интенсивная</option>
          </select>
        </div>
      </div>

      {/* Advanced toggle */}
      <button
        type="button"
        onClick={() => setShowAdvanced(v => !v)}
        className="text-zinc-500 text-xs text-left py-1 flex items-center gap-1"
      >
        {showAdvanced ? '▲' : '▼'} Дополнительные параметры (точнее расчёт)
      </button>

      {showAdvanced && (
        <div className="flex flex-col gap-4 bg-zinc-900/50 rounded-2xl p-4 border border-white/[0.05]">
          <div>
            <label className={lbl}>% жира в теле (если знаешь)</label>
            <input className={inp} type="number" step="0.1" placeholder="Напр. 18" value={form.body_fat} onChange={e => update('body_fat', e.target.value)} />
            <p className="text-zinc-600 text-xs mt-1">Если указан — используется более точная формула Katch-McArdle</p>
          </div>
          <div>
            <label className={lbl}>Опыт тренировок</label>
            <select className={sel} value={form.experience} onChange={e => update('experience', e.target.value)}>
              <option value="beginner">Новичок (до 1 года)</option>
              <option value="intermediate">Средний (1–3 года)</option>
              <option value="advanced">Опытный (3+ лет)</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Сон (часов)</label>
              <input className={inp} type="number" step="0.5" placeholder="7.5" value={form.sleep_hours} onChange={e => update('sleep_hours', e.target.value)} />
            </div>
            <div>
              <label className={lbl}>Уровень стресса</label>
              <select className={sel} value={form.stress_level} onChange={e => update('stress_level', e.target.value)}>
                <option value="low">Низкий</option>
                <option value="moderate">Умеренный</option>
                <option value="high">Высокий</option>
              </select>
            </div>
          </div>
          <div>
            <label className={lbl}>Ограничения в питании</label>
            <input className={inp} placeholder="Аллергии, вегетарианство..." value={form.food_restrictions} onChange={e => update('food_restrictions', e.target.value)} />
          </div>
        </div>
      )}

      {/* КБЖУ */}
      {kbju && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-white font-semibold text-sm">Твоя норма КБЖУ</p>
            <span className="text-zinc-600 text-xs">TDEE {kbju.tdee} ккал</span>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="bg-zinc-800/60 rounded-xl py-2.5">
              <p className="text-white font-bold text-lg leading-none">{kbju.calories}</p>
              <p className="text-zinc-500 text-xs mt-1">ккал</p>
            </div>
            <div className="bg-blue-500/10 rounded-xl py-2.5">
              <p className="text-blue-400 font-bold text-lg leading-none">{kbju.protein}</p>
              <p className="text-zinc-500 text-xs mt-1">белки, г</p>
            </div>
            <div className="bg-yellow-500/10 rounded-xl py-2.5">
              <p className="text-yellow-400 font-bold text-lg leading-none">{kbju.fat}</p>
              <p className="text-zinc-500 text-xs mt-1">жиры, г</p>
            </div>
            <div className="bg-orange-500/10 rounded-xl py-2.5">
              <p className="text-orange-400 font-bold text-lg leading-none">{kbju.carbs}</p>
              <p className="text-zinc-500 text-xs mt-1">углев., г</p>
            </div>
          </div>
          {form.body_fat && <p className="text-zinc-600 text-xs mt-2 text-center">Формула Katch-McArdle (% жира учтён)</p>}
        </div>
      )}

      <button type="submit" disabled={saving} className="w-full py-3.5 rounded-xl bg-blue-600 text-white font-semibold disabled:opacity-50">
        {saving ? 'Сохраняю...' : saved ? '✓ Сохранено' : 'Сохранить'}
      </button>

      <button
        type="button"
        onClick={handleReOnboarding}
        className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-zinc-800 text-zinc-500 text-sm font-medium"
      >
        <RefreshCw className="w-4 h-4" />
        Пройти опрос заново
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
