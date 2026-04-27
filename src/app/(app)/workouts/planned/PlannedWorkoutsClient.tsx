'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ArrowLeft, Plus, Sparkles, Trash2, Calendar, Dumbbell, ChevronDown, ChevronUp, X, Loader2 } from 'lucide-react'

interface PlannedExercise {
  id?: string
  exercise_name: string
  muscle_group: string
  sets: number
  reps: string
  weight_kg: string
  notes: string
  order_index: number
}

interface PlannedWorkout {
  id: string
  name: string
  description: string | null
  scheduled_date: string | null
  planned_workout_exercises: PlannedExercise[]
}

export default function PlannedWorkoutsClient({
  initialPlanned,
  userId,
}: {
  initialPlanned: PlannedWorkout[]
  userId: string
}) {
  const router = useRouter()
  const supabase = createClient()

  const [planned, setPlanned] = useState<PlannedWorkout[]>(initialPlanned)
  const [showCreate, setShowCreate] = useState(false)
  const [showAI, setShowAI] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  // Manual create form
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newDate, setNewDate] = useState('')
  const [newExercises, setNewExercises] = useState<PlannedExercise[]>([])
  const [saving, setSaving] = useState(false)

  // AI form
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiPreview, setAiPreview] = useState<Omit<PlannedWorkout, 'id' | 'scheduled_date'> | null>(null)
  const [aiDate, setAiDate] = useState('')

  function addExerciseRow() {
    setNewExercises(prev => [...prev, {
      exercise_name: '', muscle_group: '', sets: 3, reps: '10', weight_kg: '', notes: '', order_index: prev.length,
    }])
  }

  function updateExercise(idx: number, field: keyof PlannedExercise, value: string | number) {
    setNewExercises(prev => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e))
  }

  async function saveManual() {
    if (!newName.trim() || newExercises.length === 0) return
    setSaving(true)
    const { data: pw } = await supabase.from('planned_workouts').insert({
      user_id: userId,
      name: newName.trim(),
      description: newDesc.trim() || null,
      scheduled_date: newDate || null,
    }).select().single()

    if (pw) {
      await supabase.from('planned_workout_exercises').insert(
        newExercises.map((e, i) => ({ ...e, planned_workout_id: pw.id, order_index: i }))
      )
      setPlanned(prev => [...prev, { ...pw, planned_workout_exercises: newExercises }])
    }

    setShowCreate(false)
    setNewName(''); setNewDesc(''); setNewDate(''); setNewExercises([])
    setSaving(false)
  }

  async function generateAI() {
    if (!aiPrompt.trim()) return
    setAiLoading(true)
    setAiPreview(null)
    try {
      const res = await fetch('/api/ai/plan-workout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt }),
      })
      const data = await res.json()
      setAiPreview(data)
    } catch {
      alert('Ошибка генерации. Попробуй ещё раз.')
    }
    setAiLoading(false)
  }

  async function saveAIPlan() {
    if (!aiPreview) return
    setSaving(true)
    const { data: pw } = await supabase.from('planned_workouts').insert({
      user_id: userId,
      name: aiPreview.name,
      description: aiPreview.description || null,
      scheduled_date: aiDate || null,
    }).select().single()

    if (pw) {
      await supabase.from('planned_workout_exercises').insert(
        aiPreview.planned_workout_exercises.map((e, i) => ({
          planned_workout_id: pw.id,
          exercise_name: e.exercise_name,
          muscle_group: e.muscle_group,
          sets: e.sets,
          reps: e.reps,
          weight_kg: e.weight_kg,
          notes: e.notes,
          order_index: i,
        }))
      )
      setPlanned(prev => [...prev, { ...pw, planned_workout_exercises: aiPreview.planned_workout_exercises }])
    }

    setShowAI(false)
    setAiPrompt(''); setAiPreview(null); setAiDate('')
    setSaving(false)
  }

  async function deletePlanned(id: string) {
    await supabase.from('planned_workouts').delete().eq('id', id)
    setPlanned(prev => prev.filter(p => p.id !== id))
  }

  const inputClass = "w-full px-4 py-3 rounded-xl bg-zinc-800 border border-white/[0.07] text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 text-sm"
  const smallInputClass = "px-3 py-2 rounded-lg bg-zinc-800 border border-white/[0.07] text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 text-sm w-full"

  return (
    <div className="px-4 pt-6 pb-8 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/workouts" className="w-10 h-10 bg-[#111] border border-white/[0.07] rounded-xl flex items-center justify-center flex-shrink-0">
          <ArrowLeft className="w-5 h-5 text-white" />
        </Link>
        <h1 className="text-xl font-bold text-white flex-1">Запланированные</h1>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <button
          onClick={() => { setShowCreate(true); setShowAI(false) }}
          className="flex items-center justify-center gap-2 bg-[#111] border border-white/[0.07] rounded-2xl py-3.5 text-white font-semibold text-sm"
        >
          <Plus className="w-4 h-4 text-blue-400" />
          Создать вручную
        </button>
        <button
          onClick={() => { setShowAI(true); setShowCreate(false) }}
          className="flex items-center justify-center gap-2 bg-purple-600 rounded-2xl py-3.5 text-white font-semibold text-sm"
        >
          <Sparkles className="w-4 h-4" />
          Составить с ИИ
        </button>
      </div>

      {/* Manual create form */}
      {showCreate && (
        <div className="bg-[#111] border border-white/[0.07] rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-white font-bold">Новая тренировка</p>
            <button onClick={() => setShowCreate(false)}><X className="w-5 h-5 text-zinc-500" /></button>
          </div>
          <div className="flex flex-col gap-3">
            <input className={inputClass} placeholder="Название тренировки" value={newName} onChange={e => setNewName(e.target.value)} />
            <input className={inputClass} placeholder="Описание (необязательно)" value={newDesc} onChange={e => setNewDesc(e.target.value)} />
            <input className={inputClass} type="date" value={newDate} onChange={e => setNewDate(e.target.value)} />

            {newExercises.length > 0 && (
              <div className="flex flex-col gap-2 mt-1">
                <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Упражнения</p>
                {newExercises.map((ex, i) => (
                  <div key={i} className="bg-zinc-900 rounded-xl p-3 flex flex-col gap-2">
                    <div className="flex gap-2">
                      <input className={smallInputClass} placeholder="Упражнение" value={ex.exercise_name} onChange={e => updateExercise(i, 'exercise_name', e.target.value)} />
                      <button onClick={() => setNewExercises(prev => prev.filter((_, j) => j !== i))} className="text-zinc-600 flex-shrink-0">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <input className={smallInputClass} placeholder="Подходы" type="number" value={ex.sets} onChange={e => updateExercise(i, 'sets', parseInt(e.target.value) || 0)} />
                      <input className={smallInputClass} placeholder="Повторы" value={ex.reps} onChange={e => updateExercise(i, 'reps', e.target.value)} />
                      <input className={smallInputClass} placeholder="Вес кг" value={ex.weight_kg} onChange={e => updateExercise(i, 'weight_kg', e.target.value)} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button onClick={addExerciseRow} className="w-full py-2.5 rounded-xl border border-dashed border-zinc-700 text-zinc-500 text-sm flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" /> Добавить упражнение
            </button>

            <button
              onClick={saveManual}
              disabled={saving || !newName.trim() || newExercises.length === 0}
              className="w-full py-3.5 rounded-xl bg-blue-600 text-white font-bold disabled:opacity-40"
            >
              {saving ? 'Сохраняю...' : 'Сохранить'}
            </button>
          </div>
        </div>
      )}

      {/* AI form */}
      {showAI && (
        <div className="bg-[#111] border border-white/[0.07] rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <p className="text-white font-bold">ИИ составит план</p>
            </div>
            <button onClick={() => { setShowAI(false); setAiPreview(null) }}><X className="w-5 h-5 text-zinc-500" /></button>
          </div>

          {!aiPreview ? (
            <div className="flex flex-col gap-3">
              <textarea
                className={inputClass + ' resize-none h-24'}
                placeholder="Опиши что хочешь. Например: силовая на грудь и трицепс, средний уровень, есть штанга и гантели"
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
              />
              <button
                onClick={generateAI}
                disabled={aiLoading || !aiPrompt.trim()}
                className="w-full py-3.5 rounded-xl bg-purple-600 text-white font-bold disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {aiLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Генерирую...</> : <><Sparkles className="w-4 h-4" /> Составить план</>}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="bg-purple-600/10 border border-purple-600/20 rounded-xl p-3">
                <p className="text-white font-bold">{aiPreview.name}</p>
                {aiPreview.description && <p className="text-zinc-400 text-sm mt-1">{aiPreview.description}</p>}
              </div>

              <div className="flex flex-col gap-2">
                {aiPreview.planned_workout_exercises.map((ex, i) => (
                  <div key={i} className="bg-zinc-900 rounded-xl px-4 py-3">
                    <div className="flex items-center justify-between">
                      <p className="text-white font-medium text-sm">{ex.exercise_name}</p>
                      <span className="text-zinc-600 text-xs">{ex.muscle_group}</span>
                    </div>
                    <p className="text-zinc-500 text-xs mt-1">
                      {ex.sets} подх. × {ex.reps} повт.{ex.weight_kg ? ` · ${ex.weight_kg} кг` : ''}
                    </p>
                    {ex.notes && <p className="text-zinc-600 text-xs mt-0.5 italic">{ex.notes}</p>}
                  </div>
                ))}
              </div>

              <input
                className={inputClass}
                type="date"
                placeholder="Дата (необязательно)"
                value={aiDate}
                onChange={e => setAiDate(e.target.value)}
              />

              <div className="flex gap-2">
                <button onClick={() => setAiPreview(null)} className="flex-1 py-3 rounded-xl bg-zinc-800 text-zinc-300 font-semibold text-sm">
                  Перегенерировать
                </button>
                <button
                  onClick={saveAIPlan}
                  disabled={saving}
                  className="flex-1 py-3 rounded-xl bg-purple-600 text-white font-bold text-sm disabled:opacity-40"
                >
                  {saving ? 'Сохраняю...' : 'Сохранить план'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Planned workouts list */}
      {planned.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <div className="w-16 h-16 bg-zinc-800/80 rounded-2xl flex items-center justify-center mb-4">
            <Calendar className="w-8 h-8 text-zinc-600" />
          </div>
          <p className="text-white font-semibold">Нет запланированных тренировок</p>
          <p className="text-zinc-500 text-sm mt-1">Создай сам или попроси ИИ</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {planned.map(pw => (
            <div key={pw.id} className="bg-[#111] border border-white/[0.07] rounded-2xl overflow-hidden">
              <div
                className="flex items-center justify-between px-4 py-3.5 cursor-pointer"
                onClick={() => setExpanded(expanded === pw.id ? null : pw.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-blue-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Dumbbell className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-white font-semibold">{pw.name}</p>
                    {pw.scheduled_date ? (
                      <p className="text-zinc-500 text-xs">
                        {new Date(pw.scheduled_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'short' })}
                      </p>
                    ) : (
                      <p className="text-zinc-600 text-xs">Дата не указана</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-600 text-xs">{pw.planned_workout_exercises.length} упр.</span>
                  <button
                    onClick={e => { e.stopPropagation(); deletePlanned(pw.id) }}
                    className="w-7 h-7 flex items-center justify-center text-zinc-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  {expanded === pw.id ? <ChevronUp className="w-4 h-4 text-zinc-600" /> : <ChevronDown className="w-4 h-4 text-zinc-600" />}
                </div>
              </div>

              {expanded === pw.id && (
                <div className="border-t border-white/[0.05] px-4 pb-4 pt-3">
                  {pw.description && (
                    <p className="text-zinc-400 text-sm mb-3 italic">{pw.description}</p>
                  )}
                  <div className="flex flex-col gap-2">
                    {[...pw.planned_workout_exercises]
                      .sort((a, b) => a.order_index - b.order_index)
                      .map((ex, i) => (
                        <div key={i} className="flex items-start justify-between py-2 border-b border-white/[0.04] last:border-0">
                          <div>
                            <p className="text-white text-sm font-medium">{ex.exercise_name}</p>
                            {ex.muscle_group && <p className="text-zinc-600 text-xs">{ex.muscle_group}</p>}
                            {ex.notes && <p className="text-zinc-600 text-xs italic mt-0.5">{ex.notes}</p>}
                          </div>
                          <div className="text-right flex-shrink-0 ml-4">
                            <p className="text-white text-sm font-semibold">{ex.sets} × {ex.reps}</p>
                            {ex.weight_kg && <p className="text-zinc-500 text-xs">{ex.weight_kg} кг</p>}
                          </div>
                        </div>
                      ))}
                  </div>
                  <Link
                    href={`/workouts/new?planned_id=${pw.id}`}
                    className="mt-3 w-full py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm flex items-center justify-center gap-2"
                  >
                    <Dumbbell className="w-4 h-4" />
                    Начать тренировку
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
