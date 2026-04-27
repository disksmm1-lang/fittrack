import { cache } from 'react'
import { createClient } from './server'

// React.cache — дедупликация в рамках одного запроса (не между запросами)
// Заменяет unstable_cache, который несовместим с cookies() в Next.js 16

export const getCachedProfile = cache(async (userId: string) => {
  const supabase = await createClient()
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
  return data
})

export const getCachedFoodEntries = cache(async (userId: string, date: string) => {
  const supabase = await createClient()
  const { data } = await supabase
    .from('food_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .order('created_at')
  return data ?? []
})

export const getCachedCardioEntries = cache(async (userId: string, date: string) => {
  const supabase = await createClient()
  const { data } = await supabase
    .from('cardio_entries')
    .select('id, activity_type, duration_minutes, calories_burned')
    .eq('user_id', userId)
    .eq('date', date)
    .order('created_at')
  return data ?? []
})

export const getCachedTodayWorkout = cache(async (userId: string, date: string) => {
  const supabase = await createClient()
  const { data } = await supabase
    .from('workouts')
    .select('id, name')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle()
  return data
})

export const getCachedWorkouts = cache(async (userId: string) => {
  const supabase = await createClient()
  const { data } = await supabase
    .from('workouts')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(50)
  return data ?? []
})

export const getCachedPlannedWorkouts = cache(async (userId: string) => {
  const supabase = await createClient()
  const { data } = await supabase
    .from('planned_workouts')
    .select('id, name, description, scheduled_date, planned_workout_exercises(exercise_name, muscle_group, sets, reps, order_index)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10)
  return data ?? []
})

export const getCachedFoodHistory = cache(async (userId: string, fromDate: string) => {
  const supabase = await createClient()
  const { data } = await supabase
    .from('food_entries')
    .select('date, calories, protein_g, fat_g, carbs_g')
    .eq('user_id', userId)
    .gte('date', fromDate)
    .order('date')
  return data ?? []
})

export const getCachedWeightHistory = cache(async (userId: string, fromDate: string) => {
  const supabase = await createClient()
  const { data } = await supabase
    .from('weight_history')
    .select('date, weight, body_fat')
    .eq('user_id', userId)
    .gte('date', fromDate)
    .order('date', { ascending: false })
    .limit(30)
  return data ?? []
})
