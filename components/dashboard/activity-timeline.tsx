'use client'

import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { SectionHeader } from './section-header'
import { DataSource } from './data-source-badge'
import {
  Users,
  Wallet,
  Building2,
  FileText,
  Mail,
  Phone,
  Calendar,
  MessageSquare,
  Activity,
} from 'lucide-react'

interface ActivityItem {
  id: string
  type: 'meeting' | 'grant' | 'partner' | 'policy' | 'email' | 'call' | 'event' | 'message' | 'other'
  title: string
  time: string
  description?: string
}

interface ActivityTimelineProps {
  activities: ActivityItem[]
  dataSource?: DataSource
  className?: string
}

const activityConfig = {
  meeting: {
    icon: Users,
    color: 'bg-blkout-teal',
    iconColor: 'text-blkout-teal',
  },
  grant: {
    icon: Wallet,
    color: 'bg-blkout-gold',
    iconColor: 'text-blkout-gold',
  },
  partner: {
    icon: Building2,
    color: 'bg-blkout-forest',
    iconColor: 'text-blkout-forest',
  },
  policy: {
    icon: FileText,
    color: 'bg-purple-500',
    iconColor: 'text-purple-500',
  },
  email: {
    icon: Mail,
    color: 'bg-blue-500',
    iconColor: 'text-blue-500',
  },
  call: {
    icon: Phone,
    color: 'bg-green-500',
    iconColor: 'text-green-500',
  },
  event: {
    icon: Calendar,
    color: 'bg-blkout-orange',
    iconColor: 'text-blkout-orange',
  },
  message: {
    icon: MessageSquare,
    color: 'bg-indigo-500',
    iconColor: 'text-indigo-500',
  },
  other: {
    icon: Activity,
    color: 'bg-gray-500',
    iconColor: 'text-gray-500',
  },
}

export function ActivityTimeline({
  activities,
  dataSource = 'mock',
  className,
}: ActivityTimelineProps) {
  return (
    <Card className={cn('animate-fade-in-up animate-delay-200', className)}>
      <CardHeader className="pb-2">
        <SectionHeader
          title="Recent Activity"
          icon={Activity}
          dataSource={dataSource}
        />
      </CardHeader>
      <CardContent>
        <div className="relative space-y-0">
          {/* Timeline line */}
          <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-gray-200" />

          {activities.map((activity, index) => {
            const config = activityConfig[activity.type]
            const Icon = config.icon

            return (
              <div
                key={activity.id}
                className={cn(
                  'relative flex gap-4 py-3 animate-fade-in-up',
                  index === 0 ? 'pt-0' : '',
                  index === activities.length - 1 ? 'pb-0' : ''
                )}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Timeline dot */}
                <div
                  className={cn(
                    'relative z-10 flex h-8 w-8 items-center justify-center rounded-full',
                    config.color + '/10'
                  )}
                >
                  <Icon className={cn('h-4 w-4', config.iconColor)} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-blkout-forest truncate">
                    {activity.title}
                  </p>
                  {activity.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {activity.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {activity.time}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
