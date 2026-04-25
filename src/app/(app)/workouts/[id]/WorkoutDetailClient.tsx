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

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/workouts" className="w-9 h-9 bg-zinc-900 rounded-xl flex items-center justify-center flex-shrink-0">
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
                className="flex-1 bg-zinc-900 border border-indigo-500 rounded-xl px-3 py-2 text-white text-base focus:outline-none"
              />
              <button onClick={saveName} disabled={saving} className="w-8 h-8 flex items-center justify-center bg-indigo-500 rounded-lg">
                <Check className="w-4 h-4 text-white" />
              </button>
              <button onClick={() => { setName(workout.name); setEditing(false) }} className="w-8 h-8 flex items-center justify-center bg-zinc-800 rounded-lg">
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
              <button onClick={() => setEditing(true)} className="w-8 h-8 flex items-center justify-center text-zinc-500 flex-shrink-0">
                <Pencil className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Edit and Delete buttons */}
        {!editing && (
          <div className="flex gap-2 flex-shrink-0">
            <Link
              href={`/workouts/${workout.id}/edit`}
              className="w-9 h-9 flex items-center justify-center bg-zinc-900 rounded-xl text-indigo-400"
            >
              <SquarePen className="w-4 h-4" />
            </Link>
            <button
              onClick={() => setConfirmDelete(true)}
              className="w-9 h-9 flex items-center justify-center bg-zinc-900 rounded-xl text-red-400"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Exercises */}
      {!workoutExercises.length ? (
        <div className="flex flex-col items-center py-16 text-center">
          <Dumbbell className="w-10 h-10 text-zinc-700 mb-3" />
          <p className="text-zinc-500">Упражнения не добавлены</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {workoutExercises.map(we => {
            const totalVolume = we.sets.reduce((s, set) => s + (set.weight_kg ?? 0) * (set.reps ?? 0), 0)
            return (
              <div key={we.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
                  <div>
                    <p className="text-white font-medium">{we.exercise?.name}</p>
                    <p className="text-zinc-500 text-xs">{we.exercise?.muscle_group} · {we.exercise?.equipment}</p>
                  </div>
                  {totalVolume > 0 && (
                    <p className="text-zinc-500 text-xs">{Math.round(totalVolume)} кг объём</p>
                  )}
                </div>
                <div className="px-4 py-3">
                  <div className="flex text-zinc-500 text-xs mb-2 gap-4">
                    <span className="w-8 text-center">#</span>
                    <span className="flex-1">Вес</span>
                    <span className="flex-1">Повторы</span>
                  </div>
                  {we.sets.map(s => (
                    <div key={s.id} className="flex items-center gap-4 py-1">
                      <span className="w-8 text-center text-zinc-500 text-sm">{s.set_number}</span>
                      <span className="flex-1 text-white text-sm">{s.weight_kg ? `${s.weight_kg} кг` : '—'}</span>
                      <span className="flex-1 text-white text-sm">{s.reps ? `${s.reps} повт.` : '—'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {workout.notes && (
        <div className="mt-4 bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <p className="text-zinc-500 text-sm mb-1">Заметки</p>
          <p className="text-white text-sm">{workout.notes}</p>
        </div>
      )}

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end">
          <div className="w-full bg-zinc-900 rounded-t-3xl p-6 flex flex-col gap-4">
            <p className="text-white font-semibold text-center text-lg">Удалить тренировку?</p>
            <p className="text-zinc-500 text-sm text-center">«{name}» будет удалена навсегда</p>
            <button
              onClick={deleteWorkout}
              disabled={deleting}
              className="w-full py-4 rounded-2xl bg-red-600 text-white font-semibold disabled:opacity-50"
            >
              {deleting ? 'Удаляю...' : 'Удалить'}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="w-full py-4 rounded-2xl bg-zinc-800 text-white font-medium"
            >
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
