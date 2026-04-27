export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { calculateKBJU } from '@/lib/kbju'
import StatsClient from './StatsClient'

export default async function StatsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = new Date().toISOString().split('T')[0]
  const d90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const [
    { data: profile },
    { data: foodEntries },
    { data: workouts },
    { data: weightHistory },
    { data: cardioEntries },
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('food_entries')
      .select('date, calories, protein_g, fat_g, carbs_g')
      .eq('user_id', user.id)
      .gte('date', d90)
      .order('date'),
    supabase.from('workouts')
      .select('id, date, name, duration_minutes')
      .eq('user_id', user.id)
      .gte('date', d90)
      .order('date'),
    supabase.from('weight_history')
      .select('date, weight, body_fat')
      .eq('user_id', user.id)
      .gte('date', d90)
      .order('date'),
    supabase.from('cardio_entries')
      .select('date, activity_type, duration_minutes, calories_burned')
      .eq('user_id', user.id)
      .gte('date', d90)
      .order('date'),
  ])

  // Грузим объём тренировок (тоннаж)
  const workoutIds = (workouts ?? []).map(w => w.id)
  let volumeByWorkout: Record<string, number> = {}
  let muscleGroupData: Record<string, number> = {}

  if (workoutIds.length > 0) {
    const { data: wes } = await supabase
      .from('workout_exercises')
      .select('id, workout_id, exercise:exercises(name, muscle_group)')
      .in('workout_id', workoutIds)

    const weIds = (wes ?? []).map(we => we.id)
    if (weIds.length > 0) {
      const { data: sets } = await supabase
        .from('workout_sets')
        .select('workout_exercise_id, weight_kg, reps')
        .in('workout_exercise_id', weIds)
        .eq('completed', true)

      // Считаем тоннаж по тренировкам и мышечным группам
      for (const we of wes ?? []) {
        const weSets = (sets ?? []).filter(s => s.workout_exercise_id === we.id)
        const vol = weSets.reduce((sum, s) => sum + (s.weight_kg ?? 0) * (s.reps ?? 0), 0)
        volumeByWorkout[we.workout_id] = (volumeByWorkout[we.workout_id] ?? 0) + vol
        const mg = (we.exercise as unknown as { muscle_group: string } | null)?.muscle_group ?? 'Другое'
        muscleGroupData[mg] = (muscleGroupData[mg] ?? 0) + weSets.length
      }
    }
  }

  const kbju = profile ? calculateKBJU(profile) : null

  // Агрегируем питание по дням
  const foodByDay: Record<string, { calories: number; protein_g: number; fat_g: number; carbs_g: number }> = {}
  for (const e of foodEntries ?? []) {
    if (!foodByDay[e.date]) foodByDay[e.date] = { calories: 0, protein_g: 0, fat_g: 0, carbs_g: 0 }
    foodByDay[e.date]!.calories += e.calories
    foodByDay[e.date]!.protein_g += e.protein_g
    foodByDay[e.date]!.fat_g += e.fat_g
    foodByDay[e.date]!.carbs_g += e.carbs_g
  }

  // Добавляем тоннаж к тренировкам
  const workoutsWithVolume = (workouts ?? []).map(w => ({
    ...w,
    volume: Math.round(volumeByWorkout[w.id] ?? 0),
  }))

  // Агрегируем кардио по дням
  const cardioByDay: Record<string, { calories: number; minutes: number }> = {}
  for (const e of cardioEntries ?? []) {
    if (!cardioByDay[e.date]) cardioByDay[e.date] = { calories: 0, minutes: 0 }
    cardioByDay[e.date]!.calories += e.calories_burned
    cardioByDay[e.date]!.minutes += e.duration_minutes
  }

  return (
    <StatsClient
      foodByDay={foodByDay}
      workouts={workoutsWithVolume}
      weightHistory={weightHistory ?? []}
      muscleGroups={muscleGroupData}
      kbjuGoal={kbju}
      today={today}
      profileWeight={profile?.weight ?? null}
      cardioByDay={cardioByDay}
    />
  )
}
