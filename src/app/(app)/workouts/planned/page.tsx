export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PlannedWorkoutsClient from './PlannedWorkoutsClient'

export default async function PlannedWorkoutsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: planned } = await supabase
    .from('planned_workouts')
    .select('*, planned_workout_exercises(*)')
    .eq('user_id', user.id)
    .order('scheduled_date', { ascending: true, nullsFirst: false })

  return <PlannedWorkoutsClient initialPlanned={planned ?? []} userId={user.id} />
}
