import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ensureWeeklyChallenges } from '@/lib/gamification'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

  return NextResponse.json(challenges ?? [])
}
