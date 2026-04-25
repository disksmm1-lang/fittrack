export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import EditWorkoutClient from './EditWorkoutClient'

export default async function EditWorkoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: workout } = await supabase
    .from('workouts')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!workout) notFound()

  const { data: workoutExercises } = await supabase
    .from('workout_exercises')
    .select('*, exercise:exercises(*)')
    .eq('workout_id', id)
    .order('order')

  const exerciseIds = workoutExercises?.map(we => we.id) ?? []
  const { data: allSets } = exerciseIds.length > 0
    ? await supabase.from('workout_sets').select('*').in('workout_exercise_id', exerciseIds).order('set_number')
    : { data: [] }

  const setsByExercise: Record<string, { id: string; workout_exercise_id: string; weight_kg: number | null; reps: number | null }[]> = {}
  for (const s of allSets ?? []) {
    if (!setsByExercise[s.workout_exercise_id]) setsByExercise[s.workout_exercise_id] = []
    setsByExercise[s.workout_exercise_id]!.push(s)
  }

  const initialExercises = (workoutExercises ?? []).map(we => ({
    id: we.id,
    exercise_id: we.exercise_id,
    exercise_name: we.exercise?.name ?? '',
    expanded: true,
    sets: (setsByExercise[we.id] ?? []).map(s => ({
      id: s.id,
      weight_kg: s.weight_kg?.toString() ?? '',
      reps: s.reps?.toString() ?? '',
    })),
  }))

  return <EditWorkoutClient workout={workout} initialExercises={initialExercises} />
}
