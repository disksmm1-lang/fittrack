import { SupabaseClient } from '@supabase/supabase-js'

export const XP_REWARDS = {
  food_entry: 5,
  workout_complete: 20,
  personal_record: 50,
  calories_goal: 10,
  cardio_entry: 8,
  streak_bonus: 5, // multiplied by streak_days
  challenge_complete: 0, // set per challenge
} as const

// XP needed to reach level N: sum of (i*100) for i=1..N-1
export function xpForLevel(level: number): number {
  return Math.floor(level * 100 * (1 + (level - 1) * 0.1))
}

export function calcLevel(totalXp: number): number {
  let level = 1
  let accumulated = 0
  while (true) {
    const needed = xpForLevel(level)
    if (accumulated + needed > totalXp) break
    accumulated += needed
    level++
    if (level >= 100) break
  }
  return level
}

export function xpProgressInLevel(totalXp: number): { current: number; needed: number; level: number } {
  let level = 1
  let accumulated = 0
  while (true) {
    const needed = xpForLevel(level)
    if (accumulated + needed > totalXp) {
      return { current: totalXp - accumulated, needed, level }
    }
    accumulated += needed
    level++
    if (level >= 100) break
  }
  return { current: 0, needed: xpForLevel(level), level }
}

interface GamificationResult {
  xpGained: number
  newAchievements: { key: string; name: string; icon: string; xp_reward: number }[]
  levelUp: boolean
  newLevel: number
  newStreak: number
}

