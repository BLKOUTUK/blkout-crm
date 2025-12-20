'use client'

import { Button } from '@/components/ui/button'
import {
  Users,
  Building2,
  Wallet,
  TrendingUp,
  Calendar,
} from 'lucide-react'
import { NewsletterSignup } from '@/components/newsletter-signup'
import {
  MetricCard,
  GrantPipelineChart,
  PartnerDonutChart,
  ActivityTimeline,
  DeadlineCalendar,
  TaskList,
  QuickActions,
  DataSourceBadge,
} from '@/components/dashboard'

// Mock data - will be replaced with real data from hooks
const mockMetrics = {
  communityMembers: { value: 847, change: '12% this month', trend: [720, 745, 768, 790, 812, 830, 847] },
  partnerOrgs: { value: 45, change: '3 new this quarter', trend: [38, 40, 41, 42, 43, 44, 45] },
  fundsSecured: { value: 125450, change: '25% vs last year', trend: [95000, 102000, 108000, 115000, 120000, 123000, 125450] },
  activeGrants: { value: 7, change: '2 decisions pending', trend: [5, 5, 6, 6, 6, 7, 7] },
}

const mockGrantPipeline = {
  stages: [
    { name: 'Research', count: 4, value: 60000 },
    { name: 'Preparing', count: 2, value: 45000 },
    { name: 'Submitted', count: 3, value: 85000 },
    { name: 'Review', count: 2, value: 55000 },
    { name: 'Active', count: 7, value: 50000 },
  ],
  pipelineValue: 295000,
  weightedValue: 127000,
}

const mockPartnerTypes = [
  { name: 'Grassroots', count: 12, color: '#2A9D8F' },
  { name: 'Policy/Advocacy', count: 8, color: '#8B5CF6' },
  { name: 'Government', count: 6, color: '#3B82F6' },
  { name: 'International', count: 4, color: '#6366F1' },
  { name: 'Healthcare', count: 10, color: '#EF4444' },
  { name: 'Funders', count: 5, color: '#F4A261' },
]

const mockDeadlines = [
  { id: '1', title: 'Arts Council Application', date: 'Jan 15', daysLeft: 26, type: 'grant' as const },
  { id: '2', title: 'Tudor Trust Application', date: 'Feb 28', daysLeft: 70, type: 'grant' as const },
  { id: '3', title: 'Comic Relief Q4 Report', date: 'Jan 10', daysLeft: 21, type: 'report' as const },
  { id: '4', title: 'THT MoU Renewal', date: 'Feb 1', daysLeft: 43, type: 'renewal' as const },
]

const mockActivities = [
  { id: '1', type: 'meeting' as const, title: 'Met with DHSC re: HIV Action Plan', time: '2 hours ago' },
  { id: '2', type: 'grant' as const, title: 'Grant approved: Comic Relief £10,000', time: 'Yesterday' },
  { id: '3', type: 'partner' as const, title: 'New partner: London Friend added', time: '2 days ago' },
  { id: '4', type: 'policy' as const, title: 'Policy submission: Health Disparities', time: '3 days ago' },
]

const mockTasks = [
  { id: '1', title: 'Follow up with Jane Smith (DHSC)', due: 'Today', priority: 'urgent' as const },
  { id: '2', title: 'Submit Arts Council application', due: 'Jan 15', priority: 'high' as const },
  { id: '3', title: 'Review THT partnership renewal', due: 'Jan 20', priority: 'medium' as const },
  { id: '4', title: 'Prepare Q4 report for Comic Relief', due: 'Jan 10', priority: 'high' as const },
]

export default function DashboardPage() {
  // Data source is mock for now - will connect to real hooks
  const dataSource = 'mock' as const

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="font-display text-3xl font-bold text-blkout-forest">
            Dashboard
          </h1>
          <DataSourceBadge source={dataSource} />
        </div>
        <Button variant="outline">
          <Calendar className="mr-2 h-4 w-4" />
          Date Range
        </Button>
      </div>

      {/* Hero Metrics - 4 cols */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Community Members"
          value={mockMetrics.communityMembers.value}
          change={`↑ ${mockMetrics.communityMembers.change}`}
          changeType="positive"
          icon={Users}
          href="/contacts?type=community_member"
          accentColor="teal"
          sparklineData={mockMetrics.communityMembers.trend}
          dataSource={dataSource}
        />
        <MetricCard
          title="Partner Organizations"
          value={mockMetrics.partnerOrgs.value}
          change={`↑ ${mockMetrics.partnerOrgs.change}`}
          changeType="positive"
          icon={Building2}
          href="/organizations"
          accentColor="gold"
          sparklineData={mockMetrics.partnerOrgs.trend}
          dataSource={dataSource}
        />
        <MetricCard
          title="Funds Secured"
          value={mockMetrics.fundsSecured.value}
          change={`↑ ${mockMetrics.fundsSecured.change}`}
          changeType="positive"
          icon={Wallet}
          href="/grants"
          accentColor="orange"
          isCurrency
          sparklineData={mockMetrics.fundsSecured.trend}
          dataSource={dataSource}
        />
        <MetricCard
          title="Active Grants"
          value={mockMetrics.activeGrants.value}
          change={mockMetrics.activeGrants.change}
          changeType="neutral"
          icon={TrendingUp}
          href="/grants?stage=active"
          accentColor="forest"
          sparklineData={mockMetrics.activeGrants.trend}
          dataSource={dataSource}
        />
      </section>

      {/* Main Content Grid - 3 cols */}
      <section className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <GrantPipelineChart
            stages={mockGrantPipeline.stages}
            pipelineValue={mockGrantPipeline.pipelineValue}
            weightedValue={mockGrantPipeline.weightedValue}
            dataSource={dataSource}
          />
          <TaskList
            tasks={mockTasks}
            pendingCount={4}
            overdueCount={2}
            dataSource={dataSource}
          />
        </div>
        <div className="space-y-6">
          <DeadlineCalendar
            deadlines={mockDeadlines}
            dataSource={dataSource}
          />
          <PartnerDonutChart
            types={mockPartnerTypes}
            dataSource={dataSource}
          />
        </div>
      </section>

      {/* Secondary Grid - 2 cols */}
      <section className="grid gap-6 md:grid-cols-2">
        <ActivityTimeline
          activities={mockActivities}
          dataSource={dataSource}
        />
        <div className="space-y-6">
          <QuickActions />
          <NewsletterSignup />
        </div>
      </section>
    </div>
  )
}
