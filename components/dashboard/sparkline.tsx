'use client'

import { cn } from '@/lib/utils'
import { ResponsiveContainer, LineChart, Line, YAxis } from 'recharts'

interface SparklineProps {
  data: number[]
  color?: string
  height?: number
  className?: string
  showTrend?: boolean
}

export function Sparkline({
  data,
  color = '#2A9D8F',
  height = 32,
  className,
  showTrend = true,
}: SparklineProps) {
  if (!data || data.length < 2) {
    return null
  }

  const chartData = data.map((value, index) => ({ value, index }))
  const lastValue = data[data.length - 1]
  const firstValue = data[0]
  const trend = lastValue > firstValue ? 'up' : lastValue < firstValue ? 'down' : 'flat'
  const trendPercentage = firstValue
    ? (((lastValue - firstValue) / firstValue) * 100).toFixed(1)
    : '0'

  const trendColors = {
    up: 'text-blkout-teal',
    down: 'text-blkout-red',
    flat: 'text-muted-foreground',
  }

  const trendIcons = {
    up: '↑',
    down: '↓',
    flat: '→',
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div style={{ width: 80, height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <YAxis domain={['dataMin', 'dataMax']} hide />
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {showTrend && (
        <span className={cn('text-xs font-medium', trendColors[trend])}>
          {trendIcons[trend]} {Math.abs(Number(trendPercentage))}%
        </span>
      )}
    </div>
  )
}
