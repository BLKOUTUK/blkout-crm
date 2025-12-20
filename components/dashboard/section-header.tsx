'use client'

import { cn } from '@/lib/utils'
import { DataSourceBadge, type DataSource } from './data-source-badge'
import { LucideIcon } from 'lucide-react'

interface SectionHeaderProps {
  title: string
  description?: string
  icon?: LucideIcon
  dataSource?: DataSource
  action?: React.ReactNode
  className?: string
}

export function SectionHeader({
  title,
  description,
  icon: Icon,
  dataSource,
  action,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blkout-teal/10">
            <Icon className="h-5 w-5 text-blkout-teal" />
          </div>
        )}
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-lg font-semibold text-blkout-forest">
              {title}
            </h2>
            {dataSource && <DataSourceBadge source={dataSource} showLabel={false} />}
          </div>
          {description && (
            <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}
