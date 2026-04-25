export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import WorkoutDetailClient from './WorkoutDetailClient'

export default async function WorkoutDetailPage({ params }: { params: Promise<{ id: string }> }) {
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

  const setsByExercise: Record<string, { id: string; workout_exercise_id: string; set_number: number; weight_kg: number | null; reps: number | null }[]> = {}
  for (const s of allSets ?? []) {
    if (!setsByExercise[s.workout_exercise_id]) setsByExercise[s.workout_exercise_id] = []
    setsByExercise[s.workout_exercise_id]!.push(s)
  }

  const exercisesWithSets = (workoutExercises ?? []).map(we => ({
    ...we,
    sets: setsByExercise[we.id] ?? [],
  }))

  return <WorkoutDetailClient workout={workout} workoutExercises={exercisesWithSets} />
}
