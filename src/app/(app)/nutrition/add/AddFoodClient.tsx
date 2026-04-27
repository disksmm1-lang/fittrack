'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Sparkles, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { awardXPAndShow } from '@/components/XPToast'

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Завтрак', lunch: 'Обед', dinner: 'Ужин', snack: 'Перекус',
}

function AddFoodForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()
  const defaultMeal = searchParams.get('meal') ?? 'breakfast'

  const [form, setForm] = useState({
    food_name: '',
    meal_type: defaultMeal,
    amount_grams: '100',
    calories: '',
    protein_g: '',
    fat_g: '',
    carbs_g: '',
  })
  const [saving, setSaving] = useState(false)
  const [calculating, setCalculating] = useState(false)

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function autoCalc() {
    if (!form.food_name.trim() || !form.amount_grams) return
    setCalculating(true)
    try {
      const res = await fetch('/api/ai/calc-food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ food_name: form.food_name, amount_grams: parseFloat(form.amount_grams) }),
      })
      const data = await res.json()
      if (data.calories != null) {
        setForm(prev => ({
          ...prev,
          calories: String(data.calories),
          protein_g: String(data.protein_g),
          fat_g: String(data.fat_g),
          carbs_g: String(data.carbs_g),
        }))
      }
    } catch { /* ignore */ }
    setCalculating(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const today = new Date().toISOString().split('T')[0]
    await supabase.from('food_entries').insert({
      user_id: user.id,
      date: today,
      meal_type: form.meal_type,
      food_name: form.food_name,
      amount_grams: parseFloat(form.amount_grams) || 100,
      calories: parseFloat(form.calories) || 0,
      protein_g: parseFloat(form.protein_g) || 0,
      fat_g: parseFloat(form.fat_g) || 0,
      carbs_g: parseFloat(form.carbs_g) || 0,
    })

    await awardXPAndShow('food_entry')
    router.push('/nutrition')
  }

  const inputClass = "w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 text-base"

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-4">
      <div>
        <label className="text-zinc-400 text-sm mb-1 block">Название продукта</label>
        <input
          className={inputClass}
          placeholder="Куриная грудка"
          value={form.food_name}
          onChange={e => update('food_name', e.target.value)}
          required
        />
      </div>

      <div>
        <label className="text-zinc-400 text-sm mb-1 block">Приём пищи</label>
        <select className={inputClass} value={form.meal_type} onChange={e => update('meal_type', e.target.value)}>
          {Object.entries(MEAL_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-zinc-400 text-sm mb-1 block">Количество (г)</label>
        <input
          className={inputClass}
          type="number"
          placeholder="100"
          value={form.amount_grams}
          onChange={e => update('amount_grams', e.target.value)}
          required
        />
      </div>

      <button
        type="button"
        onClick={autoCalc}
        disabled={calculating || !form.food_name.trim() || !form.amount_grams}
        className="w-full py-3 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-400 font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40 active:bg-purple-600/30 transition-colors"
      >
        {calculating ? (
          <><Loader2 className="w-4 h-4 animate-spin" />Считаю КБЖУ...</>
        ) : (
          <><Sparkles className="w-4 h-4" />Рассчитать КБЖУ автоматически</>
        )}
      </button>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-zinc-400 text-sm mb-1 block">Калории (ккал)</label>
          <input className={inputClass} type="number" step="0.1" placeholder="165" value={form.calories} onChange={e => update('calories', e.target.value)} required />
        </div>
        <div>
          <label className="text-zinc-400 text-sm mb-1 block">Белки (г)</label>
          <input className={inputClass} type="number" step="0.1" placeholder="31" value={form.protein_g} onChange={e => update('protein_g', e.target.value)} />
        </div>
        <div>
          <label className="text-zinc-400 text-sm mb-1 block">Жиры (г)</label>
          <input className={inputClass} type="number" step="0.1" placeholder="3.6" value={form.fat_g} onChange={e => update('fat_g', e.target.value)} />
        </div>
        <div>
          <label className="text-zinc-400 text-sm mb-1 block">Углеводы (г)</label>
          <input className={inputClass} type="number" step="0.1" placeholder="0" value={form.carbs_g} onChange={e => update('carbs_g', e.target.value)} />
        </div>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="w-full py-3 rounded-xl bg-green-600 text-white font-semibold disabled:opacity-50 mt-2"
      >
        {saving ? 'Сохраняю...' : 'Добавить'}
      </button>
    </form>
  )
}

export default function AddFoodClient() {
  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/nutrition" className="w-9 h-9 bg-zinc-900 rounded-xl flex items-center justify-center">
          <ArrowLeft className="w-5 h-5 text-white" />
        </Link>
        <h1 className="text-xl font-bold text-white">Добавить еду</h1>
      </div>
      <Suspense>
        <AddFoodForm />
      </Suspense>
    </div>
  )
}
