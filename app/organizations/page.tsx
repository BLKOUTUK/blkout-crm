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

// Mock data
const mockOrganizations = [
  {
    id: '1',
    name: 'Department of Health and Social Care',
    org_type: 'government_public_sector',
    relationship_type: 'policy_ally',
    relationship_status: 'active',
    policy_areas: ['hiv_aids', 'sexual_health', 'mental_health'],
    website: 'https://gov.uk/dhsc',
    primary_contact: { first_name: 'Jane', last_name: 'Smith' },
  },
  {
    id: '2',
    name: 'UNAIDS',
    org_type: 'international_ngo',
    relationship_type: 'coalition_member',
    relationship_status: 'active',
    policy_areas: ['hiv_aids'],
    website: 'https://unaids.org',
    primary_contact: null,
  },
  {
    id: '3',
    name: 'Comic Relief',
    org_type: 'funder_foundation',
    relationship_type: 'funder',
    relationship_status: 'active',
    policy_areas: [],
    website: 'https://comicrelief.com',
    is_funder: true,
    primary_contact: { first_name: 'Tom', last_name: 'Brown' },
  },
  {
    id: '4',
    name: 'Stonewall',
    org_type: 'policy_advocacy',
    relationship_type: 'coalition_member',
    relationship_status: 'active',
    policy_areas: ['lgbtq_rights'],
    website: 'https://stonewall.org.uk',
    primary_contact: { first_name: 'Sarah', last_name: 'Chen' },
  },
  {
    id: '5',
    name: 'Terrence Higgins Trust',
    org_type: 'healthcare_provider',
    relationship_type: 'strategic_partner',
    relationship_status: 'active',
    policy_areas: ['hiv_aids', 'sexual_health'],
    website: 'https://tht.org.uk',
    primary_contact: null,
  },
  {
    id: '6',
    name: 'UK Black Pride',
    org_type: 'grassroots_community',
    relationship_type: 'coalition_member',
    relationship_status: 'active',
    policy_areas: ['lgbtq_rights', 'racial_justice'],
    website: 'https://ukblackpride.org.uk',
    primary_contact: null,
  },
  {
    id: '7',
    name: 'GLA / Mayor of London',
    org_type: 'government_public_sector',
    relationship_type: 'policy_ally',
    relationship_status: 'developing',
    policy_areas: ['lgbtq_rights'],
    website: 'https://london.gov.uk',
    primary_contact: null,
  },
  {
    id: '8',
    name: 'UCL',
    org_type: 'academic_research',
    relationship_type: 'research_collaborator',
    relationship_status: 'active',
    policy_areas: ['mental_health'],
    website: 'https://ucl.ac.uk',
    primary_contact: null,
  },
]

export default function OrganizationsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string | null>(null)

  // Filter organizations
  const filteredOrgs = mockOrganizations.filter((org) => {
    const matchesSearch =
      searchQuery === '' ||
      org.name.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesType = !typeFilter || org.org_type === typeFilter

    return matchesSearch && matchesType
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
                {filteredOrgs.map((org) => (
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
                        {org.policy_areas?.slice(0, 2).map((area) => (
                          <Badge
                            key={area}
                            variant="outline"
                            className="text-xs"
                          >
                            {area.replace(/_/g, ' ')}
                          </Badge>
                        ))}
                        {(org.policy_areas?.length || 0) > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{org.policy_areas!.length - 2}
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
