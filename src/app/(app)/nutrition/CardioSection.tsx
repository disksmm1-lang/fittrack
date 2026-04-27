'use client'

import { useState } from 'react'
import { Plus, Flame, X, ChevronDown, Zap } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const ACTIVITIES = [
  { key: 'walking',       label: 'Ходьба',               icon: '🚶' },
  { key: 'walking_fast',  label: 'Быстрая ходьба',        icon: '🚶' },
  { key: 'running_slow',  label: 'Лёгкий бег',            icon: '🏃' },
  { key: 'running',       label: 'Бег',                   icon: '🏃' },
  { key: 'cycling',       label: 'Велосипед',             icon: '🚴' },
  { key: 'cycling_fast',  label: 'Велосипед (быстро)',    icon: '🚴' },
  { key: 'swimming',      label: 'Плавание',              icon: '🏊' },
  { key: 'swimming_fast', label: 'Плавание (интенсивно)', icon: '🏊' },
  { key: 'tennis',        label: 'Теннис',                icon: '🎾' },
  { key: 'football',      label: 'Футбол',                icon: '⚽' },
  { key: 'basketball',    label: 'Баскетбол',             icon: '🏀' },
  { key: 'volleyball',    label: 'Волейбол',              icon: '🏐' },
  { key: 'hiit',          label: 'ВИИТ',                  icon: '⚡' },
  { key: 'jump_rope',     label: 'Скакалка',              icon: '🪢' },
  { key: 'elliptical',    label: 'Эллипсоид',             icon: '🔄' },
  { key: 'dancing',       label: 'Танцы',                 icon: '💃' },
  { key: 'yoga',          label: 'Йога',                  icon: '🧘' },
  { key: 'stretching',    label: 'Растяжка',              icon: '🤸' },
  { key: 'hiking',        label: 'Поход/хайкинг',         icon: '🥾' },
  { key: 'skiing',        label: 'Лыжи',                  icon: '⛷️' },
  { key: 'rowing',        label: 'Гребля',                icon: '🚣' },
  { key: 'stairs',        label: 'Лестница',              icon: '🪜' },
]

interface CardioEntry {
  id: string
  activity_type: string
  duration_minutes: number
  calories_burned: number
}

interface Props {
  entries: CardioEntry[]
  today: string
  profileWeight: number | null
  bmr: number | null
  tdee: number | null
}

