'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ArrowLeft, Trash2, Pencil, Check, X, Dumbbell, SquarePen } from 'lucide-react'

interface Set {
  id: string
  set_number: number
  weight_kg: number | null
  reps: number | null
}

interface WorkoutExercise {
  id: string
  order: number
  exercise: { name: string; muscle_group: string; equipment: string } | null
  sets: Set[]
}

interface Workout {
  id: string
  name: string
  date: string
  duration_minutes: number | null
  notes: string | null
}

export default function WorkoutDetailClient({
  workout,
  workoutExercises,
}: {
  workout: Workout
  workoutExercises: WorkoutExercise[]
}) {
  const router = useRouter()
  const supabase = createClient()

  const [name, setName] = useState(workout.name)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function saveName() {
    if (!name.trim() || name === workout.name) { setEditing(false); return }
    setSaving(true)
    await supabase.from('workouts').update({ name: name.trim() }).eq('id', workout.id)
    setSaving(false)
    setEditing(false)
    router.refresh()
  }

  async function deleteWorkout() {
    setDeleting(true)
    await supabase.from('workouts').delete().eq('id', workout.id)
    router.push('/workouts')
    router.refresh()
  }

  const totalVolume = workoutExercises.reduce((total, we) =>
    total + we.sets.reduce((s, set) => s + (set.weight_kg ?? 0) * (set.reps ?? 0), 0), 0
  )

  return (
    <div className="px-4 pt-6 pb-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/workouts" className="w-10 h-10 bg-[#111] border border-white/[0.07] rounded-xl flex items-center justify-center flex-shrink-0">
          <ArrowLeft className="w-5 h-5 text-white" />
        </Link>

        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="flex items-center gap-2">
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveName()}
                autoFocus
                className="flex-1 bg-zinc-800 border border-blue-500 rounded-xl px-3 py-2 text-white text-base focus:outline-none"
              />
              <button onClick={saveName} disabled={saving} className="w-9 h-9 flex items-center justify-center bg-blue-600 rounded-xl">
                <Check className="w-4 h-4 text-white" />
              </button>
              <button onClick={() => { setName(workout.name); setEditing(false) }} className="w-9 h-9 flex items-center justify-center bg-zinc-800 rounded-xl">
                <X className="w-4 h-4 text-zinc-400" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold text-white truncate">{name}</h1>
                <p className="text-zinc-500 text-sm">
                  {new Date(workout.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                  {workout.duration_minutes ? ` · ${workout.duration_minutes} мин` : ''}
                </p>
              </div>
              <button onClick={() => setEditing(true)} className="w-9 h-9 flex items-center justify-center text-zinc-500 flex-shrink-0">
                <Pencil className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {!editing && (
          <div className="flex gap-2 flex-shrink-0">
            <Link
              href={`/workouts/${workout.id}/edit`}
              className="w-10 h-10 flex items-center justify-center bg-[#111] border border-white/[0.07] rounded-xl text-blue-400"
            >
              <SquarePen className="w-4 h-4" />
            </Link>
            <button
              onClick={() => setConfirmDelete(true)}
              className="w-10 h-10 flex items-center justify-center bg-[#111] border border-white/[0.07] rounded-xl text-red-400"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Summary bar */}
      {workoutExercises.length > 0 && (
        <div className="bg-blue-600 rounded-2xl px-4 py-3 mb-4 flex justify-between">
          <div className="text-center">
            <p className="text-white font-bold text-lg leading-none">{workoutExercises.length}</p>
            <p className="text-blue-200 text-xs mt-0.5">упражнений</p>
          </div>
          <div className="text-center">
            <p className="text-white font-bold text-lg leading-none">
              {workoutExercises.reduce((s, we) => s + we.sets.length, 0)}
            </p>
            <p className="text-blue-200 text-xs mt-0.5">подходов</p>
          </div>
          {totalVolume > 0 && (
            <div className="text-center">
              <p className="text-white font-bold text-lg leading-none">{Math.round(totalVolume)}</p>
              <p className="text-blue-200 text-xs mt-0.5">кг объём</p>
            </div>
          )}
        </div>
      )}

      {/* Exercises */}
      {!workoutExercises.length ? (
        <div className="flex flex-col items-center py-20 text-center">
          <div className="w-16 h-16 bg-zinc-800/80 rounded-2xl flex items-center justify-center mb-4">
            <Dumbbell className="w-8 h-8 text-zinc-600" />
          </div>
          <p className="text-zinc-400 font-medium">Упражнения не добавлены</p>
          <Link
            href={`/workouts/${workout.id}/edit`}
            className="mt-4 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold"
          >
            Добавить упражнения
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {workoutExercises.map((we, weIdx) => {
            const exVolume = we.sets.reduce((s, set) => s + (set.weight_kg ?? 0) * (set.reps ?? 0), 0)
            return (
              <div key={we.id} className="bg-[#111] border border-white/[0.07] rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.05]">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 bg-blue-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-400 text-xs font-bold">{weIdx + 1}</span>
                    </div>
                    <div>
                      <p className="text-white font-semibold">{we.exercise?.name}</p>
                      <p className="text-zinc-600 text-xs">{we.exercise?.muscle_group}{we.exercise?.equipment ? ` · ${we.exercise.equipment}` : ''}</p>
                    </div>
                  </div>
                  {exVolume > 0 && (
                    <p className="text-zinc-500 text-xs font-medium">{Math.round(exVolume)} кг</p>
                  )}
                </div>
                <div className="px-4 py-3">
                  <div className="flex text-zinc-600 text-xs mb-2 gap-4">
                    <span className="w-6 text-center">#</span>
                    <span className="flex-1">Вес</span>
                    <span className="flex-1">Повторы</span>
                  </div>
                  {we.sets.map(s => (
                    <div key={s.id} className="flex items-center gap-4 py-1.5 border-b border-white/[0.03] last:border-0">
                      <span className="w-6 text-center text-zinc-600 text-sm font-medium">{s.set_number}</span>
                      <span className="flex-1 text-white text-sm font-semibold">{s.weight_kg ? `${s.weight_kg} кг` : '—'}</span>
                      <span className="flex-1 text-white text-sm font-semibold">{s.reps ? `${s.reps} повт.` : '—'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {workout.notes && (
        <div className="mt-4 bg-[#111] border border-white/[0.07] rounded-2xl p-4">
          <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-2">Заметки</p>
          <p className="text-zinc-300 text-sm leading-relaxed">{workout.notes}</p>
        </div>
      )}

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end">
          <div className="w-full bg-[#111] border-t border-white/[0.07] rounded-t-3xl p-6 flex flex-col gap-3">
            <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto mb-2" />
            <p className="text-white font-bold text-lg text-center">Удалить тренировку?</p>
            <p className="text-zinc-500 text-sm text-center">«{name}» будет удалена навсегда</p>
            <button
              onClick={deleteWorkout}
              disabled={deleting}
              className="w-full py-4 rounded-2xl bg-red-600 text-white font-bold disabled:opacity-50 mt-1"
            >
              {deleting ? 'Удаляю...' : 'Удалить'}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="w-full py-4 rounded-2xl bg-zinc-800 text-white font-semibold"
            >
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
