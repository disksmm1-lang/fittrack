import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ensureWeeklyChallenges } from '@/lib/gamification'

type EventType = 'workout' | 'food_entry' | 'cardio_entry' | 'calories_goal' | 'protein_goal'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { event, value = 1 }: { event: EventType; value?: number } = await req.json()

  await ensureWeeklyChallenges(supabase, user.id)

  const today = new Date()
  const day = today.getDay()
  const diff = (day === 0 ? -6 : 1) - day
  const monday = new Date(today)
  monday.setDate(today.getDate() + diff)
  const weekStart = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`

  const { data: challenges } = await supabase
    .from('weekly_challenges')
    .select('*')
    .eq('user_id', user.id)
    .eq('week_start', weekStart)
    .eq('completed', false)

  const typeMap: Record<EventType, string[]> = {
    workout:       ['workouts', 'streak'],
    food_entry:    ['food_entries', 'calories_days', 'protein_days'],
    cardio_entry:  ['cardio_min', 'cardio_calories'],
    calories_goal: ['calories_days'],
    protein_goal:  ['protein_days'],
  }

  const relevantTypes = typeMap[event] ?? []

  for (const ch of challenges ?? []) {
    if (!relevantTypes.includes(ch.type)) continue

    const newCurrent = ch.current + value
    const completed = newCurrent >= ch.target

    await supabase.from('weekly_challenges').update({
      current: Math.min(newCurrent, ch.target),
      completed,
    }).eq('id', ch.id)

    // Award XP for completing challenge
    if (completed && ch.xp_reward > 0) {
      const { awardXP } = await import('@/lib/gamification')
      await awardXP(supabase, user.id, ch.xp_reward, 'manual')
    }
  }

  return NextResponse.json({ ok: true })
}