export async function awardXP(
  supabase: SupabaseClient,
  userId: string,
  amount: number,
  reason: keyof typeof XP_REWARDS | 'manual'
): Promise<GamificationResult> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('xp, level, streak_days, last_activity_date')
    .eq('id', userId)
    .single()

  if (!profile) return { xpGained: 0, newAchievements: [], levelUp: false, newLevel: 1, newStreak: 0 }

  // Update streak
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const lastDate = profile.last_activity_date
  let newStreak = profile.streak_days

  if (lastDate !== todayStr) {
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`
    newStreak = lastDate === yStr ? profile.streak_days + 1 : 1
  }

  // Streak bonus XP
  const streakBonus = newStreak > 1 && lastDate !== todayStr ? Math.min(newStreak * XP_REWARDS.streak_bonus, 100) : 0
  const totalXp = profile.xp + amount + streakBonus

  const oldLevel = profile.level
  const newLevel = calcLevel(totalXp)
  const levelUp = newLevel > oldLevel

  await supabase.from('profiles').update({
    xp: totalXp,
    level: newLevel,
    streak_days: newStreak,
    last_activity_date: todayStr,
  }).eq('id', userId)

  // Check achievements
  const { data: existing } = await supabase
    .from('user_achievements')
    .select('achievement_key')
    .eq('user_id', userId)
  const unlockedKeys = new Set((existing ?? []).map(a => a.achievement_key))

  const newAchievements: GamificationResult['newAchievements'] = []
  const toCheck = await buildAchievementsToCheck(supabase, userId, newLevel, newStreak)

  for (const ach of toCheck) {
    if (!unlockedKeys.has(ach.key)) {
      const { error } = await supabase.from('user_achievements').insert({
        user_id: userId,
        achievement_key: ach.key,
      })
      if (!error) {
        newAchievements.push(ach)
        // Award XP for achievement
        if (ach.xp_reward > 0) {
          await supabase.from('profiles').update({
            xp: totalXp + newAchievements.reduce((s, a) => s + a.xp_reward, 0),
          }).eq('id', userId)
        }
      }
    }
  }

  return { xpGained: amount + streakBonus, newAchievements, levelUp, newLevel, newStreak }
}

async function buildAchievementsToCheck(
  supabase: SupabaseClient,
  userId: string,
  level: number,
  streak: number
): Promise<{ key: string; name: string; icon: string; xp_reward: number }[]> {
  const candidates: { key: string; name: string; icon: string; xp_reward: number }[] = []

  // Count workouts
  const { count: workoutCount } = await supabase
    .from('workouts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  const wc = workoutCount ?? 0
  if (wc >= 1)  candidates.push({ key: 'first_workout',  name: 'Первый шаг',      icon: '🏋️', xp_reward: 50 })
  if (wc >= 5)  candidates.push({ key: 'workouts_5',     name: 'Входишь во вкус', icon: '💪', xp_reward: 75 })
  if (wc >= 10) candidates.push({ key: 'workouts_10',    name: 'Десятка',         icon: '🔟', xp_reward: 100 })
  if (wc >= 25) candidates.push({ key: 'workouts_25',    name: 'Серьёзный подход',icon: '🏆', xp_reward: 200 })
  if (wc >= 50) candidates.push({ key: 'workouts_50',    name: 'Полсотни',        icon: '🥇', xp_reward: 400 })

  // Streak
  if (streak >= 3)  candidates.push({ key: 'streak_3',  name: 'Три в ряд',            icon: '🔥', xp_reward: 30 })
  if (streak >= 7)  candidates.push({ key: 'streak_7',  name: 'Неделя без пропусков', icon: '🔥', xp_reward: 75 })
  if (streak >= 14) candidates.push({ key: 'streak_14', name: 'Две недели',           icon: '🔥', xp_reward: 150 })
  if (streak >= 30) candidates.push({ key: 'streak_30', name: 'Месяц силы',           icon: '🔥', xp_reward: 400 })

  // Level
  if (level >= 5)  candidates.push({ key: 'level_5',  name: 'Уровень 5',  icon: '⭐', xp_reward: 0 })
  if (level >= 10) candidates.push({ key: 'level_10', name: 'Уровень 10', icon: '⭐', xp_reward: 0 })
  if (level >= 20) candidates.push({ key: 'level_20', name: 'Уровень 20', icon: '⭐', xp_reward: 0 })

  // Food entries
  const { count: foodCount } = await supabase
    .from('food_entries')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
  if ((foodCount ?? 0) >= 1) candidates.push({ key: 'first_food', name: 'Слежу за питанием', icon: '🥗', xp_reward: 20 })

  // Cardio
  const { count: cardioCount } = await supabase
    .from('cardio_entries')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
  if ((cardioCount ?? 0) >= 1) candidates.push({ key: 'first_cardio', name: 'Кардио бро', icon: '🏃', xp_reward: 20 })

  const { data: cardioData } = await supabase
    .from('cardio_entries')
    .select('duration_minutes')
    .eq('user_id', userId)
  const totalCardioMin = (cardioData ?? []).reduce((s, e) => s + e.duration_minutes, 0)
  if (totalCardioMin >= 60)  candidates.push({ key: 'cardio_60min',  name: 'Час в движении', icon: '🏃', xp_reward: 75 })
  if (totalCardioMin >= 300) candidates.push({ key: 'cardio_300min', name: 'Марафонец',       icon: '🏃', xp_reward: 200 })

  return candidates
}

// Generate weekly challenges for a user
export async function ensureWeeklyChallenges(supabase: SupabaseClient, userId: string) {
  const today = new Date()
  const day = today.getDay() // 0=Sun
  const diff = (day === 0 ? -6 : 1) - day
  const monday = new Date(today)
  monday.setDate(today.getDate() + diff)
  const weekStart = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`

  const { data: existing } = await supabase
    .from('weekly_challenges')
    .select('type')
    .eq('user_id', userId)
    .eq('week_start', weekStart)

  if (existing && existing.length >= 3) return

  const existingTypes = new Set((existing ?? []).map(c => c.type))

  const pool = [
    { type: 'workouts',       title: 'Проведи 3 тренировки',          target: 3,    xp_reward: 100 },
    { type: 'cardio_min',     title: 'Кардио 90 минут за неделю',      target: 90,   xp_reward: 80 },
    { type: 'calories_days',  title: 'Закрой КБЖУ 5 дней подряд',     target: 5,    xp_reward: 120 },
    { type: 'protein_days',   title: 'Норма белка 4 дня из 7',         target: 4,    xp_reward: 90 },
    { type: 'streak',         title: 'Не пропускай 7 дней подряд',     target: 7,    xp_reward: 150 },
    { type: 'food_entries',   title: 'Запиши 20 приёмов пищи',         target: 20,   xp_reward: 70 },
    { type: 'cardio_calories',title: 'Сожги 500 ккал кардио',          target: 500,  xp_reward: 100 },
  ]

  const available = pool.filter(c => !existingTypes.has(c.type))
  // Pick 3 random
  const shuffled = available.sort(() => Math.random() - 0.5).slice(0, 3 - (existing?.length ?? 0))

  if (shuffled.length > 0) {
    await supabase.from('weekly_challenges').insert(
      shuffled.map(c => ({ user_id: userId, week_start: weekStart, ...c }))
    )
  }
}
