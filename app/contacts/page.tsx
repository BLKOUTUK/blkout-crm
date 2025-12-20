'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  Mail,
  Phone,
  Building2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn, getInitials, statusColors, orgTypeLabels } from '@/lib/utils'

// Mock data for demonstration
const mockContacts = [
  {
    id: '1',
    first_name: 'Jane',
    last_name: 'Smith',
    email: 'jane.smith@dhsc.gov.uk',
    phone: '+44 20 7xxx xxxx',
    contact_type: ['government_official', 'partner_contact'],
    status: 'active',
    engagement_level: 'high',
    organization: { name: 'DHSC', org_type: 'government_public_sector' },
    job_title: 'Policy Lead',
    influence_level: 'decision_maker',
  },
  {
    id: '2',
    first_name: 'Tom',
    last_name: 'Brown',
    email: 't.brown@comicrelief.com',
    phone: '+44 20 7xxx xxxx',
    contact_type: ['funder_contact'],
    status: 'active',
    engagement_level: 'high',
    organization: { name: 'Comic Relief', org_type: 'funder_foundation' },
    job_title: 'Grant Manager',
    influence_level: 'decision_maker',
  },
  {
    id: '3',
    first_name: 'Sarah',
    last_name: 'Chen',
    email: 's.chen@stonewall.org',
    phone: '+44 20 7xxx xxxx',
    contact_type: ['partner_contact'],
    status: 'active',
    engagement_level: 'champion',
    organization: { name: 'Stonewall', org_type: 'policy_advocacy' },
    job_title: 'Director of Campaigns',
    influence_level: 'influencer',
  },
  {
    id: '4',
    first_name: 'Marcus',
    last_name: 'Johnson',
    email: 'marcus.j@email.com',
    phone: '+44 77xx xxx xxx',
    contact_type: ['community_member'],
    status: 'active',
    engagement_level: 'champion',
    organization: null,
    job_title: null,
    influence_level: 'champion',
  },
  {
    id: '5',
    first_name: 'David',
    last_name: 'Okonkwo',
    email: 'david@blkout.uk',
    phone: '+44 77xx xxx xxx',
    contact_type: ['cbs_member'],
    status: 'active',
    engagement_level: 'champion',
    organization: { name: 'BLKOUT', org_type: 'grassroots_community' },
    job_title: 'Director',
    influence_level: 'decision_maker',
  },
]

const contactTypeLabels: Record<string, string> = {
  cbs_member: 'CBS Member',
  community_member: 'Community',
  partner_contact: 'Partner',
  funder_contact: 'Funder',
  government_official: 'Government',
  volunteer: 'Volunteer',
  event_participant: 'Event',
  subscriber: 'Subscriber',
  ally: 'Ally',
  media_contact: 'Media',
}

const engagementColors: Record<string, string> = {
  champion: 'bg-green-100 text-green-800',
  high: 'bg-blue-100 text-blue-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-gray-100 text-gray-800',
  new: 'bg-purple-100 text-purple-800',
  dormant: 'bg-red-100 text-red-800',
}

export default function ContactsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string | null>(null)

  // Filter contacts based on search and type
  const filteredContacts = mockContacts.filter((contact) => {
    const matchesSearch =
      searchQuery === '' ||
      `${contact.first_name} ${contact.last_name}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      contact.email.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesType =
      !typeFilter || contact.contact_type.includes(typeFilter)

    return matchesSearch && matchesType
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Contacts</h1>
          <p className="text-muted-foreground">
            Manage your stakeholder relationships
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Contact
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search contacts..."
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
                {Object.entries(contactTypeLabels).map(([value, label]) => (
                  <DropdownMenuItem key={value} onClick={() => setTypeFilter(value)}>
                    {label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Filter className="mr-2 h-4 w-4" />
                  Status
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>All Statuses</DropdownMenuItem>
                <DropdownMenuItem>Active</DropdownMenuItem>
                <DropdownMenuItem>Inactive</DropdownMenuItem>
                <DropdownMenuItem>Prospect</DropdownMenuItem>
                <DropdownMenuItem>Archived</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Contacts Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-4 text-left text-sm font-medium">Name</th>
                  <th className="p-4 text-left text-sm font-medium">Type</th>
                  <th className="p-4 text-left text-sm font-medium">
                    Organization
                  </th>
                  <th className="p-4 text-left text-sm font-medium">
                    Engagement
                  </th>
                  <th className="p-4 text-left text-sm font-medium">Status</th>
                  <th className="p-4 text-right text-sm font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredContacts.map((contact) => (
                  <tr
                    key={contact.id}
                    className="border-b transition-colors hover:bg-muted/50"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                          {getInitials(contact.first_name, contact.last_name)}
                        </div>
                        <div>
                          <Link
                            href={`/contacts/${contact.id}`}
                            className="font-medium hover:underline"
                          >
                            {contact.first_name} {contact.last_name}
                          </Link>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {contact.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {contact.contact_type.slice(0, 2).map((type) => (
                          <Badge
                            key={type}
                            variant="outline"
                            className="text-xs"
                          >
                            {contactTypeLabels[type] || type}
                          </Badge>
                        ))}
                        {contact.contact_type.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{contact.contact_type.length - 2}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      {contact.organization ? (
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">
                              {contact.organization.name}
                            </p>
                            {contact.job_title && (
                              <p className="text-xs text-muted-foreground">
                                {contact.job_title}
                              </p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-4">
                      {contact.engagement_level && (
                        <Badge
                          className={cn(
                            'text-xs',
                            engagementColors[contact.engagement_level]
                          )}
                        >
                          {contact.engagement_level}
                        </Badge>
                      )}
                    </td>
                    <td className="p-4">
                      <Badge
                        className={cn(
                          'text-xs',
                          statusColors[contact.status]
                        )}
                      >
                        {contact.status}
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
                            <Link href={`/contacts/${contact.id}`}>
                              View Details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem>Edit</DropdownMenuItem>
                          <DropdownMenuItem>Add Note</DropdownMenuItem>
                          <DropdownMenuItem>Create Task</DropdownMenuItem>
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
              Showing 1-{filteredContacts.length} of {filteredContacts.length}{' '}
              contacts
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
