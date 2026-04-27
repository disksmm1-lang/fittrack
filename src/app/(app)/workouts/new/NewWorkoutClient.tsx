'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Plus, Trash2, ChevronDown, ChevronUp, X, Check } from 'lucide-react'
import { awardXPAndShow } from '@/components/XPToast'
import Link from 'next/link'
import type { Exercise } from '@/types'

interface SetForm {
  id?: string
  weight_kg: string
  reps: string
}

interface ExerciseForm {
  weId?: string
  exercise_id: string
  exercise_name: string
  sets: SetForm[]
  expanded: boolean
}

const MUSCLE_GROUPS = ['Грудь', 'Спина', 'Ноги', 'Плечи', 'Бицепс', 'Трицепс', 'Пресс', 'Другое']

interface PlannedTemplate {
  name: string
  exercises: {
    exercise_name: string
    muscle_group: string
    sets: number
    reps: string
    weight_kg: string
  }[]
}

export default function NewWorkoutClient({ plannedTemplate }: { plannedTemplate?: PlannedTemplate | null }) {
  const router = useRouter()
  const supabase = createClient()

  const [name, setName] = useState(
    plannedTemplate?.name ?? `Тренировка ${new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}`
  )
  const [exercises, setExercises] = useState<ExerciseForm[]>([])
  const [allExercises, setAllExercises] = useState<Exercise[]>([])
  const [showPicker, setShowPicker] = useState(false)
  const [search, setSearch] = useState('')
  const [finishing, setFinishing] = useState(false)
  const [initDone, setInitDone] = useState(false)

  const [showCreate, setShowCreate] = useState(false)
  const [newExName, setNewExName] = useState('')
  const [newExGroup, setNewExGroup] = useState('Другое')
  const [newExEquipment, setNewExEquipment] = useState('')
  const [creating, setCreating] = useState(false)

  const workoutIdRef = useRef<string | null>(null)
  const startTimeRef = useRef<Date>(new Date())
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  useEffect(() => {
    initWorkout()
  }, [])

  useEffect(() => {
    if (!initDone) return
    if (!plannedTemplate || allExercises.length === 0) return
    buildExercisesFromTemplate()
  }, [allExercises, initDone])

  async function initWorkout() {
    const [{ data: { user } }, { data: exList }] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from('exercises').select('*').order('muscle_group'),
    ])
    if (!user) return

    const today = new Date()
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

    const { data: workout } = await supabase
      .from('workouts')
      .insert({ user_id: user.id, date: dateStr, name: name.trim() })
      .select()
      .single()

    if (workout) workoutIdRef.current = workout.id
    if (exList) setAllExercises(exList as Exercise[])
    setInitDone(true)
  }

  async function buildExercisesFromTemplate() {
    if (!plannedTemplate || !workoutIdRef.current) return
    const built: ExerciseForm[] = []

    for (const tEx of plannedTemplate.exercises) {
      let found = allExercises.find(e =>
        e.name.toLowerCase() === tEx.exercise_name.toLowerCase()
      )
      if (!found) {
        const { data: created } = await supabase.from('exercises').insert({
          name: tEx.exercise_name,
          muscle_group: tEx.muscle_group || 'Другое',
          equipment: null,
        }).select().single()
        if (created) {
          found = created as Exercise
          setAllExercises(prev => [...prev, found!])
        }
      }
      if (!found) continue

      const { data: we } = await supabase.from('workout_exercises').insert({
        workout_id: workoutIdRef.current,
        exercise_id: found.id,
        order: built.length,
      }).select().single()
      if (!we) continue

      const setsCount = typeof tEx.sets === 'number' ? tEx.sets : 3
      const sets: SetForm[] = await Promise.all(
        Array.from({ length: setsCount }, async (_, j) => {
          const { data: s } = await supabase.from('workout_sets').insert({
            workout_exercise_id: we.id,
            set_number: j + 1,
            weight_kg: tEx.weight_kg ? parseFloat(tEx.weight_kg) : null,
            reps: null,
            completed: false,
          }).select().single()
          return { id: s?.id, weight_kg: tEx.weight_kg ?? '', reps: '' }
        })
      )

      built.push({ weId: we.id, exercise_id: found.id, exercise_name: found.name, sets, expanded: true })
    }

    setExercises(built)
  }

  async function loadExercises() {
    const { data } = await supabase.from('exercises').select('*').order('muscle_group')
    if (data) setAllExercises(data as Exercise[])
  }

  async function addExercise(ex: Exercise) {
    if (!workoutIdRef.current) return
    const { data: we } = await supabase.from('workout_exercises').insert({
      workout_id: workoutIdRef.current,
      exercise_id: ex.id,
      order: exercises.length,
    }).select().single()
    if (!we) return

    const { data: s } = await supabase.from('workout_sets').insert({
      workout_exercise_id: we.id,
      set_number: 1,
      weight_kg: null,
      reps: null,
      completed: false,
    }).select().single()

    setExercises(prev => [...prev, {
      weId: we.id,
      exercise_id: ex.id,
      exercise_name: ex.name,
      sets: [{ id: s?.id, weight_kg: '', reps: '' }],
      expanded: true,
    }])
    setShowPicker(false)
    setShowCreate(false)
    setSearch('')
  }

  async function createAndAdd() {
    if (!newExName.trim()) return
    setCreating(true)
    const { data: ex } = await supabase.from('exercises').insert({
      name: newExName.trim(),
      muscle_group: newExGroup,
      equipment: newExEquipment.trim() || null,
    }).select().single()
    if (ex) { await loadExercises(); await addExercise(ex as Exercise) }
    setNewExName(''); setNewExEquipment(''); setNewExGroup('Другое')
    setCreating(false)
  }

  async function addSet(exIdx: number) {
    const ex = exercises[exIdx]
    if (!ex?.weId) return

    const newSetNumber = ex.sets.length + 1
    const lastSet = ex.sets[ex.sets.length - 1]
    const { data: s } = await supabase.from('workout_sets').insert({
      workout_exercise_id: ex.weId,
      set_number: newSetNumber,
      weight_kg: lastSet?.weight_kg ? parseFloat(lastSet.weight_kg) : null,
      reps: null,
      completed: false,
    }).select().single()

    setExercises(prev => prev.map((e, i) => i === exIdx
      ? { ...e, sets: [...e.sets, { id: s?.id, weight_kg: lastSet?.weight_kg ?? '', reps: '' }] }
      : e
    ))
  }

  async function removeExercise(exIdx: number) {
    const ex = exercises[exIdx]
    if (ex?.weId) {
      await supabase.from('workout_exercises').delete().eq('id', ex.weId)
    }
    setExercises(prev => prev.filter((_, i) => i !== exIdx))
  }

  const scheduleSetSave = useCallback((setId: string, weId: string, weight_kg: string, reps: string) => {
    if (saveTimers.current[setId]) clearTimeout(saveTimers.current[setId])
    saveTimers.current[setId] = setTimeout(async () => {
      await supabase.from('workout_sets').update({
        weight_kg: weight_kg ? parseFloat(weight_kg) : null,
        reps: reps ? parseInt(reps) : null,
        completed: !!(weight_kg || reps),
      }).eq('id', setId)
    }, 600)
  }, [])

  function updateSet(exIdx: number, setIdx: number, field: keyof SetForm, value: string) {
    setExercises(prev => {
      const updated = prev.map((e, i) => i === exIdx
        ? { ...e, sets: e.sets.map((s, j) => j === setIdx ? { ...s, [field]: value } : s) }
        : e
      )
      const updatedEx = updated[exIdx]
      const updatedSet = updatedEx?.sets[setIdx]
      if (updatedSet?.id) {
        scheduleSetSave(updatedSet.id, updatedEx!.weId!, updatedSet.weight_kg, updatedSet.reps)
      }
      return updated
    })
  }

  async function handleFinish() {
    if (!workoutIdRef.current) return
    setFinishing(true)
    const durationMinutes = Math.round((Date.now() - startTimeRef.current.getTime()) / 60000)
    await supabase.from('workouts').update({
      name: name.trim(),
      duration_minutes: durationMinutes > 0 ? durationMinutes : null,
    }).eq('id', workoutIdRef.current)
    await awardXPAndShow('workout_complete')
    router.push('/workouts')
  }

  async function handleDiscard() {
    if (workoutIdRef.current) {
      await supabase.from('workouts').delete().eq('id', workoutIdRef.current)
    }
    router.push('/workouts')
  }

  const filtered = allExercises.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.muscle_group.toLowerCase().includes(search.toLowerCase())
  )
  const grouped: Record<string, Exercise[]> = {}
  for (const e of filtered) {
    if (!grouped[e.muscle_group]) grouped[e.muscle_group] = []
    grouped[e.muscle_group]!.push(e)
  }

  const inputClass = "px-3 py-2.5 rounded-xl bg-zinc-800 border border-white/[0.07] text-white text-sm focus:outline-none focus:border-blue-500 w-full"

  return (
    <div className="px-4 pt-6 pb-8 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={handleDiscard}
          className="w-10 h-10 bg-[#111] border border-white/[0.07] rounded-xl flex items-center justify-center flex-shrink-0"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          className="flex-1 bg-transparent text-xl font-bold text-white focus:outline-none"
        />
        {!initDone && (
          <span className="text-zinc-600 text-xs">Создаю...</span>
        )}
      </div>

      {exercises.map((ex, exIdx) => (
        <div key={ex.weId ?? exIdx} className="bg-[#111] border border-white/[0.07] rounded-2xl mb-3 overflow-hidden">
          <div
            className="flex items-center justify-between px-4 py-3.5 cursor-pointer"
            onClick={() => setExercises(prev => prev.map((e, i) => i === exIdx ? { ...e, expanded: !e.expanded } : e))}
          >
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 bg-blue-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-blue-400 text-xs font-bold">{exIdx + 1}</span>
              </div>
              <p className="text-white font-semibold">{ex.exercise_name}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-zinc-600 text-xs">{ex.sets.length} подх.</span>
              {ex.expanded ? <ChevronUp className="w-4 h-4 text-zinc-600" /> : <ChevronDown className="w-4 h-4 text-zinc-600" />}
            </div>
          </div>

          {ex.expanded && (
            <div className="px-4 pb-4 border-t border-white/[0.05]">
              <div className="flex text-zinc-600 text-xs mb-2 gap-3 px-1 pt-3">
                <span className="w-6 text-center">#</span>
                <span className="flex-1">Вес (кг)</span>
                <span className="flex-1">Повторы</span>
              </div>
              {ex.sets.map((s, sIdx) => (
                <div key={s.id ?? sIdx} className="flex items-center gap-3 mb-2">
                  <span className="w-6 text-center text-zinc-600 text-sm font-semibold">{sIdx + 1}</span>
                  <input
                    className={inputClass}
                    type="number"
                    step="0.5"
                    placeholder="50"
                    value={s.weight_kg}
                    onChange={e => updateSet(exIdx, sIdx, 'weight_kg', e.target.value)}
                  />
                  <input
                    className={inputClass}
                    type="number"
                    placeholder="10"
                    value={s.reps}
                    onChange={e => updateSet(exIdx, sIdx, 'reps', e.target.value)}
                  />
                </div>
              ))}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => addSet(exIdx)}
                  className="flex-1 py-2.5 rounded-xl border border-dashed border-zinc-700 text-zinc-500 text-sm font-medium"
                >
                  + Подход
                </button>
                <button
                  onClick={() => removeExercise(exIdx)}
                  className="w-11 h-10 flex items-center justify-center bg-red-500/10 border border-red-500/20 rounded-xl text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      <button
        onClick={() => setShowPicker(true)}
        disabled={!initDone}
        className="w-full py-3.5 rounded-2xl border border-dashed border-zinc-700 text-zinc-500 flex items-center justify-center gap-2 mb-6 font-medium disabled:opacity-40"
      >
        <Plus className="w-5 h-5" />
        Добавить упражнение
      </button>

      <button
        onClick={handleFinish}
        disabled={finishing || !initDone}
        className="w-full py-4 rounded-2xl bg-blue-600 text-white font-bold text-base disabled:opacity-40 active:bg-blue-700 transition-colors flex items-center justify-center gap-2"
      >
        <Check className="w-5 h-5" />
        {finishing ? 'Завершаю...' : 'Завершить тренировку'}
      </button>

      {/* Exercise picker modal */}
      {showPicker && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col">
          <div className="flex-1 flex flex-col bg-[#0d0d0d] mt-12 rounded-t-3xl overflow-hidden border-t border-white/[0.07]">
            <div className="flex items-center justify-between px-4 py-4 border-b border-white/[0.07]">
              <h2 className="text-white font-bold text-lg">
                {showCreate ? 'Новое упражнение' : 'Выбери упражнение'}
              </h2>
              <button
                onClick={() => { setShowPicker(false); setShowCreate(false) }}
                className="w-8 h-8 bg-zinc-800 rounded-xl flex items-center justify-center"
              >
                <X className="w-4 h-4 text-zinc-400" />
              </button>
            </div>

            {showCreate ? (
              <div className="px-4 py-4 flex flex-col gap-3">
                <div>
                  <label className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-2 block">Название</label>
                  <input
                    className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-white/[0.07] text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500"
                    placeholder="Например: Тяга Т-грифа"
                    value={newExName}
                    onChange={e => setNewExName(e.target.value)}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-2 block">Группа мышц</label>
                  <select
                    className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-white/[0.07] text-white focus:outline-none"
                    value={newExGroup}
                    onChange={e => setNewExGroup(e.target.value)}
                  >
                    {MUSCLE_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-2 block">Оборудование (необязательно)</label>
                  <input
                    className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-white/[0.07] text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500"
                    placeholder="Штанга, Гантели..."
                    value={newExEquipment}
                    onChange={e => setNewExEquipment(e.target.value)}
                  />
                </div>
                <button
                  onClick={createAndAdd}
                  disabled={!newExName.trim() || creating}
                  className="w-full py-3.5 rounded-xl bg-blue-600 text-white font-bold disabled:opacity-40 mt-1"
                >
                  {creating ? 'Создаю...' : 'Создать и добавить'}
                </button>
                <button onClick={() => setShowCreate(false)} className="text-zinc-500 text-sm text-center py-1">
                  ← Назад к списку
                </button>
              </div>
            ) : (
              <>
                <div className="px-4 py-3">
                  <input
                    className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-white/[0.07] text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500"
                    placeholder="Поиск упражнения..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="flex-1 overflow-y-auto px-4 pb-4">
                  <button
                    onClick={() => setShowCreate(true)}
                    className="w-full text-left px-4 py-3 rounded-xl border border-dashed border-blue-600/40 bg-blue-600/10 mb-4 flex items-center gap-3"
                  >
                    <Plus className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    <span className="text-blue-400 text-sm font-semibold">Создать своё упражнение</span>
                  </button>
                  {Object.entries(grouped).map(([group, exs]) => (
                    <div key={group} className="mb-4">
                      <p className="text-zinc-600 text-xs font-semibold uppercase tracking-wider mb-2">{group}</p>
                      {exs.map(ex => (
                        <button
                          key={ex.id}
                          onClick={() => addExercise(ex)}
                          className="w-full text-left px-4 py-3 rounded-xl bg-zinc-900 border border-white/[0.05] mb-2 flex justify-between items-center active:bg-zinc-800"
                        >
                          <span className="text-white font-medium">{ex.name}</span>
                          <span className="text-zinc-600 text-xs">{ex.equipment}</span>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
