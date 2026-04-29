'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  Building2,
  Wallet,
  PoundSterling,
  FileText,
  Calendar,
  Bot,
  CheckSquare,
  ClipboardList,
  Settings,
} from 'lucide-react'

const navigation = [
  { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Contacts', href: '/contacts', icon: Users },
  { name: 'Organisations', href: '/organizations', icon: Building2 },
  { name: 'Funding', href: '/grants', icon: Wallet },
  { name: 'Policy', href: '/policy', icon: FileText },
  { name: 'Financial', href: '/financial', icon: PoundSterling },
  { name: 'Evidence', href: '/evidence', icon: ClipboardList },
  { name: 'Events', href: '/events', icon: Calendar },
  { name: 'AIvor', href: '/ivor', icon: Bot },
  { name: 'Tasks', href: '/tasks', icon: CheckSquare },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex h-full w-64 flex-col border-r border-[#d4af37]/30 bg-[#0a0a14]">
      {/* Wordmark */}
      <div className="border-b border-[#d4af37]/30 px-6 py-6">
        <Link href="/dashboard" className="block">
          <div className="font-meta text-[#d4af37]">BLKOUT</div>
          <div className="mt-1 font-display text-2xl text-[#f5f1e8]">CRM</div>
          <div className="mt-1 font-tender text-xs text-[#a8a195]">relational memory</div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-6">
        <ul className="space-y-0">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    'group flex items-center gap-3 border-l-2 px-4 py-2.5 text-sm transition-colors',
                    isActive
                      ? 'border-[#d4af37] bg-[#14141f] text-[#d4af37]'
                      : 'border-transparent text-[#a8a195] hover:border-[#d4af37]/40 hover:text-[#f5f1e8]'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span className={isActive ? 'font-meta' : ''}>{item.name}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer signature */}
      <div className="border-t border-[#d4af37]/30 px-6 py-5">
        <div className="font-meta text-[10px] text-[#a8a195]">Cooperatively held</div>
        <div className="mt-1 font-tender text-sm text-[#f5f1e8]">Rob Berkeley</div>
        <div className="font-tender text-xs text-[#a8a195]">rob@blkoutuk.com</div>
      </div>
    </aside>
  )
}
