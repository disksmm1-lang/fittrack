export interface ProfileForKBJU {
  gender?: string | null
  age?: number | null
  weight?: number | null
  height?: number | null
  goal?: string | null
  body_fat?: number | null
  work_type?: string | null
  training_days?: number | null
  training_intensity?: string | null
  activity_level?: string | null
}

export interface KBJU {
  bmr: number
  tdee: number
  calories: number
  protein: number
  fat: number
  carbs: number
}

export function calculateKBJU(p: ProfileForKBJU): KBJU | null {
  const { gender, age, weight, height, goal } = p
  if (!gender || !age || !weight || !height) return null

  const w = Number(weight)
  const h = Number(height)
  const a = Number(age)

  // BMR: Katch-McArdle если известен % жира, иначе Mifflin-St Jeor
  let bmr: number
  if (p.body_fat && p.body_fat > 0) {
    const lbm = w * (1 - p.body_fat / 100)
    bmr = 370 + 21.6 * lbm
  } else {
    bmr = gender === 'male'
      ? 10 * w + 6.25 * h - 5 * a + 5
      : 10 * w + 6.25 * h - 5 * a - 161
  }

  // PAL — из детальных данных если есть, иначе из activity_level
  let pal: number
  if (p.work_type && p.training_days != null) {
    const workPal: Record<string, number> = { sedentary: 1.2, standing: 1.3, physical: 1.5 }
    const intensityAdd: Record<string, number> = { light: 0.1, moderate: 0.15, intense: 0.2 }
    const trainingAdd = (p.training_days / 7) * (intensityAdd[p.training_intensity ?? 'moderate'] ?? 0.15) * 2
    pal = Math.min((workPal[p.work_type] ?? 1.2) + trainingAdd, 1.9)
  } else {
    const palMap: Record<string, number> = {
      sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9,
    }
    pal = palMap[p.activity_level ?? 'moderate'] ?? 1.55
  }

  const tdee = bmr * pal

  // Калории по цели
  let calories: number
  if (goal === 'lose_weight') calories = tdee * 0.80
  else if (goal === 'gain_muscle') calories = tdee + 300
  else if (goal === 'recomposition') calories = tdee - 200
  else calories = tdee

  // Белок (ISSN нормы по цели)
  let protein: number
  if (goal === 'lose_weight') protein = w * 2.1
  else if (goal === 'recomposition') protein = w * 2.3
  else if (goal === 'gain_muscle') protein = w * 1.9
  else protein = w * 1.6

  // Жиры — минимум 0.8 г/кг (не меньше 50 г для гормонов)
  const fatFromPercent = (calories * 0.27) / 9
  const fat = Math.max(fatFromPercent, w * 0.8, 50 / 9)

  // Углеводы — остаток
  const carbs = Math.max(0, (calories - protein * 4 - fat * 9) / 4)

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    calories: Math.round(calories),
    protein: Math.round(protein),
    fat: Math.round(fat),
    carbs: Math.round(carbs),
  }
}
