'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { SectionHeader } from './section-header'
import { DataSource } from './data-source-badge'
import { CheckSquare, GripVertical } from 'lucide-react'
import Link from 'next/link'

type Priority = 'urgent' | 'high' | 'medium' | 'low'

interface Task {
  id: string
  title: string
  due: string
  priority: Priority
  completed?: boolean
}

interface TaskListProps {
  tasks: Task[]
  pendingCount?: number
  overdueCount?: number
  dataSource?: DataSource
  onTaskComplete?: (taskId: string, completed: boolean) => void
  className?: string
}

const priorityConfig: Record<Priority, { color: string; label: string }> = {
  urgent: { color: 'bg-blkout-red', label: 'Urgent' },
  high: { color: 'bg-blkout-orange', label: 'High' },
  medium: { color: 'bg-blkout-gold', label: 'Medium' },
  low: { color: 'bg-blkout-teal', label: 'Low' },
}

export function TaskList({
  tasks,
  pendingCount = 0,
  overdueCount = 0,
  dataSource = 'mock',
  onTaskComplete,
  className,
}: TaskListProps) {
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(
    new Set(tasks.filter((t) => t.completed).map((t) => t.id))
  )

  const handleCheckChange = (taskId: string, checked: boolean) => {
    setCompletedTasks((prev) => {
      const next = new Set(prev)
      if (checked) {
        next.add(taskId)
      } else {
        next.delete(taskId)
      }
      return next
    })
    onTaskComplete?.(taskId, checked)
  }

  const description = `${pendingCount} pending${overdueCount > 0 ? `, ${overdueCount} overdue` : ''}`

  return (
    <Card className={cn('animate-fade-in-up animate-delay-300', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <SectionHeader
            title="My Tasks"
            description={description}
            icon={CheckSquare}
            dataSource={dataSource}
          />
          <Link href="/tasks">
            <Button variant="outline" size="sm">
              View All
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-2">
          {tasks.map((task, index) => {
            const isCompleted = completedTasks.has(task.id)
            const priority = priorityConfig[task.priority]

            return (
              <div
                key={task.id}
                className={cn(
                  'group flex items-center gap-3 rounded-lg border-l-4 border p-3 transition-all',
                  isCompleted
                    ? 'border-l-gray-300 bg-gray-50 opacity-60'
                    : `${priority.color.replace('bg-', 'border-l-')} bg-white hover:shadow-sm`,
                  'animate-fade-in-up'
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Drag handle (for future reorder) */}
                <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-50 cursor-grab shrink-0" />

                {/* Checkbox */}
                <Checkbox
                  id={task.id}
                  checked={isCompleted}
                  onCheckedChange={(checked) =>
                    handleCheckChange(task.id, checked as boolean)
                  }
                  className="shrink-0"
                />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <label
                    htmlFor={task.id}
                    className={cn(
                      'text-sm font-medium cursor-pointer truncate block',
                      isCompleted
                        ? 'line-through text-muted-foreground'
                        : 'text-blkout-forest'
                    )}
                  >
                    {task.title}
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">
                      Due: {task.due}
                    </span>
                    {!isCompleted && (
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px] px-1.5 py-0',
                          task.priority === 'urgent' && 'border-blkout-red text-blkout-red',
                          task.priority === 'high' && 'border-blkout-orange text-blkout-orange'
                        )}
                      >
                        {priority.label}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {tasks.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No tasks - you&apos;re all caught up!
          </div>
        )}
      </CardContent>
    </Card>
  )
}
