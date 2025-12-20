'use client'

import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SectionHeader } from './section-header'
import { DataSource } from './data-source-badge'
import Link from 'next/link'
import { Building2 } from 'lucide-react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts'

interface PartnerType {
  name: string
  count: number
  color: string
}

interface PartnerDonutChartProps {
  types: PartnerType[]
  dataSource?: DataSource
  className?: string
}

export function PartnerDonutChart({
  types,
  dataSource = 'mock',
  className,
}: PartnerDonutChartProps) {
  const total = types.reduce((sum, t) => sum + t.count, 0)

  return (
    <Card className={cn('animate-fade-in-up animate-delay-100', className)}>
      <CardHeader className="pb-2">
        <SectionHeader
          title="Partner Organizations"
          description={`${total} active partners`}
          icon={Building2}
          dataSource={dataSource}
        />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Chart with center label */}
          <div className="relative h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={types}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={2}
                  dataKey="count"
                  stroke="none"
                >
                  {types.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload
                      const percentage = ((data.count / total) * 100).toFixed(0)
                      return (
                        <div className="rounded-lg border bg-background p-3 shadow-lg">
                          <p className="font-medium">{data.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {data.count} organizations ({percentage}%)
                          </p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <div className="text-2xl font-bold font-display text-blkout-forest">
                  {total}
                </div>
                <div className="text-xs text-muted-foreground">Partners</div>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 gap-2">
            {types.map((type) => (
              <div key={type.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: type.color }}
                  />
                  <span className="text-xs text-muted-foreground">{type.name}</span>
                </div>
                <span className="text-xs font-medium">{type.count}</span>
              </div>
            ))}
          </div>

          <Link href="/organizations">
            <Button variant="outline" className="w-full">
              View Organizations
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
