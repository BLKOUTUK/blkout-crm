'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ArrowLeft,
  Building2,
  Calendar,
  DollarSign,
  FileText,
  MoreHorizontal,
  Edit,
  Trash2,
  CheckSquare,
  Clock,
  AlertCircle,
  TrendingUp,
  Upload,
  Download,
} from 'lucide-react'
import { cn, formatDate, formatCurrency, getDaysUntil, grantStageLabels, grantStageColors } from '@/lib/utils'

// Mock grant data
const mockGrant = {
  id: '3',
  grant_name: 'Comic Relief - Community Grant',
  funder: {
    id: '3',
    name: 'Comic Relief',
    org_type: 'funder_foundation',
  },
  amount_requested: 10000,
  amount_awarded: 10000,
  stage: 'active',
  probability: 100,
  grant_start_date: '2025-12-01',
  grant_end_date: '2026-11-30',
  next_report_due: '2026-03-01',
  application_deadline: '2025-10-15',
  decision_expected: '2025-11-15',
  grant_focus: 'Community wellbeing and mental health support for Black queer men',
  description: 'Funding to deliver peer support groups and mental health workshops across London, reaching 200+ community members.',
  objectives: [
    'Deliver 12 peer support group sessions',
    'Run 6 mental health workshops',
    'Train 10 peer facilitators',
    'Reach 200+ community members',
  ],
  status_notes: 'Grant active. First quarterly report due March 2026.',
  contact_name: 'Tom Brown',
  contact_email: 't.brown@comicrelief.com',
  created_at: '2025-08-01T10:00:00Z',
  updated_at: '2025-12-01T14:30:00Z',
}

const mockMilestones = [
  {
    id: '1',
    title: 'Recruit peer facilitators',
    due_date: '2026-01-15',
    status: 'pending',
    description: 'Recruit and onboard 10 peer facilitators',
  },
  {
    id: '2',
    title: 'Launch first support group',
    due_date: '2026-02-01',
    status: 'pending',
    description: 'First peer support group session in East London',
  },
  {
    id: '3',
    title: 'Q1 Report submission',
    due_date: '2026-03-01',
    status: 'pending',
    description: 'Submit first quarterly progress report to Comic Relief',
  },
]

const mockDocuments = [
  {
    id: '1',
    name: 'Grant Agreement.pdf',
    type: 'contract',
    uploaded_at: '2025-12-01',
  },
  {
    id: '2',
    name: 'Budget Spreadsheet.xlsx',
    type: 'budget',
    uploaded_at: '2025-11-20',
  },
  {
    id: '3',
    name: 'Application Form.pdf',
    type: 'application',
    uploaded_at: '2025-10-10',
  },
]

const mockPayments = [
  {
    id: '1',
    amount: 5000,
    date: '2025-12-01',
    type: 'Initial payment',
    status: 'received',
  },
  {
    id: '2',
    amount: 5000,
    date: '2026-06-01',
    type: 'Final payment',
    status: 'scheduled',
  },
]

const stageOrder = ['research', 'preparing', 'submitted', 'under_review', 'approved', 'active', 'completed']

