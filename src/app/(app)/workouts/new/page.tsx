export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import NewWorkoutClient from './NewWorkoutClient'

export default async function NewWorkoutPage({
  searchParams,
}: {
  searchParams: Promise<{ planned_id?: string }>
}) {
  const { planned_id } = await searchParams

  let plannedTemplate = null

  if (planned_id) {
    const supabase = await createClient()
    const { data: pw } = await supabase
      .from('planned_workouts')
      .select('*, planned_workout_exercises(*)')
      .eq('id', planned_id)
      .single()

    if (pw) {
      plannedTemplate = {
        name: pw.name,
        exercises: [...(pw.planned_workout_exercises ?? [])]
          .sort((a, b) => a.order_index - b.order_index)
          .map((ex: {
            exercise_name: string
            muscle_group: string
            sets: number
            reps: string
            weight_kg: string
            notes: string
          }) => ({
            exercise_name: ex.exercise_name,
            muscle_group: ex.muscle_group,
            sets: ex.sets,
            reps: ex.reps,
            weight_kg: ex.weight_kg,
          })),
      }
    }
  }

  return <NewWorkoutClient plannedTemplate={plannedTemplate} />
}