export default function CardioSection({ entries: initial, today, profileWeight, bmr, tdee }: Props) {
  const supabase = createClient()
  const router = useRouter()

  const [items, setItems] = useState(initial)
  const [showForm, setShowForm] = useState(false)
  const [activityType, setActivityType] = useState('walking')
  const [duration, setDuration] = useState('')
  const [calories, setCalories] = useState('')
  const [calcLoading, setCalcLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const totalBurned = items.reduce((s, e) => s + e.calories_burned, 0)

  async function calcCalories() {
    if (!duration) return
    setCalcLoading(true)
    const res = await fetch('/api/ai/calc-cardio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        activity_type: activityType,
        duration_minutes: Number(duration),
        weight_kg: profileWeight ?? 75,
      }),
    })
    const data = await res.json()
    if (data.calories_burned) setCalories(String(data.calories_burned))
    setCalcLoading(false)
  }

  async function save() {
    if (!duration || !calories) return
    setSaving(true)
    const newItem = {
      id: crypto.randomUUID(),
      activity_type: activityType,
      duration_minutes: Number(duration),
      calories_burned: Number(calories),
    }
    setItems(prev => [...prev, newItem])
    setShowForm(false)
    setDuration('')
    setCalories('')
    setActivityType('walking')
    setSaving(false)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('cardio_entries').insert({
      user_id: user.id,
      date: today,
      activity_type: newItem.activity_type,
      duration_minutes: newItem.duration_minutes,
      calories_burned: newItem.calories_burned,
    })
    router.refresh()
  }

  async function remove(id: string) {
    setItems(prev => prev.filter(e => e.id !== id))
    await supabase.from('cardio_entries').delete().eq('id', id)
    router.refresh()
  }

  const selectedActivity = ACTIVITIES.find(a => a.key === activityType)

  return (
    <div className="mb-3">
      <div className="bg-[#111] border border-white/[0.07] rounded-2xl overflow-hidden">
        {/* Заголовок */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.05]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-red-500/15 text-red-400 rounded-lg flex items-center justify-center">
              <Flame className="w-4 h-4" />
            </div>
            <span className="text-white font-semibold text-sm">Активность</span>
          </div>
          <div className="flex items-center gap-3">
            {totalBurned > 0 && (
              <span className="text-red-400 text-xs font-medium">−{totalBurned} ккал</span>
            )}
            <button
              onClick={() => setShowForm(v => !v)}
              className="w-7 h-7 bg-zinc-800 rounded-lg flex items-center justify-center"
            >
              <Plus className="w-3.5 h-3.5 text-zinc-400" />
            </button>
          </div>
        </div>

        {/* Расход калорий */}
        {(bmr || tdee) && (
          <div className="px-4 py-2 border-b border-white/[0.04] space-y-1.5">
            {bmr && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-zinc-700" />
                  <span className="text-zinc-600 text-xs">В покое (BMR)</span>
                </div>
                <span className="text-zinc-500 text-xs font-medium">{bmr} ккал</span>
              </div>
            )}
            {tdee && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-zinc-600" />
                  <span className="text-zinc-500 text-xs">С учётом образа жизни (TDEE)</span>
                </div>
                <span className="text-zinc-400 text-xs font-medium">{tdee} ккал</span>
              </div>
            )}
          </div>
        )}

        {/* Записи активности */}
        {items.map(entry => {
          const act = ACTIVITIES.find(a => a.key === entry.activity_type)
          return (
            <div key={entry.id} className="px-4 py-2.5 flex items-center justify-between border-b border-white/[0.04] last:border-0">
              <div className="flex items-center gap-2.5">
                <span className="text-base">{act?.icon ?? '🏃'}</span>
                <div>
                  <p className="text-white text-sm font-medium">{act?.label ?? entry.activity_type}</p>
                  <p className="text-zinc-600 text-xs">{entry.duration_minutes} мин</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-red-400 text-sm font-semibold">−{entry.calories_burned} ккал</span>
                <button
                  onClick={() => remove(entry.id)}
                  disabled={saving}
                  className="w-6 h-6 flex items-center justify-center text-zinc-700 hover:text-red-400 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )
        })}

        {/* Форма добавления */}
        {showForm && (
          <div className="px-4 py-3 border-t border-white/[0.06] space-y-3">
            {/* Выбор активности */}
            <div className="relative">
              <label className="text-zinc-500 text-xs mb-1.5 block">Вид активности</label>
              <div className="relative">
                <select
                  value={activityType}
                  onChange={e => { setActivityType(e.target.value); setCalories('') }}
                  className="w-full px-3 py-2.5 rounded-xl bg-zinc-800 border border-white/[0.07] text-white text-sm appearance-none focus:outline-none focus:border-red-500 pr-8"
                >
                  {ACTIVITIES.map(a => (
                    <option key={a.key} value={a.key}>{a.icon} {a.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
              </div>
            </div>

            {/* Продолжительность */}
            <div>
              <label className="text-zinc-500 text-xs mb-1.5 block">Продолжительность</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="number"
                    placeholder="30"
                    value={duration}
                    onChange={e => { setDuration(e.target.value); setCalories('') }}
                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-800 border border-white/[0.07] text-white text-sm focus:outline-none focus:border-red-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 text-xs">мин</span>
                </div>
                <button
                  onClick={calcCalories}
                  disabled={!duration || calcLoading}
                  className="px-3 py-2.5 rounded-xl bg-zinc-800 border border-white/[0.07] text-zinc-400 text-xs font-medium disabled:opacity-40 flex items-center gap-1.5 whitespace-nowrap hover:border-red-500/50 transition-colors"
                >
                  <Flame className="w-3.5 h-3.5 text-red-400" />
                  {calcLoading ? '...' : 'Рассчитать'}
                </button>
              </div>
            </div>

            {/* Ккал */}
            <div>
              <label className="text-zinc-500 text-xs mb-1.5 block">Сожжено ккал</label>
              <div className="relative">
                <input
                  type="number"
                  placeholder="Нажми «Рассчитать» или введи вручную"
                  value={calories}
                  onChange={e => setCalories(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-zinc-800 border border-white/[0.07] text-white text-sm focus:outline-none focus:border-red-500 pr-12"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 text-xs">ккал</span>
              </div>
              {calories && profileWeight && duration && (
                <p className="text-zinc-600 text-xs mt-1">
                  Расчёт по MET: {selectedActivity?.label}, {duration} мин, вес {profileWeight} кг
                </p>
              )}
            </div>

            {/* Кнопки */}
            <div className="flex gap-2">
              <button
                onClick={() => { setShowForm(false); setDuration(''); setCalories('') }}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 text-zinc-400 text-sm font-medium"
              >
                Отмена
              </button>
              <button
                onClick={save}
                disabled={!duration || !calories || saving}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold disabled:opacity-40"
              >
                {saving ? '...' : 'Добавить'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
