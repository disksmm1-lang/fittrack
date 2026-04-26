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
    <nav className="fixed bottom-0 left-0 right-0 z-50 pb-safe">
      <div className="mx-auto max-w-lg px-4 pb-3 pt-0">
        <div className="bg-[#111111] border border-white/[0.08] rounded-2xl shadow-2xl">
          <div className="flex justify-around items-center h-16 px-2">
            {tabs.map(({ href, icon: Icon, label }) => {
              const active = pathname.startsWith(href)
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${
                    active
                      ? 'text-white'
                      : 'text-zinc-600 active:text-zinc-400'
                  }`}
                >
                  <div className={`relative flex items-center justify-center w-8 h-8 rounded-xl transition-all ${
                    active ? 'bg-blue-600' : ''
                  }`}>
                    <Icon className="w-[18px] h-[18px]" />
                  </div>
                  <span className={`text-[10px] font-medium transition-colors ${active ? 'text-white' : 'text-zinc-600'}`}>
                    {label}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
}
