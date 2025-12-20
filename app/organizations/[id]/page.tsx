'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ArrowLeft,
  Globe,
  Mail,
  Phone,
  MapPin,
  Building2,
  Users,
  MoreHorizontal,
  Edit,
  Trash2,
  MessageSquare,
  ExternalLink,
  Calendar,
  DollarSign,
  FileText,
} from 'lucide-react'
import { cn, getInitials, formatDate, formatCurrency, orgTypeLabels, orgTypeIcons, relationshipLabels, statusColors } from '@/lib/utils'

// Mock organization data
const mockOrganization = {
  id: '1',
  name: 'Department of Health and Social Care',
  org_type: 'government_public_sector',
  relationship_type: 'policy_ally',
  relationship_status: 'active',
  description: 'UK Government department responsible for health policy, the NHS, and social care in England.',
  website: 'https://gov.uk/dhsc',
  email: 'info@dhsc.gov.uk',
  phone: '+44 20 7210 4850',
  address: '39 Victoria Street, London SW1H 0EU',
  policy_areas: ['hiv_aids', 'sexual_health', 'mental_health', 'health_inequalities'],
  sector: ['health', 'government'],
  geography_scope: 'national',
  notes: 'Key government partner for HIV and sexual health policy work. Regular engagement through consultation processes.',
  created_at: '2024-03-15T10:00:00Z',
  updated_at: '2025-01-10T14:30:00Z',
}

const mockContacts = [
  {
    id: '1',
    first_name: 'Jane',
    last_name: 'Smith',
    email: 'jane.smith@dhsc.gov.uk',
    job_title: 'Policy Lead - Health Inequalities',
    influence_level: 'decision_maker',
    is_primary: true,
  },
  {
    id: '2',
    first_name: 'Robert',
    last_name: 'Johnson',
    email: 'robert.johnson@dhsc.gov.uk',
    job_title: 'Senior Policy Advisor',
    influence_level: 'influencer',
    is_primary: false,
  },
]

const mockEngagements = [
  {
    id: '1',
    engagement_type: 'consultation',
    title: 'HIV Action Plan Consultation',
    date: '2025-01-08',
    outcome: 'Submitted written response with community recommendations',
  },
  {
    id: '2',
    engagement_type: 'meeting',
    title: 'Quarterly Policy Review',
    date: '2024-12-15',
    outcome: 'Discussed upcoming legislative changes',
  },
  {
    id: '3',
    engagement_type: 'event',
    title: 'Health Inequalities Conference',
    date: '2024-11-20',
    outcome: 'Presented BLKOUT research findings',
  },
]

const mockGrants = [
  {
    id: '1',
    grant_name: 'Community Health Initiative',
    amount_awarded: 50000,
    stage: 'active',
    grant_start_date: '2025-01-01',
    grant_end_date: '2026-12-31',
  },
]

const policyAreaLabels: Record<string, string> = {
  hiv_aids: 'HIV/AIDS',
  sexual_health: 'Sexual Health',
  mental_health: 'Mental Health',
  lgbtq_rights: 'LGBTQ+ Rights',
  racial_justice: 'Racial Justice',
  health_inequalities: 'Health Inequalities',
  housing: 'Housing',
  education: 'Education',
}

const influenceLabels: Record<string, string> = {
  decision_maker: 'Decision Maker',
  influencer: 'Influencer',
  gatekeeper: 'Gatekeeper',
  advocate: 'Advocate',
  neutral: 'Neutral',
}

const geographyLabels: Record<string, string> = {
  local: 'Local',
  regional: 'Regional',
  national: 'National',
  international: 'International',
  global: 'Global',
}

