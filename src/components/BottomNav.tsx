'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Dumbbell, Apple, Sparkles, User } from 'lucide-react'

const tabs = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Главная' },
  { href: '/workouts', icon: Dumbbell, label: 'Тренировки' },
  { href: '/nutrition', icon: Apple, label: 'Питание' },
  { href: '/ai', icon: Sparkles, label: 'ИИ' },
  { href: '/profile', icon: User, label: 'Профиль' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-zinc-900/95 backdrop-blur border-t border-zinc-800 pb-safe z-50">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-2">
        {tabs.map(({ href, icon: Icon, label }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-colors ${
                active ? 'text-indigo-400' : 'text-zinc-500'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
