'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Globe,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react'
import { cn, orgTypeLabels, orgTypeIcons, relationshipLabels, statusColors } from '@/lib/utils'
import { useOrganizations } from '@/hooks/use-organizations'

export default function OrganizationsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string | null>(null)

  const { data: organizations, isLoading, error } = useOrganizations(
    typeFilter ? { type: typeFilter } : undefined
  )

  if (isLoading) return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Organizations</h1>
          <p className="text-muted-foreground">Manage partner and stakeholder organizations</p>
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
          <h1 className="font-display text-3xl font-bold">Organizations</h1>
        </div>
      </div>
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-destructive">Failed to load organizations: {(error as Error).message}</p>
        </CardContent>
      </Card>
    </div>
  )

  // Client-side search filter on hook results
  const filteredOrgs = (organizations || []).filter((org: any) => {
    const matchesSearch =
      searchQuery === '' ||
      org.name.toLowerCase().includes(searchQuery.toLowerCase())

    return matchesSearch
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Organizations</h1>
          <p className="text-muted-foreground">
            Manage partner and stakeholder organizations
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Organization
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search organizations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Filter className="mr-2 h-4 w-4" />
                  Type
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setTypeFilter(null)}>
                  All Types
                </DropdownMenuItem>
                {Object.entries(orgTypeLabels).map(([value, label]) => (
                  <DropdownMenuItem key={value} onClick={() => setTypeFilter(value)}>
                    {orgTypeIcons[value]} {label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Filter className="mr-2 h-4 w-4" />
                  Relationship
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>All Relationships</DropdownMenuItem>
                {Object.entries(relationshipLabels).map(([value, label]) => (
                  <DropdownMenuItem key={value}>{label}</DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Organizations Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-4 text-left text-sm font-medium">
                    Organization
                  </th>
                  <th className="p-4 text-left text-sm font-medium">Type</th>
                  <th className="p-4 text-left text-sm font-medium">
                    Relationship
                  </th>
                  <th className="p-4 text-left text-sm font-medium">
                    Policy Areas
                  </th>
                  <th className="p-4 text-left text-sm font-medium">Status</th>
                  <th className="p-4 text-right text-sm font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredOrgs.map((org: any) => (
                  <tr
                    key={org.id}
                    className="border-b transition-colors hover:bg-muted/50"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">
                          {orgTypeIcons[org.org_type]}
                        </span>
                        <div>
                          <Link
                            href={`/organizations/${org.id}`}
                            className="font-medium hover:underline"
                          >
                            {org.name}
                          </Link>
                          {org.website && (
                            <a
                              href={org.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
                            >
                              <Globe className="h-3 w-3" />
                              Website
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge variant="outline">
                        {orgTypeLabels[org.org_type]}
                      </Badge>
                    </td>
                    <td className="p-4">
                      {org.relationship_type && (
                        <Badge variant="secondary">
                          {relationshipLabels[org.relationship_type]}
                        </Badge>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {(org.policy_areas || []).slice(0, 2).map((area: string) => (
                          <Badge
                            key={area}
                            variant="outline"
                            className="text-xs"
                          >
                            {area.replace(/_/g, ' ')}
                          </Badge>
                        ))}
                        {(org.policy_areas || []).length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{org.policy_areas.length - 2}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge
                        className={cn(
                          'text-xs',
                          statusColors[org.relationship_status]
                        )}
                      >
                        {org.relationship_status}
                      </Badge>
                    </td>
                    <td className="p-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/organizations/${org.id}`}>
                              View Details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem>Edit</DropdownMenuItem>
                          <DropdownMenuItem>Add Contact</DropdownMenuItem>
                          <DropdownMenuItem>Log Engagement</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            Archive
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredOrgs.length === 0 && (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">
                No organizations found.
              </p>
            </div>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between border-t p-4">
            <p className="text-sm text-muted-foreground">
              Showing 1-{filteredOrgs.length} of {filteredOrgs.length}{' '}
              organizations
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled>
                <ChevronLeft className="mr-1 h-4 w-4" />
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled>
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
