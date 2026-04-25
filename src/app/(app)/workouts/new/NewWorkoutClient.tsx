'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Plus, Trash2, ChevronDown, ChevronUp, X } from 'lucide-react'
import Link from 'next/link'
import type { Exercise } from '@/types'

interface SetForm {
  weight_kg: string
  reps: string
}

interface ExerciseForm {
  exercise_id: string
  exercise_name: string
  sets: SetForm[]
  expanded: boolean
}

const MUSCLE_GROUPS = ['Грудь', 'Спина', 'Ноги', 'Плечи', 'Бицепс', 'Трицепс', 'Пресс', 'Другое']

export default function NewWorkoutClient() {
  const router = useRouter()
  const supabase = createClient()

  const [name, setName] = useState(`Тренировка ${new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}`)
  const [exercises, setExercises] = useState<ExerciseForm[]>([])
  const [allExercises, setAllExercises] = useState<Exercise[]>([])
  const [showPicker, setShowPicker] = useState(false)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)

  // Create exercise form
  const [showCreate, setShowCreate] = useState(false)
  const [newExName, setNewExName] = useState('')
  const [newExGroup, setNewExGroup] = useState('Другое')
  const [newExEquipment, setNewExEquipment] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    loadExercises()
  }, [])

  async function loadExercises() {
    const { data } = await supabase.from('exercises').select('*').order('muscle_group')
    if (data) setAllExercises(data as Exercise[])
  }

  function addExercise(ex: Exercise) {
    setExercises(prev => [...prev, {
      exercise_id: ex.id,
      exercise_name: ex.name,
      sets: [{ weight_kg: '', reps: '' }],
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

    if (ex) {
      await loadExercises()
      addExercise(ex as Exercise)
    }

    setNewExName('')
    setNewExEquipment('')
    setNewExGroup('Другое')
    setCreating(false)
  }

  function addSet(idx: number) {
    setExercises(prev => prev.map((e, i) => i === idx
      ? { ...e, sets: [...e.sets, { weight_kg: e.sets[e.sets.length - 1]?.weight_kg ?? '', reps: '' }] }
      : e
    ))
  }

  function removeExercise(idx: number) {
    setExercises(prev => prev.filter((_, i) => i !== idx))
  }

  function updateSet(exIdx: number, setIdx: number, field: keyof SetForm, value: string) {
    setExercises(prev => prev.map((e, i) => i === exIdx
      ? { ...e, sets: e.sets.map((s, j) => j === setIdx ? { ...s, [field]: value } : s) }
      : e
    ))
  }

  async function handleSave() {
    if (!name.trim() || exercises.length === 0) return
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: workout } = await supabase.from('workouts').insert({
      user_id: user.id,
      date: new Date().toISOString().split('T')[0],
      name: name.trim(),
    }).select().single()

    if (!workout) { setSaving(false); return }

    for (let i = 0; i < exercises.length; i++) {
      const ex = exercises[i]!
      const { data: we } = await supabase.from('workout_exercises').insert({
        workout_id: workout.id,
        exercise_id: ex.exercise_id,
        order: i,
      }).select().single()

      if (we) {
        await supabase.from('workout_sets').insert(
          ex.sets.map((s, j) => ({
            workout_exercise_id: we.id,
            set_number: j + 1,
            weight_kg: s.weight_kg ? parseFloat(s.weight_kg) : null,
            reps: s.reps ? parseInt(s.reps) : null,
            completed: true,
          }))
        )
      }
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

  const inputClass = "px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm focus:outline-none focus:border-indigo-500 w-full"

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/workouts" className="w-9 h-9 bg-zinc-900 rounded-xl flex items-center justify-center">
          <ArrowLeft className="w-5 h-5 text-white" />
        </Link>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          className="flex-1 bg-transparent text-xl font-bold text-white focus:outline-none"
        />
      </div>

      {exercises.map((ex, exIdx) => (
        <div key={exIdx} className="bg-zinc-900 border border-zinc-800 rounded-2xl mb-3 overflow-hidden">
          <div
            className="flex items-center justify-between px-4 py-3 cursor-pointer"
            onClick={() => setExercises(prev => prev.map((e, i) => i === exIdx ? { ...e, expanded: !e.expanded } : e))}
          >
            <p className="text-white font-medium">{ex.exercise_name}</p>
            <div className="flex items-center gap-2">
              <span className="text-zinc-500 text-sm">{ex.sets.length} подх.</span>
              {ex.expanded ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
            </div>
          </div>

          {ex.expanded && (
            <div className="px-4 pb-4">
              <div className="flex text-zinc-500 text-xs mb-2 gap-4 px-1">
                <span className="w-8 text-center">#</span>
                <span className="flex-1">Вес (кг)</span>
                <span className="flex-1">Повторы</span>
              </div>
              {ex.sets.map((s, sIdx) => (
                <div key={sIdx} className="flex items-center gap-3 mb-2">
                  <span className="w-8 text-center text-zinc-500 text-sm">{sIdx + 1}</span>
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
                  className="flex-1 py-2 rounded-lg border border-dashed border-zinc-700 text-zinc-500 text-sm"
                >
                  + Подход
                </button>
                <button
                  onClick={() => removeExercise(exIdx)}
                  className="w-10 h-9 flex items-center justify-center bg-red-900/30 rounded-lg text-red-400"
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
        className="w-full py-3 rounded-2xl border border-dashed border-zinc-700 text-zinc-400 flex items-center justify-center gap-2 mb-6"
      >
        <Plus className="w-5 h-5" />
        Добавить упражнение
      </button>

      <button
        onClick={handleSave}
        disabled={saving || exercises.length === 0}
        className="w-full py-4 rounded-2xl bg-indigo-500 text-white font-semibold text-base disabled:opacity-40"
      >
        {saving ? 'Сохраняю...' : 'Сохранить тренировку'}
      </button>

      {/* Exercise picker modal */}
      {showPicker && (
        <div className="fixed inset-0 bg-black/80 z-50 flex flex-col">
          <div className="flex-1 flex flex-col bg-zinc-950 mt-16 rounded-t-3xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-4 border-b border-zinc-800">
              <h2 className="text-white font-semibold">
                {showCreate ? 'Новое упражнение' : 'Выбери упражнение'}
              </h2>
              <button
                onClick={() => { setShowPicker(false); setShowCreate(false) }}
                className="text-zinc-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {showCreate ? (
              /* Create exercise form */
              <div className="px-4 py-4 flex flex-col gap-3">
                <div>
                  <label className="text-zinc-400 text-sm mb-1 block">Название упражнения</label>
                  <input
                    className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                    placeholder="Например: Тяга Т-грифа"
                    value={newExName}
                    onChange={e => setNewExName(e.target.value)}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-zinc-400 text-sm mb-1 block">Группа мышц</label>
                  <select
                    className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-indigo-500"
                    value={newExGroup}
                    onChange={e => setNewExGroup(e.target.value)}
                  >
                    {MUSCLE_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-zinc-400 text-sm mb-1 block">Оборудование (необязательно)</label>
                  <input
                    className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                    placeholder="Штанга, Гантели..."
                    value={newExEquipment}
                    onChange={e => setNewExEquipment(e.target.value)}
                  />
                </div>
                <button
                  onClick={createAndAdd}
                  disabled={!newExName.trim() || creating}
                  className="w-full py-3 rounded-xl bg-indigo-500 text-white font-semibold disabled:opacity-40 mt-1"
                >
                  {creating ? 'Создаю...' : 'Создать и добавить'}
                </button>
                <button
                  onClick={() => setShowCreate(false)}
                  className="text-zinc-500 text-sm text-center py-1"
                >
                  ← Назад к списку
                </button>
              </div>
            ) : (
              /* Exercise list */
              <>
                <div className="px-4 py-3 flex gap-2">
                  <input
                    className="flex-1 px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 focus:outline-none"
                    placeholder="Поиск..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="flex-1 overflow-y-auto px-4">
                  {/* Create custom button */}
                  <button
                    onClick={() => setShowCreate(true)}
                    className="w-full text-left px-4 py-3 rounded-xl border border-dashed border-indigo-700 bg-indigo-950/40 mb-4 flex items-center gap-3"
                  >
                    <Plus className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                    <span className="text-indigo-300 text-sm font-medium">Создать своё упражнение</span>
                  </button>

                  {Object.entries(grouped).map(([group, exs]) => (
                    <div key={group} className="mb-4">
                      <p className="text-zinc-500 text-xs font-medium mb-2">{group}</p>
                      {exs.map(ex => (
                        <button
                          key={ex.id}
                          onClick={() => addExercise(ex)}
                          className="w-full text-left px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 mb-2 flex justify-between items-center"
                        >
                          <span className="text-white">{ex.name}</span>
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
