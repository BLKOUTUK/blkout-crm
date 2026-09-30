'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Plus,
  MoreHorizontal,
  Calendar,
  Building2,
  LayoutGrid,
  List,
} from 'lucide-react'
import { cn, formatCurrency, formatDate, getDaysUntil, grantStageLabels, grantStageColors } from '@/lib/utils'
import { useGrants } from '@/hooks/use-grants'

const pipelineStages = [
  { key: 'research', label: 'Research' },
  { key: 'preparing', label: 'Preparing' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'under_review', label: 'Under Review' },
  { key: 'active', label: 'Active' },
]

export default function GrantsPage() {
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban')
  const { data: grants, isLoading, error } = useGrants()

  if (isLoading) return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Grant Pipeline</h1>
          <p className="text-muted-foreground">Track and manage funding applications</p>
        </div>
      </div>
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    </div>
  )

  if (error) return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Grant Pipeline</h1>
        </div>
      </div>
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-destructive">Failed to load grants: {(error as Error).message}</p>
        </CardContent>
      </Card>
    </div>
  )

  const allGrants = grants || []

  // Group grants by stage for kanban
  const grantsByStage = pipelineStages.reduce(
    (acc, stage) => {
      acc[stage.key] = allGrants.filter((g: any) => g.stage === stage.key)
      return acc
    },
    {} as Record<string, any[]>
  )

  // Calculate pipeline stats
  const pipelineValue = allGrants
    .filter((g: any) => ['submitted', 'under_review'].includes(g.stage))
    .reduce((sum: number, g: any) => sum + (g.amount_requested || 0), 0)

  const weightedPipeline = allGrants
    .filter((g: any) => ['submitted', 'under_review'].includes(g.stage))
    .reduce((sum: number, g: any) => sum + ((g.amount_requested || 0) * (g.probability || 0)) / 100, 0)

  const totalSecured = allGrants
    .filter((g: any) => g.stage === 'active')
    .reduce((sum: number, g: any) => sum + (g.amount_awarded || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Grant Pipeline</h1>
          <p className="text-muted-foreground">
            Track and manage funding applications
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border">
            <Button
              variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('kanban')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Grant
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pipeline Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(pipelineValue)}</div>
            <p className="text-xs text-muted-foreground">
              {allGrants.filter((g: any) => ['submitted', 'under_review'].includes(g.stage)).length} applications pending
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Weighted Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(weightedPipeline)}</div>
            <p className="text-xs text-muted-foreground">
              Based on probability scores
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Funds Secured
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalSecured)}</div>
            <p className="text-xs text-muted-foreground">
              {allGrants.filter((g: any) => g.stage === 'active').length} active grants
            </p>
          </CardContent>
        </Card>
      </div>

      {allGrants.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">No grants found. Create your first grant to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Kanban View */}
          {viewMode === 'kanban' && (
            <div className="overflow-x-auto pb-4">
              <div className="flex gap-4" style={{ minWidth: pipelineStages.length * 280 }}>
                {pipelineStages.map((stage) => (
                  <div
                    key={stage.key}
                    className="w-[280px] flex-shrink-0 rounded-lg bg-muted/50 p-4"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="font-medium">{stage.label}</h3>
                      <Badge variant="secondary">
                        {grantsByStage[stage.key]?.length || 0}
                      </Badge>
                    </div>
                    <div className="space-y-3">
                      {grantsByStage[stage.key]?.map((grant: any) => (
                        <Card key={grant.id} className="cursor-pointer hover:shadow-md">
                          <CardContent className="p-4">
                            <div className="mb-2 flex items-start justify-between">
                              <Link
                                href={`/grants/${grant.id}`}
                                className="font-medium hover:underline"
                              >
                                {grant.funder?.name || 'Unknown Funder'}
                              </Link>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem>View Details</DropdownMenuItem>
                                  <DropdownMenuItem>Edit</DropdownMenuItem>
                                  <DropdownMenuItem>Move Stage</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                            <p className="mb-3 text-sm text-muted-foreground">
                              {grant.grant_name}
                            </p>
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium">
                                {formatCurrency(grant.amount_requested || 0)}
                              </span>
                              {grant.probability !== undefined && grant.stage !== 'active' && (
                                <Badge variant="outline">{grant.probability}%</Badge>
                              )}
                            </div>
                            {grant.deadline && (
                              <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                {getDaysUntil(grant.deadline)} days left
                              </div>
                            )}
                            {grant.next_report_due && (
                              <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                Report: {formatDate(grant.next_report_due)}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* List View */}
          {viewMode === 'list' && (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="p-4 text-left text-sm font-medium">Grant</th>
                        <th className="p-4 text-left text-sm font-medium">Funder</th>
                        <th className="p-4 text-left text-sm font-medium">Amount</th>
                        <th className="p-4 text-left text-sm font-medium">Stage</th>
                        <th className="p-4 text-left text-sm font-medium">Deadline</th>
                        <th className="p-4 text-left text-sm font-medium">Probability</th>
                        <th className="p-4 text-right text-sm font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allGrants.map((grant: any) => (
                        <tr
                          key={grant.id}
                          className="border-b transition-colors hover:bg-muted/50"
                        >
                          <td className="p-4">
                            <Link
                              href={`/grants/${grant.id}`}
                              className="font-medium hover:underline"
                            >
                              {grant.grant_name}
                            </Link>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              {grant.funder?.name || 'Unknown Funder'}
                            </div>
                          </td>
                          <td className="p-4 font-medium">
                            {formatCurrency(grant.amount_requested || 0)}
                          </td>
                          <td className="p-4">
                            <Badge className={cn('text-xs', grantStageColors[grant.stage])}>
                              {grantStageLabels[grant.stage]}
                            </Badge>
                          </td>
                          <td className="p-4">
                            {grant.deadline ? (
                              <span className="text-sm">
                                {formatDate(grant.deadline)}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="p-4">
                            {grant.probability !== undefined && (
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-16 overflow-hidden rounded-full bg-gray-100">
                                  <div
                                    className="h-full bg-primary"
                                    style={{ width: `${grant.probability}%` }}
                                  />
                                </div>
                                <span className="text-sm">{grant.probability}%</span>
                              </div>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>View Details</DropdownMenuItem>
                                <DropdownMenuItem>Edit</DropdownMenuItem>
                                <DropdownMenuItem>Update Stage</DropdownMenuItem>
                                <DropdownMenuItem>Add Note</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
