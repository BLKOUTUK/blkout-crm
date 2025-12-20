'use client'

import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SectionHeader } from './section-header'
import { DataSource } from './data-source-badge'
import Link from 'next/link'
import { TrendingUp } from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts'

interface GrantStage {
  name: string
  count: number
  value?: number
}

interface GrantPipelineChartProps {
  stages: GrantStage[]
  pipelineValue?: number
  weightedValue?: number
  dataSource?: DataSource
  className?: string
}

const stageColors = [
  '#9CA3AF', // Research - gray
  '#3B82F6', // Preparing - blue
  '#6366F1', // Submitted - indigo
  '#8B5CF6', // Review - purple
  '#2A9D8F', // Active - teal
]

export function GrantPipelineChart({
  stages,
  pipelineValue = 0,
  weightedValue = 0,
  dataSource = 'mock',
  className,
}: GrantPipelineChartProps) {
  const chartData = stages.map((stage, index) => ({
    ...stage,
    fill: stageColors[index % stageColors.length],
  }))

  const totalGrants = stages.reduce((sum, s) => sum + s.count, 0)

  return (
    <Card className={cn('animate-fade-in-up', className)}>
      <CardHeader className="pb-2">
        <SectionHeader
          title="Grant Pipeline"
          description={`Pipeline Value: £${pipelineValue.toLocaleString()} | Weighted: £${weightedValue.toLocaleString()}`}
          icon={TrendingUp}
          dataSource={dataSource}
        />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Chart */}
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
              >
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 12, fill: '#64748B' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload
                      return (
                        <div className="rounded-lg border bg-background p-3 shadow-lg">
                          <p className="font-medium">{data.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {data.count} grants
                            {data.value && ` • £${data.value.toLocaleString()}`}
                          </p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Bar
                  dataKey="count"
                  radius={[0, 4, 4, 0]}
                  barSize={24}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 border-t pt-4">
            {stages.map((stage, index) => (
              <div key={stage.name} className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-sm"
                  style={{ backgroundColor: stageColors[index % stageColors.length] }}
                />
                <span className="text-xs text-muted-foreground">
                  {stage.name}: <strong className="text-foreground">{stage.count}</strong>
                </span>
              </div>
            ))}
            <span className="text-xs text-muted-foreground ml-auto">
              Total: <strong className="text-foreground">{totalGrants}</strong>
            </span>
          </div>

          <Link href="/grants">
            <Button variant="outline" className="w-full mt-2">
              View Pipeline
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
