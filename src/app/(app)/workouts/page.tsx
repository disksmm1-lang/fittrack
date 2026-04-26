export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, ChevronRight, Dumbbell, Calendar } from 'lucide-react'

export default async function WorkoutsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: workouts } = await supabase
    .from('workouts')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .limit(50)

  const grouped: Record<string, typeof workouts> = {}
  for (const w of workouts ?? []) {
    const month = new Date(w.date).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
    if (!grouped[month]) grouped[month] = []
    grouped[month]!.push(w)
  }

  return (
    <div className="px-4 pt-8 pb-6 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-7">
        <h1 className="text-[28px] font-bold text-white">Тренировки</h1>
        <Link
          href="/workouts/new"
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl font-semibold text-sm"
        >
          <Plus className="w-4 h-4" />
          Новая
        </Link>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 bg-zinc-800/80 rounded-2xl flex items-center justify-center mb-4">
            <Dumbbell className="w-8 h-8 text-zinc-600" />
          </div>
          <p className="text-white font-semibold text-lg">Тренировок пока нет</p>
          <p className="text-zinc-500 text-sm mt-1 mb-6">Начни первую прямо сейчас</p>
          <Link
            href="/workouts/new"
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold"
          >
            Начать тренировку
          </Link>
        </div>
      ) : (
        Object.entries(grouped).map(([month, ws]) => (
          <div key={month} className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-3.5 h-3.5 text-zinc-600" />
              <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider capitalize">{month}</p>
            </div>
            <div className="flex flex-col gap-2">
              {ws?.map(w => (
                <Link
                  key={w.id}
                  href={`/workouts/${w.id}`}
                  className="bg-[#111] border border-white/[0.07] rounded-2xl p-4 flex items-center justify-between active:bg-zinc-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Dumbbell className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-white font-semibold">{w.name}</p>
                      <p className="text-zinc-500 text-xs mt-0.5">
                        {new Date(w.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', weekday: 'short' })}
                        {w.duration_minutes ? ` · ${w.duration_minutes} мин` : ''}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-600 flex-shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
