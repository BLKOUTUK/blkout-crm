'use client'

import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SectionHeader } from './section-header'
import {
  UserPlus,
  ClipboardList,
  Wallet,
  BarChart3,
} from 'lucide-react'
import Link from 'next/link'

interface QuickAction {
  label: string
  icon: React.ElementType
  href: string
  color: 'teal' | 'gold' | 'orange' | 'forest'
}

interface QuickActionsProps {
  className?: string
}

const actions: QuickAction[] = [
  {
    label: 'Add Contact',
    icon: UserPlus,
    href: '/contacts/new',
    color: 'teal',
  },
  {
    label: 'Log Activity',
    icon: ClipboardList,
    href: '/activities/new',
    color: 'gold',
  },
  {
    label: 'Create Grant',
    icon: Wallet,
    href: '/grants/new',
    color: 'orange',
  },
  {
    label: 'View Reports',
    icon: BarChart3,
    href: '/reports',
    color: 'forest',
  },
]

const colorConfig = {
  teal: {
    bg: 'bg-blkout-teal/10 hover:bg-blkout-teal/20',
    icon: 'text-blkout-teal',
    border: 'border-blkout-teal/20',
  },
  gold: {
    bg: 'bg-blkout-gold/10 hover:bg-blkout-gold/20',
    icon: 'text-blkout-gold',
    border: 'border-blkout-gold/20',
  },
  orange: {
    bg: 'bg-blkout-orange/10 hover:bg-blkout-orange/20',
    icon: 'text-blkout-orange',
    border: 'border-blkout-orange/20',
  },
  forest: {
    bg: 'bg-blkout-forest/10 hover:bg-blkout-forest/20',
    icon: 'text-blkout-forest',
    border: 'border-blkout-forest/20',
  },
}

export function QuickActions({ className }: QuickActionsProps) {
  return (
    <Card className={cn('animate-fade-in-up animate-delay-400', className)}>
      <CardHeader className="pb-2">
        <SectionHeader title="Quick Actions" />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {actions.map((action, index) => {
            const colors = colorConfig[action.color]
            const Icon = action.icon

            return (
              <Link key={action.label} href={action.href}>
                <Button
                  variant="outline"
                  className={cn(
                    'h-auto w-full flex-col gap-2 py-4 transition-all hover:scale-[1.02]',
                    colors.bg,
                    colors.border,
                    'animate-fade-in-up'
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <Icon className={cn('h-6 w-6', colors.icon)} />
                  <span className="text-xs font-medium text-blkout-forest">
                    {action.label}
                  </span>
                </Button>
              </Link>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