export default function GrantDetailPage() {
  const params = useParams()
  const grant = mockGrant

  // Calculate progress through stages
  const currentStageIndex = stageOrder.indexOf(grant.stage)
  const stageProgress = ((currentStageIndex + 1) / stageOrder.length) * 100

  // Calculate grant timeline progress
  const startDate = new Date(grant.grant_start_date)
  const endDate = new Date(grant.grant_end_date)
  const now = new Date()
  const totalDuration = endDate.getTime() - startDate.getTime()
  const elapsed = now.getTime() - startDate.getTime()
  const timelineProgress = Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Link href="/grants">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-3xl font-bold">{grant.grant_name}</h1>
              <Badge className={cn('text-sm', grantStageColors[grant.stage])}>
                {grantStageLabels[grant.stage]}
              </Badge>
            </div>
            <Link
              href={`/organizations/${grant.funder.id}`}
              className="text-muted-foreground hover:underline flex items-center gap-1"
            >
              <Building2 className="h-4 w-4" />
              {grant.funder.name}
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <FileText className="mr-2 h-4 w-4" />
            Add Report
          </Button>
          <Button variant="outline">
            <CheckSquare className="mr-2 h-4 w-4" />
            Add Milestone
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Edit className="mr-2 h-4 w-4" />
                Edit Grant
              </DropdownMenuItem>
              <DropdownMenuItem>Update Stage</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Archive Grant
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Amount Awarded
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(grant.amount_awarded || 0)}</div>
            {grant.amount_requested !== grant.amount_awarded && (
              <p className="text-xs text-muted-foreground">
                Requested: {formatCurrency(grant.amount_requested)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Grant Period
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-medium">
              {formatDate(grant.grant_start_date)} - {formatDate(grant.grant_end_date)}
            </div>
            <Progress value={timelineProgress} className="mt-2 h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round(timelineProgress)}% elapsed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Next Report Due
            </CardTitle>
          </CardHeader>
          <CardContent>
            {grant.next_report_due ? (
              <>
                <div className="text-lg font-medium">{formatDate(grant.next_report_due)}</div>
                <p className="text-xs text-muted-foreground">
                  {getDaysUntil(grant.next_report_due)} days remaining
                </p>
              </>
            ) : (
              <div className="text-muted-foreground">No report scheduled</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Success Probability
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{grant.probability}%</div>
            <Progress value={grant.probability} className="mt-2 h-2" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Grant Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Focus Area</h4>
                <p className="mt-1">{grant.grant_focus}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Description</h4>
                <p className="mt-1 text-sm">{grant.description}</p>
              </div>
              {grant.objectives && grant.objectives.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Objectives</h4>
                  <ul className="mt-2 space-y-1">
                    {grant.objectives.map((obj, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckSquare className="mt-0.5 h-4 w-4 text-muted-foreground" />
                        {obj}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {grant.status_notes && (
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-sm">
                    <strong>Status Notes:</strong> {grant.status_notes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Tabs defaultValue="milestones">
            <TabsList>
              <TabsTrigger value="milestones">
                <CheckSquare className="mr-2 h-4 w-4" />
                Milestones
              </TabsTrigger>
              <TabsTrigger value="documents">
                <FileText className="mr-2 h-4 w-4" />
                Documents
              </TabsTrigger>
              <TabsTrigger value="payments">
                <DollarSign className="mr-2 h-4 w-4" />
                Payments
              </TabsTrigger>
            </TabsList>

            <TabsContent value="milestones" className="mt-4 space-y-4">
              {mockMilestones.map((milestone) => (
                <Card key={milestone.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 rounded border-gray-300"
                          checked={milestone.status === 'completed'}
                          readOnly
                        />
                        <div>
                          <p className="font-medium">{milestone.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {milestone.description}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {formatDate(milestone.due_date)}
                        </div>
                        <Badge
                          variant={milestone.status === 'completed' ? 'secondary' : 'outline'}
                          className="mt-1"
                        >
                          {milestone.status}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              <Button variant="outline" className="w-full">
                <CheckSquare className="mr-2 h-4 w-4" />
                Add Milestone
              </Button>
            </TabsContent>

            <TabsContent value="documents" className="mt-4 space-y-4">
              {mockDocuments.map((doc) => (
                <Card key={doc.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="h-8 w-8 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{doc.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Uploaded {formatDate(doc.uploaded_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{doc.type}</Badge>
                        <Button variant="ghost" size="icon">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              <Button variant="outline" className="w-full">
                <Upload className="mr-2 h-4 w-4" />
                Upload Document
              </Button>
            </TabsContent>

            <TabsContent value="payments" className="mt-4 space-y-4">
              {mockPayments.map((payment) => (
                <Card key={payment.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{payment.type}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(payment.date)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">{formatCurrency(payment.amount)}</p>
                        <Badge
                          variant={payment.status === 'received' ? 'secondary' : 'outline'}
                        >
                          {payment.status}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              <div className="rounded-lg bg-muted p-4">
                <div className="flex justify-between text-sm">
                  <span>Total Received</span>
                  <span className="font-bold">
                    {formatCurrency(
                      mockPayments
                        .filter((p) => p.status === 'received')
                        .reduce((sum, p) => sum + p.amount, 0)
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span>Outstanding</span>
                  <span className="font-bold">
                    {formatCurrency(
                      mockPayments
                        .filter((p) => p.status !== 'received')
                        .reduce((sum, p) => sum + p.amount, 0)
                    )}
                  </span>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stage Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Grant Stage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stageOrder.map((stage, index) => {
                  const isActive = stage === grant.stage
                  const isPast = index < currentStageIndex
                  return (
                    <div
                      key={stage}
                      className={cn(
                        'flex items-center gap-3 rounded-lg p-2',
                        isActive && 'bg-primary/10',
                        isPast && 'text-muted-foreground'
                      )}
                    >
                      <div
                        className={cn(
                          'flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                          isActive && 'bg-primary text-primary-foreground',
                          isPast && 'bg-muted-foreground/20',
                          !isActive && !isPast && 'border'
                        )}
                      >
                        {isPast ? '✓' : index + 1}
                      </div>
                      <span className={cn('text-sm', isActive && 'font-medium')}>
                        {grantStageLabels[stage]}
                      </span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Funder Contact */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Funder Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="font-medium">{grant.contact_name}</p>
                <a
                  href={`mailto:${grant.contact_email}`}
                  className="text-sm text-muted-foreground hover:underline"
                >
                  {grant.contact_email}
                </a>
              </div>
              <Link href={`/organizations/${grant.funder.id}`}>
                <Button variant="outline" className="w-full">
                  <Building2 className="mr-2 h-4 w-4" />
                  View Organization
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Key Dates */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Key Dates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Start Date</span>
                <span>{formatDate(grant.grant_start_date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">End Date</span>
                <span>{formatDate(grant.grant_end_date)}</span>
              </div>
              {grant.next_report_due && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Next Report</span>
                  <span>{formatDate(grant.next_report_due)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{formatDate(grant.created_at)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
