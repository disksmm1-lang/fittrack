'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Camera, Upload, Loader2 } from 'lucide-react'
import Link from 'next/link'

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Завтрак', lunch: 'Обед', dinner: 'Ужин', snack: 'Перекус',
}

export default function PhotoClient() {
  const router = useRouter()
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<{
    food_name: string; amount_grams: number; calories: number;
    protein_g: number; fat_g: number; carbs_g: number; comment?: string
  } | null>(null)
  const [mealType, setMealType] = useState('lunch')
  const [saving, setSaving] = useState(false)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async ev => {
      const dataUrl = ev.target?.result as string
      setPreview(dataUrl)
      setResult(null)
      setAnalyzing(true)
      const base64 = dataUrl.split(',')[1]
      const res = await fetch('/api/ai/analyze-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 }),
      })
      const data = await res.json()
      setResult(data)
      setAnalyzing(false)
    }
    reader.readAsDataURL(file)
  }

  async function handleSave() {
    if (!result) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const today = new Date().toISOString().split('T')[0]
    await supabase.from('food_entries').insert({
      user_id: user.id,
      date: today,
      meal_type: mealType,
      food_name: result.food_name,
      amount_grams: result.amount_grams,
      calories: result.calories,
      protein_g: result.protein_g,
      fat_g: result.fat_g,
      carbs_g: result.carbs_g,
    })
    router.push('/nutrition')
  }

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/nutrition" className="w-9 h-9 bg-zinc-900 rounded-xl flex items-center justify-center">
          <ArrowLeft className="w-5 h-5 text-white" />
        </Link>
        <h1 className="text-xl font-bold text-white">Фото еды</h1>
      </div>

      <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" />

      {!preview ? (
        <div className="flex flex-col gap-3">
          <button
            onClick={() => fileRef.current?.click()}
            className="flex flex-col items-center justify-center gap-3 bg-zinc-900 border-2 border-dashed border-zinc-700 rounded-2xl py-16"
          >
            <Camera className="w-12 h-12 text-zinc-600" />
            <p className="text-zinc-400 font-medium">Сфотографировать еду</p>
            <p className="text-zinc-600 text-sm">ИИ определит калорийность</p>
          </button>
          <button
            onClick={() => { if (fileRef.current) { fileRef.current.removeAttribute('capture'); fileRef.current.click() } }}
            className="flex items-center justify-center gap-2 bg-zinc-900 border border-zinc-800 rounded-2xl py-4 text-zinc-400"
          >
            <Upload className="w-5 h-5" />
            Выбрать из галереи
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Food" className="w-full rounded-2xl object-cover max-h-64" />

          {analyzing && (
            <div className="flex items-center justify-center gap-3 bg-zinc-900 border border-zinc-800 rounded-2xl py-6">
              <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
              <p className="text-zinc-300">Анализирую...</p>
            </div>
          )}

          {result && !analyzing && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-3">
              <p className="text-white font-semibold text-lg">{result.food_name}</p>
              {result.comment && <p className="text-zinc-500 text-sm">{result.comment}</p>}

              <div className="grid grid-cols-4 gap-2 text-center">
                <div>
                  <p className="text-white font-bold">{Math.round(result.calories)}</p>
                  <p className="text-zinc-500 text-xs">ккал</p>
                </div>
                <div>
                  <p className="text-blue-400 font-bold">{Math.round(result.protein_g)}г</p>
                  <p className="text-zinc-500 text-xs">белки</p>
                </div>
                <div>
                  <p className="text-yellow-400 font-bold">{Math.round(result.fat_g)}г</p>
                  <p className="text-zinc-500 text-xs">жиры</p>
                </div>
                <div>
                  <p className="text-orange-400 font-bold">{Math.round(result.carbs_g)}г</p>
                  <p className="text-zinc-500 text-xs">углеводы</p>
                </div>
              </div>

              <div>
                <label className="text-zinc-400 text-sm mb-1 block">Приём пищи</label>
                <select
                  className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white"
                  value={mealType}
                  onChange={e => setMealType(e.target.value)}
                >
                  {Object.entries(MEAL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-3 rounded-xl bg-green-600 text-white font-semibold disabled:opacity-50"
              >
                {saving ? 'Сохраняю...' : 'Добавить в дневник'}
              </button>
            </div>
          )}

          <button
            onClick={() => { setPreview(null); setResult(null) }}
            className="text-zinc-500 text-sm text-center py-2"
          >
            Сделать другое фото
          </button>
        </div>
      )}
    </div>
  )
}
