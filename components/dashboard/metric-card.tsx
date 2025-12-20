'use client'

import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { LucideIcon, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { AnimatedCounter, AnimatedCurrency } from './animated-counter'
import { Sparkline } from './sparkline'
import { DataSourceBadge, type DataSource } from './data-source-badge'

interface MetricCardProps {
  title: string
  value: number
  change?: string
  changeType?: 'positive' | 'negative' | 'neutral'
  icon: LucideIcon
  href: string
  accentColor?: 'teal' | 'gold' | 'orange' | 'forest' | 'red'
  isCurrency?: boolean
  prefix?: string
  suffix?: string
  sparklineData?: number[]
  dataSource?: DataSource
  className?: string
}

const accentColors = {
  teal: {
    border: 'border-l-blkout-teal',
    bg: 'bg-blkout-teal/10',
    icon: 'text-blkout-teal',
  },
  gold: {
    border: 'border-l-blkout-gold',
    bg: 'bg-blkout-gold/10',
    icon: 'text-blkout-gold',
  },
  orange: {
    border: 'border-l-blkout-orange',
    bg: 'bg-blkout-orange/10',
    icon: 'text-blkout-orange',
  },
  forest: {
    border: 'border-l-blkout-forest',
    bg: 'bg-blkout-forest/10',
    icon: 'text-blkout-forest',
  },
  red: {
    border: 'border-l-blkout-red',
    bg: 'bg-blkout-red/10',
    icon: 'text-blkout-red',
  },
}

export function MetricCard({
  title,
  value,
  change,
  changeType = 'neutral',
  icon: Icon,
  href,
  accentColor = 'teal',
  isCurrency = false,
  prefix = '',
  suffix = '',
  sparklineData,
  dataSource,
  className,
}: MetricCardProps) {
  const colors = accentColors[accentColor]

  const changeColors = {
    positive: 'text-blkout-teal',
    negative: 'text-blkout-red',
    neutral: 'text-muted-foreground',
  }

  return (
    <Card
      className={cn(
        'card-hover-lift border-l-4 animate-fade-in-up',
        colors.border,
        dataSource === 'mock' && 'opacity-90',
        className
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            {title}
          </span>
          {dataSource && <DataSourceBadge source={dataSource} showLabel={false} />}
        </div>
        <div className={cn('rounded-lg p-2', colors.bg)}>
          <Icon className={cn('h-4 w-4', colors.icon)} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="text-3xl font-bold font-display text-blkout-forest">
            {isCurrency ? (
              <AnimatedCurrency value={value} />
            ) : (
              <AnimatedCounter value={value} prefix={prefix} suffix={suffix} />
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {change && (
                <p className={cn('text-xs font-medium', changeColors[changeType])}>
                  {change}
                </p>
              )}
              {sparklineData && sparklineData.length > 1 && (
                <Sparkline data={sparklineData} height={24} showTrend={false} />
              )}
            </div>
          </div>

          <Link
            href={href}
            className="inline-flex items-center text-xs font-medium text-blkout-teal hover:text-blkout-forest transition-colors"
          >
            View all <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
