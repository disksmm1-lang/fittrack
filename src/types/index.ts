export interface Profile {
  id: string
  email: string
  name: string
  age?: number
  gender?: 'male' | 'female'
  weight?: number
  height?: number
  goal?: 'lose_weight' | 'maintain' | 'gain_muscle'
  activity_level?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
  created_at: string
}

export interface Workout {
  id: string
  user_id: string
  date: string
  name: string
  notes?: string
  duration_minutes?: number
  created_at: string
  exercises?: WorkoutExercise[]
}

export interface Exercise {
  id: string
  name: string
  muscle_group: string
  equipment?: string
}

export interface WorkoutExercise {
  id: string
  workout_id: string
  exercise_id: string
  exercise?: Exercise
  sets: WorkoutSet[]
  order: number
}

export interface WorkoutSet {
  id: string
  workout_exercise_id: string
  set_number: number
  weight_kg?: number
  reps?: number
  duration_seconds?: number
  completed: boolean
}

export interface FoodEntry {
  id: string
  user_id: string
  date: string
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  food_name: string
  amount_grams: number
  calories: number
  protein_g: number
  fat_g: number
  carbs_g: number
  created_at: string
}

export interface DailyNutrition {
  date: string
  calories: number
  protein_g: number
  fat_g: number
  carbs_g: number
}

export interface NutritionGoals {
  calories: number
  protein_g: number
  fat_g: number
  carbs_g: number
}