export default function OrganizationDetailPage() {
  const params = useParams()
  const org = mockOrganization

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Link href="/organizations">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-muted text-3xl">
              {orgTypeIcons[org.org_type]}
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold">{org.name}</h1>
              <p className="text-muted-foreground">{orgTypeLabels[org.org_type]}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <MessageSquare className="mr-2 h-4 w-4" />
            Log Engagement
          </Button>
          <Button variant="outline">
            <Users className="mr-2 h-4 w-4" />
            Add Contact
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
                Edit Organization
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Archive Organization
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Status Badges */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">
          {relationshipLabels[org.relationship_type]}
        </Badge>
        <Badge className={cn('text-xs', statusColors[org.relationship_status])}>
          {org.relationship_status}
        </Badge>
        <Badge variant="outline">
          {geographyLabels[org.geography_scope]}
        </Badge>
        {org.policy_areas?.slice(0, 3).map((area) => (
          <Badge key={area} variant="outline" className="text-xs">
            {policyAreaLabels[area] || area}
          </Badge>
        ))}
        {(org.policy_areas?.length || 0) > 3 && (
          <Badge variant="outline" className="text-xs">
            +{org.policy_areas!.length - 3} more
          </Badge>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          {org.description && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">About</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{org.description}</p>
                {org.notes && (
                  <div className="mt-4 rounded-lg bg-muted p-3">
                    <p className="text-sm text-muted-foreground">
                      <strong>Notes:</strong> {org.notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Tabs defaultValue="contacts">
            <TabsList>
              <TabsTrigger value="contacts">
                <Users className="mr-2 h-4 w-4" />
                Contacts ({mockContacts.length})
              </TabsTrigger>
              <TabsTrigger value="engagements">
                <Calendar className="mr-2 h-4 w-4" />
                Engagements
              </TabsTrigger>
              <TabsTrigger value="grants">
                <DollarSign className="mr-2 h-4 w-4" />
                Grants
              </TabsTrigger>
            </TabsList>

            <TabsContent value="contacts" className="mt-4 space-y-4">
              {mockContacts.map((contact) => (
                <Card key={contact.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                          {getInitials(contact.first_name, contact.last_name)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/contacts/${contact.id}`}
                              className="font-medium hover:underline"
                            >
                              {contact.first_name} {contact.last_name}
                            </Link>
                            {contact.is_primary && (
                              <Badge variant="secondary" className="text-xs">
                                Primary
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {contact.job_title}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {contact.email}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline">
                        {influenceLabels[contact.influence_level]}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
              <Button variant="outline" className="w-full">
                <Users className="mr-2 h-4 w-4" />
                Add Contact
              </Button>
            </TabsContent>

            <TabsContent value="engagements" className="mt-4 space-y-4">
              {mockEngagements.map((engagement) => (
                <Card key={engagement.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {engagement.engagement_type}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {formatDate(engagement.date)}
                          </span>
                        </div>
                        <p className="mt-1 font-medium">{engagement.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {engagement.outcome}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              <Button variant="outline" className="w-full">
                <MessageSquare className="mr-2 h-4 w-4" />
                Log Engagement
              </Button>
            </TabsContent>

            <TabsContent value="grants" className="mt-4 space-y-4">
              {mockGrants.length > 0 ? (
                mockGrants.map((grant) => (
                  <Card key={grant.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Link
                            href={`/grants/${grant.id}`}
                            className="font-medium hover:underline"
                          >
                            {grant.grant_name}
                          </Link>
                          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {formatDate(grant.grant_start_date)} - {formatDate(grant.grant_end_date)}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">
                            {formatCurrency(grant.amount_awarded)}
                          </p>
                          <Badge variant="secondary">{grant.stage}</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <DollarSign className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <p className="mt-2 text-muted-foreground">No grants from this organization</p>
                    <Button variant="outline" className="mt-4">
                      Add Grant
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Contact Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {org.website && (
                <div className="flex items-center gap-3">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={org.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm hover:underline flex items-center gap-1"
                  >
                    Website
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
              {org.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${org.email}`} className="text-sm hover:underline">
                    {org.email}
                  </a>
                </div>
              )}
              {org.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${org.phone}`} className="text-sm hover:underline">
                    {org.phone}
                  </a>
                </div>
              )}
              {org.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{org.address}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Policy Areas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Policy Areas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {org.policy_areas?.map((area) => (
                  <Badge key={area} variant="outline">
                    {policyAreaLabels[area] || area.replace(/_/g, ' ')}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Contacts</span>
                <span className="font-medium">{mockContacts.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Engagements</span>
                <span className="font-medium">{mockEngagements.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Active Grants</span>
                <span className="font-medium">{mockGrants.length}</span>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Added</span>
                <span>{formatDate(org.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last updated</span>
                <span>{formatDate(org.updated_at)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
