'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  Building2,
  Wallet,
  FileText,
  Calendar,
  Bot,
  CheckSquare,
  Settings,
  ChevronDown,
} from 'lucide-react'
import { useState } from 'react'

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Contacts',
    href: '/contacts',
    icon: Users,
    children: [
      { name: 'All Contacts', href: '/contacts' },
      { name: 'CBS Members', href: '/contacts?type=cbs_member' },
      { name: 'Community', href: '/contacts?type=community_member' },
      { name: 'Import', href: '/contacts/import' },
    ],
  },
  {
    name: 'Organizations',
    href: '/organizations',
    icon: Building2,
    children: [
      { name: 'All Organizations', href: '/organizations' },
      { name: 'By Sector', href: '/organizations/sectors' },
      { name: 'Funders', href: '/organizations?type=funder_foundation' },
    ],
  },
  {
    name: 'Funding',
    href: '/grants',
    icon: Wallet,
    children: [
      { name: 'Pipeline', href: '/grants' },
      { name: 'Donations', href: '/grants/donations' },
      { name: 'Reports', href: '/grants/reports' },
    ],
  },
  {
    name: 'Policy',
    href: '/policy',
    icon: FileText,
    children: [
      { name: 'Engagements', href: '/policy' },
      { name: 'Submissions', href: '/policy/submissions' },
    ],
  },
  {
    name: 'Events',
    href: '/events',
    icon: Calendar,
  },
  {
    name: 'AIvor Insights',
    href: '/ivor',
    icon: Bot,
  },
  {
    name: 'Tasks',
    href: '/tasks',
    icon: CheckSquare,
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const [expandedItems, setExpandedItems] = useState<string[]>([])

  const toggleExpanded = (name: string) => {
    setExpandedItems((prev) =>
      prev.includes(name)
        ? prev.filter((item) => item !== name)
        : [...prev, name]
    )
  }

  return (
    <div className="flex h-full w-64 flex-col border-r bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-2xl">🏴</span>
          <span className="font-display text-xl font-bold text-blkout-black">
            BLKOUT CRM
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            const isExpanded = expandedItems.includes(item.name)
            const hasChildren = item.children && item.children.length > 0

            return (
              <li key={item.name}>
                <div className="flex flex-col">
                  <button
                    onClick={() => hasChildren && toggleExpanded(item.name)}
                    className={cn(
                      'flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-blkout-gold/10 text-blkout-gold'
                        : 'text-gray-700 hover:bg-gray-100'
                    )}
                  >
                    <Link
                      href={item.href}
                      className="flex items-center gap-3"
                      onClick={(e) => hasChildren && e.preventDefault()}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.name}
                    </Link>
                    {hasChildren && (
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 transition-transform',
                          isExpanded && 'rotate-180'
                        )}
                      />
                    )}
                  </button>

                  {hasChildren && isExpanded && (
                    <ul className="ml-8 mt-1 space-y-1">
                      {item.children.map((child) => (
                        <li key={child.name}>
                          <Link
                            href={child.href}
                            className={cn(
                              'block rounded-lg px-3 py-2 text-sm transition-colors',
                              pathname === child.href
                                ? 'bg-blkout-gold/10 text-blkout-gold'
                                : 'text-gray-600 hover:bg-gray-100'
                            )}
                          >
                            {child.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User */}
      <div className="border-t p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blkout-gold text-white">
            RB
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-medium">Robert Berkeley</p>
            <p className="truncate text-xs text-gray-500">rob@blkoutuk.com</p>
          </div>
        </div>
      </div>
    </div>
  )
}
