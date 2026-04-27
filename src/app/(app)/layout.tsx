import BottomNav from '@/components/BottomNav'
import XPToastProvider from '@/components/XPToast'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-[#0a0a0a]">
      <XPToastProvider />
      <main className="flex-1 pb-20">{children}</main>
      <BottomNav />
    </div>
  )
}
