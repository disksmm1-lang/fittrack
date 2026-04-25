export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, ChevronRight, Dumbbell } from 'lucide-react'

export default async function WorkoutsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: workouts } = await supabase
    .from('workouts')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .limit(30)

  const grouped: Record<string, typeof workouts> = {}
  for (const w of workouts ?? []) {
    const month = new Date(w.date).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
    if (!grouped[month]) grouped[month] = []
    grouped[month]!.push(w)
  }

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Тренировки</h1>
        <Link
          href="/workouts/new"
          className="flex items-center gap-2 bg-indigo-500 text-white px-4 py-2 rounded-xl font-medium text-sm"
        >
          <Plus className="w-4 h-4" />
          Новая
        </Link>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Dumbbell className="w-12 h-12 text-zinc-700 mb-4" />
          <p className="text-zinc-400 font-medium">Тренировок пока нет</p>
          <p className="text-zinc-600 text-sm mt-1">Начни первую тренировку</p>
          <Link href="/workouts/new" className="mt-4 bg-indigo-500 text-white px-6 py-3 rounded-xl font-medium">
            Начать тренировку
          </Link>
        </div>
      ) : (
        Object.entries(grouped).map(([month, ws]) => (
          <div key={month} className="mb-6">
            <p className="text-zinc-500 text-sm font-medium mb-2 capitalize">{month}</p>
            <div className="flex flex-col gap-2">
              {ws?.map(w => (
                <Link
                  key={w.id}
                  href={`/workouts/${w.id}`}
                  className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="text-white font-medium">{w.name}</p>
                    <p className="text-zinc-500 text-sm">
                      {new Date(w.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                      {w.duration_minutes ? ` · ${w.duration_minutes} мин` : ''}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-zinc-600" />
                </Link>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
