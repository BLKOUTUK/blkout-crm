'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Loader2,
  AlertCircle,
  Heart,
  Coins,
  Smile,
  Cog,
  Shield,
  Download,
  Printer,
  ChevronLeft,
  ChevronRight,
  Users,
  TrendingUp,
  Calendar,
  BarChart3,
  Building2,
} from 'lucide-react'
import {
  useQuarterRange,
  useHealthMetrics,
  useWealthMetrics,
  useHappinessMetrics,
  useMethodMetrics,
  useGovernanceMetrics,
} from '@/hooks/use-evidence'

function formatGBP(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
  }).format(amount)
}

const categoryLabels: Record<string, string> = {
  grant_income: 'Grants',
  donations: 'Donations',
  membership_fees: 'Membership',
  event_income: 'Events',
  merchandise: 'Merchandise',
  staff_costs: 'Staff',
  event_costs: 'Events',
  office_costs: 'Office',
  marketing: 'Marketing',
  professional_fees: 'Professional Fees',
  travel: 'Travel',
  other: 'Other',
}

export default function EvidencePage() {
  const [quarterOffset, setQuarterOffset] = useState(0)
  const quarter = useQuarterRange(quarterOffset)

  const health = useHealthMetrics(quarter)
  const wealth = useWealthMetrics(quarter)
  const happiness = useHappinessMetrics(quarter)
  const method = useMethodMetrics()
  const governance = useGovernanceMetrics()

  const isLoading = health.isLoading || wealth.isLoading || happiness.isLoading || method.isLoading || governance.isLoading
  const hasError = health.error || wealth.error || happiness.error || method.error || governance.error

  const handlePrint = () => {
    window.print()
  }

  const handleExportJSON = () => {
    const report = {
      quarter: quarter.label,
      period: { start: quarter.start, end: quarter.end },
      generated: new Date().toISOString(),
      sections: {
        health: health.data,
        wealth: wealth.data,
        happiness: happiness.data,
        method: method.data,
        governance: governance.data,
      },
    }
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `blkout-evidence-${quarter.label.replace(' ', '-')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blkout-teal" />
          <p className="text-sm text-muted-foreground">Collecting evidence data for {quarter.label}...</p>
        </div>
      </div>
    )
  }

  if (hasError) {
    const errorMsg = (health.error || wealth.error || happiness.error || method.error || governance.error) as Error
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-center max-w-md">
          <AlertCircle className="h-8 w-8 text-blkout-red" />
          <p className="text-sm font-medium">Failed to load evidence data</p>
          <p className="text-xs text-muted-foreground">{errorMsg?.message}</p>
          <Button variant="outline" size="sm" onClick={() => {
            health.refetch()
            wealth.refetch()
            happiness.refetch()
            method.refetch()
            governance.refetch()
          }}>
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  const h = health.data
  const w = wealth.data
  const hp = happiness.data
  const m = method.data
  const g = governance.data

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="font-display text-3xl font-bold text-blkout-forest">
            Quarterly Evidence Report
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Year One Digital Infrastructure — Board & Funder Evidence Pack
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setQuarterOffset(quarterOffset - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Badge variant="outline" className="text-sm px-3 py-1">
            {quarter.label}
          </Badge>
          <Button variant="outline" size="sm" onClick={() => setQuarterOffset(quarterOffset + 1)} disabled={quarterOffset >= 0}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <div className="w-px h-6 bg-gray-200 mx-1" />
          <Button variant="outline" size="sm" onClick={handleExportJSON}>
            <Download className="mr-2 h-4 w-4" />
            JSON
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        </div>
      </div>

      {/* Print header */}
      <div className="hidden print:block text-center mb-8">
        <h1 className="text-2xl font-bold">BLKOUT Year One — Quarterly Evidence Report</h1>
        <p className="text-sm text-gray-600">{quarter.label} ({quarter.start} to {quarter.end})</p>
        <p className="text-xs text-gray-400">Generated {new Date().toLocaleDateString('en-GB')}</p>
      </div>

      {/* Section 1: HEALTH */}
      <Card className="border-l-4 border-l-rose-500 print:break-inside-avoid">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Heart className="h-5 w-5 text-rose-500" />
            Health — Community Wellbeing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <MetricCard icon={Users} label="Total Contacts" value={h?.totalContacts ?? 0} />
            <MetricCard icon={TrendingUp} label="Active" value={h?.activeContacts ?? 0} color="text-blkout-teal" />
            <MetricCard icon={Users} label="Dormant" value={h?.dormantContacts ?? 0} color="text-amber-500" />
            <MetricCard icon={Users} label="New This Quarter" value={h?.newContactsThisQuarter ?? 0} color="text-blue-500" />
            <MetricCard icon={Users} label="CBS Members" value={h?.cbsMembers ?? 0} color="text-purple-500" />
          </div>
          {h?.engagementBreakdown && h.engagementBreakdown.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-muted-foreground mb-2">Engagement Breakdown</p>
              <div className="flex flex-wrap gap-2">
                {h.engagementBreakdown.map((e) => (
                  <Badge key={e.level} variant="outline" className="text-xs">
                    {e.level}: {e.count}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 2: WEALTH */}
      <Card className="border-l-4 border-l-blkout-gold print:break-inside-avoid">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Coins className="h-5 w-5 text-blkout-gold" />
            Wealth — Financial Sustainability
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="text-center p-4 bg-blkout-teal/5 rounded-lg">
              <p className="text-sm text-muted-foreground">Income</p>
              <p className="text-2xl font-bold text-blkout-teal">{formatGBP(w?.totalIncome ?? 0)}</p>
            </div>
            <div className="text-center p-4 bg-blkout-red/5 rounded-lg">
              <p className="text-sm text-muted-foreground">Expenses</p>
              <p className="text-2xl font-bold text-blkout-red">{formatGBP(w?.totalExpenses ?? 0)}</p>
            </div>
            <div className="text-center p-4 bg-blkout-gold/5 rounded-lg">
              <p className="text-sm text-muted-foreground">Net Balance</p>
              <p className={`text-2xl font-bold ${(w?.netBalance ?? 0) >= 0 ? 'text-blkout-teal' : 'text-blkout-red'}`}>
                {formatGBP(w?.netBalance ?? 0)}
              </p>
            </div>
          </div>
          {((w?.incomeByCategory?.length ?? 0) > 0 || (w?.expenseByCategory?.length ?? 0) > 0) && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {(w?.incomeByCategory?.length ?? 0) > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Income Sources</p>
                  {w?.incomeByCategory?.map((c) => (
                    <div key={c.category} className="flex justify-between text-sm py-1">
                      <span>{categoryLabels[c.category] || c.category}</span>
                      <span className="font-medium text-blkout-teal">{formatGBP(c.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
              {(w?.expenseByCategory?.length ?? 0) > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Expense Areas</p>
                  {w?.expenseByCategory?.map((c) => (
                    <div key={c.category} className="flex justify-between text-sm py-1">
                      <span>{categoryLabels[c.category] || c.category}</span>
                      <span className="font-medium text-blkout-red">{formatGBP(c.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 3: HAPPINESS */}
      <Card className="border-l-4 border-l-amber-500 print:break-inside-avoid">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Smile className="h-5 w-5 text-amber-500" />
            Happiness — Community Participation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard icon={Calendar} label="Events" value={hp?.totalEvents ?? 0} />
            <MetricCard icon={Users} label="RSVPs" value={hp?.totalRsvps ?? 0} color="text-blue-500" />
            <MetricCard icon={TrendingUp} label="Check-in Rate" value={`${hp?.checkInRate ?? 0}%`} color="text-blkout-teal" />
            <MetricCard icon={BarChart3} label="Avg RSVPs/Event" value={hp?.avgRsvpsPerEvent ?? 0} color="text-purple-500" />
          </div>
          {hp?.topEvents && hp.topEvents.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-muted-foreground mb-2">Top Events</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 pr-4 font-medium">Event</th>
                      <th className="pb-2 pr-4 font-medium text-right">RSVPs</th>
                      <th className="pb-2 font-medium text-right">Checked In</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hp.topEvents.map((e, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-2 pr-4">{e.title}</td>
                        <td className="py-2 pr-4 text-right">{e.rsvp_count}</td>
                        <td className="py-2 text-right">{e.checked_in}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 4: METHOD */}
      <Card className="border-l-4 border-l-blue-500 print:break-inside-avoid">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Cog className="h-5 w-5 text-blue-500" />
            Method — Operational Infrastructure
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <MetricCard icon={Cog} label="Automations" value={m?.automationsRunning ?? 0} />
            <MetricCard icon={BarChart3} label="CRM Pages" value={m?.crmPagesActive ?? 0} color="text-blue-500" />
            <MetricCard icon={Users} label="Subscribers" value={m?.newsletterSubscribers ?? 0} color="text-purple-500" />
            <MetricCard icon={Calendar} label="Content Items" value={m?.contentItemsPublished ?? 0} color="text-blkout-teal" />
            <MetricCard icon={TrendingUp} label="Uptime" value={m?.platformUptime ?? 'N/A'} color="text-green-500" />
          </div>
        </CardContent>
      </Card>

      {/* Section 5: GOVERNANCE */}
      <Card className="border-l-4 border-l-purple-500 print:break-inside-avoid">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-purple-500" />
            Governance — Democratic Accountability
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard icon={Users} label="Board Members" value={g?.boardMembers ?? 0} />
            <MetricCard icon={Building2} label="Organizations" value={g?.totalOrganizations ?? 0} color="text-blue-500" />
            <MetricCard icon={Building2} label="Partners" value={g?.partnerOrganizations ?? 0} color="text-blkout-teal" />
            <MetricCard icon={Building2} label="Funders" value={g?.funderOrganizations ?? 0} color="text-blkout-gold" />
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-muted-foreground">Grants in Pipeline</p>
              <p className="text-lg font-bold">{g?.grantsInPipeline ?? 0}</p>
            </div>
            <div className="text-center p-3 bg-blkout-teal/5 rounded-lg">
              <p className="text-xs text-muted-foreground">Grants Approved</p>
              <p className="text-lg font-bold text-blkout-teal">{g?.grantsApproved ?? 0}</p>
            </div>
            <div className="text-center p-3 bg-blkout-gold/5 rounded-lg">
              <p className="text-xs text-muted-foreground">Total Grant Value</p>
              <p className="text-lg font-bold text-blkout-gold">{formatGBP(g?.totalGrantValue ?? 0)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Print footer */}
      <div className="hidden print:block text-center text-xs text-gray-400 mt-8 pt-4 border-t">
        <p>BLKOUT CIC | Year One Evidence Report | {quarter.label} | Confidential</p>
      </div>
    </div>
  )
}

// --- Helper Components ---

function MetricCard({
  icon: Icon,
  label,
  value,
  color = 'text-blkout-forest',
}: {
  icon: React.ElementType
  label: string
  value: number | string
  color?: string
}) {
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
      <div className="rounded-lg p-2 bg-white shadow-sm">
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-lg font-bold ${color}`}>{value}</p>
      </div>
    </div>
  )
}
