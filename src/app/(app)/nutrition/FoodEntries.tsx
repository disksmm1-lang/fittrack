'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface FoodEntry {
  id: string
  food_name: string
  amount_grams: number
  calories: number
  protein_g: number
  fat_g: number
  carbs_g: number
}

export default function FoodEntries({ entries }: { entries: FoodEntry[] }) {
  const supabase = createClient()
  const router = useRouter()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleDelete(id: string) {
    setDeletingId(id)
    await supabase.from('food_entries').delete().eq('id', id)
    setActiveId(null)
    setDeletingId(null)
    router.refresh()
  }

  return (
    <div className="px-4 py-2">
      {entries.map((e, idx) => {
        const isActive = activeId === e.id
        const isDeleting = deletingId === e.id
        return (
          <div
            key={e.id}
            className={`relative flex items-center py-2.5 ${idx < entries.length - 1 ? 'border-b border-white/[0.04]' : ''}`}
          >
            {/* Основная строка */}
            <div
              className="flex-1 flex justify-between items-center cursor-pointer select-none"
              onClick={() => setActiveId(isActive ? null : e.id)}
            >
              <div>
                <p className="text-white text-sm font-medium">{e.food_name}</p>
                <p className="text-zinc-600 text-xs">{e.amount_grams}г</p>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-zinc-400 text-sm font-semibold">{Math.round(e.calories)} ккал</p>
                {isActive && (
                  <button
                    onClick={ev => { ev.stopPropagation(); handleDelete(e.id) }}
                    disabled={isDeleting}
                    className="w-8 h-8 bg-red-500/15 border border-red-500/30 rounded-lg flex items-center justify-center flex-shrink-0 active:bg-red-500/30 transition-colors"
                  >
                    {isDeleting
                      ? <span className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin block" />
                      : <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    }
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
