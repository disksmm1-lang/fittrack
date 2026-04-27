import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { awardXP, XP_REWARDS } from '@/lib/gamification'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { reason } = await req.json() as { reason: keyof typeof XP_REWARDS }
  const amount = XP_REWARDS[reason] ?? 0
  if (amount === 0) return NextResponse.json({ xpGained: 0, newAchievements: [], levelUp: false, newLevel: 1, newStreak: 0 })

  const result = await awardXP(supabase, user.id, amount, reason)
  return NextResponse.json(result)
}
