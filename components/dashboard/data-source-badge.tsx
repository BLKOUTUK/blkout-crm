'use client'

import { cn } from '@/lib/utils'
import { Wifi, WifiOff, AlertCircle, Loader2 } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export type DataSource = 'live' | 'mock' | 'loading' | 'error'

interface DataSourceBadgeProps {
  source: DataSource
  className?: string
  showLabel?: boolean
}

const sourceConfig = {
  live: {
    icon: Wifi,
    label: 'Live Data',
    description: 'Connected to database',
    dotClass: 'bg-blkout-teal',
    badgeClass: 'bg-emerald-50 text-blkout-teal border-emerald-200',
  },
  mock: {
    icon: WifiOff,
    label: 'Demo',
    description: 'Showing sample data',
    dotClass: 'bg-amber-500',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  loading: {
    icon: Loader2,
    label: 'Loading',
    description: 'Fetching data...',
    dotClass: 'bg-gray-400',
    badgeClass: 'bg-gray-50 text-gray-500 border-gray-200',
  },
  error: {
    icon: AlertCircle,
    label: 'Error',
    description: 'Failed to load data',
    dotClass: 'bg-blkout-red',
    badgeClass: 'bg-red-50 text-blkout-red border-red-200',
  },
}

export function DataSourceBadge({
  source,
  className,
  showLabel = true,
}: DataSourceBadgeProps) {
  const config = sourceConfig[source]
  const Icon = config.icon

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium',
              config.badgeClass,
              className
            )}
          >
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                config.dotClass,
                source === 'live' && 'animate-pulse-dot',
                source === 'loading' && 'animate-pulse'
              )}
            />
            {showLabel && <span>{config.label}</span>}
            {source === 'loading' && (
              <Icon className="h-3 w-3 animate-spin" />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          <p>{config.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Helper to determine data source from hook state
export function getDataSource({
  data,
  isLoading,
  error,
}: {
  data: unknown
  isLoading: boolean
  error: unknown
}): DataSource {
  if (isLoading) return 'loading'
  if (error) return 'error'
  if (data) return 'live'
  return 'mock'
}
