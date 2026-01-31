'use client'

import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useIvorStats } from '@/hooks/use-ivor'
import { DataSourceBadge } from '@/components/dashboard'
import {
  MessageSquare,
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
} from 'lucide-react'

interface IvorStatsProps {
  className?: string
}

export function IvorStats({ className }: IvorStatsProps) {
  const { data: stats, isLoading, isError } = useIvorStats()

  const trendIcon = {
    up: <TrendingUp className="h-4 w-4 text-green-500" />,
    down: <TrendingDown className="h-4 w-4 text-red-500" />,
    stable: <Minus className="h-4 w-4 text-gray-500" />,
  }

  if (isError) {
    return (
      <Card className={cn(className)}>
        <CardContent className="p-6 text-center text-muted-foreground">
          Failed to load AIvor statistics
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('animate-fade-in-up', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5 text-blkout-teal" />
            AIvor Analytics
          </CardTitle>
          <DataSourceBadge source={stats ? 'live' : 'mock'} />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-blkout-teal/5 border border-blkout-teal/20">
                <div className="flex items-center gap-2 text-blkout-teal mb-1">
                  <MessageSquare className="h-4 w-4" />
                  <span className="text-xs font-medium">Total Queries</span>
                </div>
                <p className="text-2xl font-bold text-blkout-forest">
                  {stats?.totalQueries || 0}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-blkout-gold/5 border border-blkout-gold/20">
                <div className="flex items-center gap-2 text-blkout-gold mb-1">
                  <Users className="h-4 w-4" />
                  <span className="text-xs font-medium">Active Users</span>
                </div>
                <p className="text-2xl font-bold text-blkout-forest">
                  {stats?.activeUsers || 0}
                </p>
              </div>
            </div>

            {/* Weekly Trend */}
            <div className="p-4 rounded-lg bg-gray-50 border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blkout-forest">
                  This Week
                </span>
                <div className="flex items-center gap-1">
                  {trendIcon[stats?.queryTrend || 'stable']}
                  <span className="text-sm text-muted-foreground">
                    {stats?.queriesThisWeek || 0} queries
                  </span>
                </div>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blkout-teal rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min((stats?.queriesThisWeek || 0) * 5, 100)}%`
                  }}
                />
              </div>
            </div>

            {/* Top Topics */}
            {stats?.topTopics && stats.topTopics.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-blkout-forest">
                  Popular Topics
                </p>
                <div className="space-y-2">
                  {stats.topTopics.slice(0, 4).map((topic, index) => (
                    <div
                      key={topic.topic}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-muted-foreground truncate">
                        {index + 1}. {topic.topic}
                      </span>
                      <span className="font-medium text-blkout-forest">
                        {topic.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No data state */}
            {(!stats?.topTopics || stats.topTopics.length === 0) &&
             stats?.totalQueries === 0 && (
              <div className="text-center py-4 text-muted-foreground text-sm">
                No AIvor interactions recorded yet.
                <br />
                Start chatting to see analytics.
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
