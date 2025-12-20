'use client'

import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SectionHeader } from './section-header'
import { DataSource } from './data-source-badge'
import { Calendar, AlertTriangle, Clock, CheckCircle } from 'lucide-react'

interface Deadline {
  id: string
  title: string
  date: string
  daysLeft: number
  type: 'grant' | 'report' | 'renewal' | 'event' | 'other'
}

interface DeadlineCalendarProps {
  deadlines: Deadline[]
  dataSource?: DataSource
  className?: string
}

function getUrgencyConfig(daysLeft: number) {
  if (daysLeft <= 7) {
    return {
      color: 'bg-blkout-red',
      textColor: 'text-blkout-red',
      borderColor: 'border-blkout-red',
      bgColor: 'bg-red-50',
      icon: AlertTriangle,
      label: 'Urgent',
    }
  }
  if (daysLeft <= 30) {
    return {
      color: 'bg-blkout-orange',
      textColor: 'text-blkout-orange',
      borderColor: 'border-blkout-orange',
      bgColor: 'bg-orange-50',
      icon: Clock,
      label: 'Soon',
    }
  }
  return {
    color: 'bg-blkout-teal',
    textColor: 'text-blkout-teal',
    borderColor: 'border-blkout-teal',
    bgColor: 'bg-teal-50',
    icon: CheckCircle,
    label: 'On Track',
  }
}

const typeLabels: Record<Deadline['type'], string> = {
  grant: 'Grant',
  report: 'Report',
  renewal: 'Renewal',
  event: 'Event',
  other: 'Other',
}

export function DeadlineCalendar({
  deadlines,
  dataSource = 'mock',
  className,
}: DeadlineCalendarProps) {
  // Sort by days left
  const sortedDeadlines = [...deadlines].sort((a, b) => a.daysLeft - b.daysLeft)

  return (
    <Card className={cn('animate-fade-in-up animate-delay-100', className)}>
      <CardHeader className="pb-2">
        <SectionHeader
          title="Upcoming Deadlines"
          icon={Calendar}
          dataSource={dataSource}
        />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sortedDeadlines.map((deadline, index) => {
            const urgency = getUrgencyConfig(deadline.daysLeft)
            const UrgencyIcon = urgency.icon

            return (
              <div
                key={deadline.id}
                className={cn(
                  'flex items-center justify-between rounded-lg border-l-4 p-3 transition-colors',
                  urgency.borderColor,
                  urgency.bgColor,
                  'animate-fade-in-up'
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Urgency indicator */}
                  <div
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full shrink-0',
                      urgency.color + '/20'
                    )}
                  >
                    <UrgencyIcon className={cn('h-4 w-4', urgency.textColor)} />
                  </div>

                  {/* Content */}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-blkout-forest truncate">
                      {deadline.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">
                        {deadline.date}
                      </span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className={cn('text-xs font-semibold', urgency.textColor)}>
                        {deadline.daysLeft} days
                      </span>
                    </div>
                  </div>
                </div>

                {/* Type badge */}
                <Badge
                  variant="outline"
                  className="shrink-0 ml-2 text-xs"
                >
                  {typeLabels[deadline.type]}
                </Badge>
              </div>
            )
          })}

          {deadlines.length === 0 && (
            <div className="text-center py-6 text-muted-foreground text-sm">
              No upcoming deadlines
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
