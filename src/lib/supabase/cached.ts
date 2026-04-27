import { unstable_cache } from 'next/cache'
import { createClient } from './server'

// Профиль пользователя — кэш 5 минут
export function getCachedProfile(userId: string) {
  return unstable_cache(
    async () => {
      const supabase = await createClient()
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
      return data
    },
    [`profile-${userId}`],
    { revalidate: 300, tags: [`profile-${userId}`] }
  )()
}

// Питание за день — кэш 30 секунд
export function getCachedFoodEntries(userId: string, date: string) {
  return unstable_cache(
    async () => {
      const supabase = await createClient()
      const { data } = await supabase
        .from('food_entries')
        .select('*')
        .eq('user_id', userId)
        .eq('date', date)
        .order('created_at')
      return data ?? []
    },
    [`food-${userId}-${date}`],
    { revalidate: 30, tags: [`food-${userId}`, `food-${userId}-${date}`] }
  )()
}

// Кардио за день — кэш 30 секунд
export function getCachedCardioEntries(userId: string, date: string) {
  return unstable_cache(
    async () => {
      const supabase = await createClient()
      const { data } = await supabase
        .from('cardio_entries')
        .select('id, activity_type, duration_minutes, calories_burned')
        .eq('user_id', userId)
        .eq('date', date)
        .order('created_at')
      return data ?? []
    },
    [`cardio-${userId}-${date}`],
    { revalidate: 30, tags: [`cardio-${userId}`, `cardio-${userId}-${date}`] }
  )()
}

// Тренировка сегодня — кэш 30 секунд
export function getCachedTodayWorkout(userId: string, date: string) {
  return unstable_cache(
    async () => {
      const supabase = await createClient()
      const { data } = await supabase
        .from('workouts')
        .select('id, name')
        .eq('user_id', userId)
        .eq('date', date)
        .maybeSingle()
      return data
    },
    [`workout-today-${userId}-${date}`],
    { revalidate: 30, tags: [`workouts-${userId}`] }
  )()
}

// Список тренировок — кэш 1 минута
export function getCachedWorkouts(userId: string) {
  return unstable_cache(
    async () => {
      const supabase = await createClient()
      const { data } = await supabase
        .from('workouts')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(50)
      return data ?? []
    },
    [`workouts-${userId}`],
    { revalidate: 60, tags: [`workouts-${userId}`] }
  )()
}

// Запланированные тренировки — кэш 2 минуты
export function getCachedPlannedWorkouts(userId: string) {
  return unstable_cache(
    async () => {
      const supabase = await createClient()
      const { data } = await supabase
        .from('planned_workouts')
        .select('id, name, description, scheduled_date, planned_workout_exercises(exercise_name, muscle_group, sets, reps, order_index)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10)
      return data ?? []
    },
    [`planned-workouts-${userId}`],
    { revalidate: 120, tags: [`planned-workouts-${userId}`] }
  )()
}

// Статистика питания за период — кэш 2 минуты
export function getCachedFoodHistory(userId: string, fromDate: string) {
  return unstable_cache(
    async () => {
      const supabase = await createClient()
      const { data } = await supabase
        .from('food_entries')
        .select('date, calories, protein_g, fat_g, carbs_g')
        .eq('user_id', userId)
        .gte('date', fromDate)
        .order('date')
      return data ?? []
    },
    [`food-history-${userId}-${fromDate}`],
    { revalidate: 120, tags: [`food-${userId}`] }
  )()
}

// Вес тела — кэш 5 минут
export function getCachedWeightHistory(userId: string, fromDate: string) {
  return unstable_cache(
    async () => {
      const supabase = await createClient()
      const { data } = await supabase
        .from('weight_history')
        .select('date, weight, body_fat')
        .eq('user_id', userId)
        .gte('date', fromDate)
        .order('date', { ascending: false })
        .limit(30)
      return data ?? []
    },
    [`weight-${userId}-${fromDate}`],
    { revalidate: 300, tags: [`weight-${userId}`] }
  )()
}
