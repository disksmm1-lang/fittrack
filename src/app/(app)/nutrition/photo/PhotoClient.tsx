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
    protein_g: number; fat_g: number; carbs_g: number;
    ingredients?: string; confidence?: string; comment?: string
  } | null>(null)
  const [customGrams, setCustomGrams] = useState('')
  const [mealType, setMealType] = useState('lunch')
  const [saving, setSaving] = useState(false)
  const [description, setDescription] = useState('')

  const [pendingBase64, setPendingBase64] = useState<string | null>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const dataUrl = ev.target?.result as string
      // Ресайз до 1024px по длинной стороне перед отправкой в ИИ
      const img = new Image()
      img.onload = () => {
        const MAX = 1024
        let { width, height } = img
        if (width > MAX || height > MAX) {
          if (width > height) { height = Math.round(height * MAX / width); width = MAX }
          else { width = Math.round(width * MAX / height); height = MAX }
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
        const resized = canvas.toDataURL('image/jpeg', 0.85)
        setPreview(resized)
        setResult(null)
        setDescription('')
        setPendingBase64(resized.split(',')[1] ?? null)
      }
      img.src = dataUrl
    }
    reader.readAsDataURL(file)
  }

  async function analyze() {
    if (!pendingBase64) return
    setAnalyzing(true)
    const res = await fetch('/api/ai/analyze-photo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: pendingBase64, description }),
    })
    const text = await res.text()
    try {
      const data = JSON.parse(text)
      if (data.error) {
        alert('Ошибка анализа: ' + (data.error ?? 'неизвестная ошибка') + '\n' + (data.raw ?? ''))
      } else {
        setResult(data)
        setCustomGrams(String(data.amount_grams ?? ''))
      }
    } catch {
      alert('Ошибка сервера. Ответ: ' + text.slice(0, 200))
    }
    setAnalyzing(false)
  }

  // Recalculate macros based on custom grams
  const grams = parseFloat(customGrams) || result?.amount_grams || 0
  const ratio = result ? grams / (result.amount_grams || grams) : 1
  const adjusted = result ? {
    calories: Math.round(result.calories * ratio),
    protein_g: Math.round(result.protein_g * ratio * 10) / 10,
    fat_g: Math.round(result.fat_g * ratio * 10) / 10,
    carbs_g: Math.round(result.carbs_g * ratio * 10) / 10,
  } : null

  async function handleSave() {
    if (!result || !adjusted) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const today = new Date().toISOString().split('T')[0]
    await supabase.from('food_entries').insert({
      user_id: user.id,
      date: today,
      meal_type: mealType,
      food_name: result.food_name,
      amount_grams: grams,
      calories: adjusted.calories,
      protein_g: adjusted.protein_g,
      fat_g: adjusted.fat_g,
      carbs_g: adjusted.carbs_g,
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
          <img src={preview} alt="Food" className="w-full rounded-2xl object-contain" />

          {!result && !analyzing && (
            <div className="bg-[#111] border border-white/[0.07] rounded-2xl p-4 flex flex-col gap-3">
              <div>
                <label className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-2 block">
                  Что на тарелке? (необязательно, но повышает точность)
                </label>
                <input
                  className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-white/[0.07] text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 text-sm"
                  placeholder="Например: гречка с куриной грудкой, 300г"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
              </div>
              <button
                onClick={analyze}
                className="w-full py-3.5 rounded-xl bg-green-600 text-white font-bold flex items-center justify-center gap-2"
              >
                <Camera className="w-4 h-4" />
                Определить КБЖУ
              </button>
            </div>
          )}

          {analyzing && (
            <div className="flex items-center justify-center gap-3 bg-[#111] border border-white/[0.07] rounded-2xl py-6">
              <Loader2 className="w-6 h-6 text-green-400 animate-spin" />
              <p className="text-zinc-300">Анализирую...</p>
            </div>
          )}

          {result && !analyzing && adjusted && (
            <div className="bg-[#111] border border-white/[0.07] rounded-2xl p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <p className="text-white font-bold text-lg leading-tight flex-1">{result.food_name}</p>
                {result.confidence && (
                  <span className={`text-xs font-semibold px-2 py-1 rounded-lg ml-2 flex-shrink-0 ${
                    result.confidence === 'high' ? 'bg-green-500/20 text-green-400' :
                    result.confidence === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {result.confidence === 'high' ? 'Точно' : result.confidence === 'medium' ? 'Примерно' : 'Неточно'}
                  </span>
                )}
              </div>

              {result.ingredients && (
                <p className="text-zinc-500 text-xs leading-relaxed">
                  <span className="text-zinc-600 font-medium">Состав: </span>{result.ingredients}
                </p>
              )}
              {result.comment && (
                <p className="text-zinc-600 text-xs italic">{result.comment}</p>
              )}

              {/* Editable weight */}
              <div className="bg-zinc-800/60 rounded-xl p-3">
                <label className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-2 block">
                  Вес порции — уточни если знаешь точнее
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={customGrams}
                    onChange={e => setCustomGrams(e.target.value)}
                    className="flex-1 bg-zinc-800 border border-white/[0.07] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                  <span className="text-zinc-500 text-sm">г</span>
                </div>
              </div>

              {/* Macros */}
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="bg-zinc-800/40 rounded-xl py-2">
                  <p className="text-white font-bold text-lg leading-none">{adjusted.calories}</p>
                  <p className="text-zinc-500 text-xs mt-1">ккал</p>
                </div>
                <div className="bg-blue-500/10 rounded-xl py-2">
                  <p className="text-blue-400 font-bold text-lg leading-none">{adjusted.protein_g}</p>
                  <p className="text-zinc-500 text-xs mt-1">белки</p>
                </div>
                <div className="bg-yellow-500/10 rounded-xl py-2">
                  <p className="text-yellow-400 font-bold text-lg leading-none">{adjusted.fat_g}</p>
                  <p className="text-zinc-500 text-xs mt-1">жиры</p>
                </div>
                <div className="bg-orange-500/10 rounded-xl py-2">
                  <p className="text-orange-400 font-bold text-lg leading-none">{adjusted.carbs_g}</p>
                  <p className="text-zinc-500 text-xs mt-1">углеводы</p>
                </div>
              </div>

              <div>
                <label className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-2 block">Приём пищи</label>
                <select
                  className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-white/[0.07] text-white focus:outline-none"
                  value={mealType}
                  onChange={e => setMealType(e.target.value)}
                >
                  {Object.entries(MEAL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-3.5 rounded-xl bg-green-600 text-white font-bold disabled:opacity-50"
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
