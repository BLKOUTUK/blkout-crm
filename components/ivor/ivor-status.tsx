'use client'

import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useIvorHealth } from '@/hooks/use-ivor'
import { Bot, CheckCircle, AlertCircle, XCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function IvorStatus({ className }: { className?: string }) {
  const { data: health, isLoading, refetch, isRefetching } = useIvorHealth()

  const statusConfig = {
    healthy: {
      icon: CheckCircle,
      color: 'text-green-500',
      bgColor: 'bg-green-50',
      badgeVariant: 'default' as const,
      label: 'Online',
    },
    degraded: {
      icon: AlertCircle,
      color: 'text-orange-500',
      bgColor: 'bg-orange-50',
      badgeVariant: 'secondary' as const,
      label: 'Degraded',
    },
    unhealthy: {
      icon: XCircle,
      color: 'text-red-500',
      bgColor: 'bg-red-50',
      badgeVariant: 'destructive' as const,
      label: 'Offline',
    },
  }

  const status = health?.status || 'unhealthy'
  const config = statusConfig[status]
  const StatusIcon = config.icon

  return (
    <Card className={cn('animate-fade-in-up', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bot className="h-5 w-5 text-blkout-teal" />
            AIvor Status
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading || isRefetching}
          >
            <RefreshCw className={cn('h-4 w-4', (isLoading || isRefetching) && 'animate-spin')} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <div className="h-10 bg-gray-100 rounded animate-pulse" />
            <div className="h-4 bg-gray-100 rounded w-3/4 animate-pulse" />
            <div className="h-4 bg-gray-100 rounded w-1/2 animate-pulse" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Status Indicator */}
            <div className={cn('flex items-center gap-3 p-3 rounded-lg', config.bgColor)}>
              <StatusIcon className={cn('h-6 w-6', config.color)} />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-blkout-forest">
                    {health?.name || 'AIvor Core'}
                  </span>
                  <Badge variant={config.badgeVariant}>
                    {config.label}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {health?.communityImpact || 'Connecting to service...'}
                </p>
              </div>
            </div>

            {/* Capabilities */}
            {health?.capabilities && health.capabilities.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-blkout-forest">Capabilities</p>
                <div className="flex flex-wrap gap-2">
                  {health.capabilities.map((capability, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {capability.replace(/-/g, ' ')}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Last Updated */}
            {health?.timestamp && (
              <p className="text-xs text-muted-foreground">
                Last checked: {new Date(health.timestamp).toLocaleTimeString()}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
