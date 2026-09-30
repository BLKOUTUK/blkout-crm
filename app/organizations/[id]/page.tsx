'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  Users,
  MoreHorizontal,
  Edit,
  Trash2,
  MessageSquare,
  ExternalLink,
  Calendar,
  DollarSign,
} from 'lucide-react'
import { cn, getInitials, formatDate, formatCurrency, orgTypeLabels, orgTypeIcons, relationshipLabels, statusColors } from '@/lib/utils'
import { useOrganization } from '@/hooks/use-organizations'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase-browser'

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
  const orgId = params.id as string

  const { data: org, isLoading, error } = useOrganization(orgId)

  // Fetch engagements related to this org
  const { data: engagements } = useQuery({
    queryKey: ['engagements', orgId],
    queryFn: async () => {
      const { data, error } = await createClient()
        .from('engagements')
        .select('*')
        .eq('organization_id', orgId)
        .order('date', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!orgId,
  })

  // Fetch grants related to this org
  const { data: grants } = useQuery({
    queryKey: ['grants', 'org', orgId],
    queryFn: async () => {
      const { data, error } = await createClient()
        .from('grants')
        .select('*')
        .eq('funder_org_id', orgId)
        .order('grant_start_date', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!orgId,
  })

  if (isLoading) return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <Link href="/organizations">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="font-display text-3xl font-bold">Organization</h1>
        </div>
      </div>
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    </div>
  )

  if (error) return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <Link href="/organizations">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="font-display text-3xl font-bold">Organization</h1>
        </div>
      </div>
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-destructive">Failed to load organization: {(error as Error).message}</p>
        </CardContent>
      </Card>
    </div>
  )

  if (!org) return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <Link href="/organizations">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="font-display text-3xl font-bold">Organization</h1>
        </div>
      </div>
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Organization not found.</p>
        </CardContent>
      </Card>
    </div>
  )

  const orgContacts = org.contacts || []
  const orgEngagements = engagements || []
  const orgGrants = grants || []

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
        {org.relationship_type && (
          <Badge variant="secondary">
            {relationshipLabels[org.relationship_type]}
          </Badge>
        )}
        {org.relationship_status && (
          <Badge className={cn('text-xs', statusColors[org.relationship_status])}>
            {org.relationship_status}
          </Badge>
        )}
        {org.geography_scope && (
          <Badge variant="outline">
            {geographyLabels[org.geography_scope]}
          </Badge>
        )}
        {(org.policy_areas || []).slice(0, 3).map((area: string) => (
          <Badge key={area} variant="outline" className="text-xs">
            {policyAreaLabels[area] || area}
          </Badge>
        ))}
        {(org.policy_areas || []).length > 3 && (
          <Badge variant="outline" className="text-xs">
            +{org.policy_areas.length - 3} more
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
                Contacts ({orgContacts.length})
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
              {orgContacts.length > 0 ? (
                orgContacts.map((contact: any) => (
                  <Card key={contact.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                            {getInitials(contact.first_name || '', contact.last_name || '')}
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
                            {contact.job_title && (
                              <p className="text-sm text-muted-foreground">
                                {contact.job_title}
                              </p>
                            )}
                            {contact.email && (
                              <p className="text-sm text-muted-foreground">
                                {contact.email}
                              </p>
                            )}
                          </div>
                        </div>
                        {contact.influence_level && (
                          <Badge variant="outline">
                            {influenceLabels[contact.influence_level] || contact.influence_level}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <p className="mt-2 text-muted-foreground">No contacts linked to this organization</p>
                  </CardContent>
                </Card>
              )}
              <Button variant="outline" className="w-full">
                <Users className="mr-2 h-4 w-4" />
                Add Contact
              </Button>
            </TabsContent>

            <TabsContent value="engagements" className="mt-4 space-y-4">
              {orgEngagements.length > 0 ? (
                orgEngagements.map((engagement: any) => (
                  <Card key={engagement.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {engagement.engagement_type}
                            </Badge>
                            {engagement.date && (
                              <span className="text-sm text-muted-foreground">
                                {formatDate(engagement.date)}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 font-medium">{engagement.title}</p>
                          {engagement.outcome && (
                            <p className="text-sm text-muted-foreground">
                              {engagement.outcome}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Calendar className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <p className="mt-2 text-muted-foreground">No engagements recorded</p>
                  </CardContent>
                </Card>
              )}
              <Button variant="outline" className="w-full">
                <MessageSquare className="mr-2 h-4 w-4" />
                Log Engagement
              </Button>
            </TabsContent>

            <TabsContent value="grants" className="mt-4 space-y-4">
              {orgGrants.length > 0 ? (
                orgGrants.map((grant: any) => (
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
                            {grant.grant_start_date ? formatDate(grant.grant_start_date) : 'TBD'} - {grant.grant_end_date ? formatDate(grant.grant_end_date) : 'TBD'}
                          </div>
                        </div>
                        <div className="text-right">
                          {grant.amount_awarded && (
                            <p className="font-bold text-lg">
                              {formatCurrency(grant.amount_awarded)}
                            </p>
                          )}
                          {grant.stage && (
                            <Badge variant="secondary">{grant.stage}</Badge>
                          )}
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
              {!org.website && !org.email && !org.phone && !org.address && (
                <p className="text-sm text-muted-foreground">No contact information available.</p>
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
                {(org.policy_areas || []).length > 0 ? (
                  (org.policy_areas || []).map((area: string) => (
                    <Badge key={area} variant="outline">
                      {policyAreaLabels[area] || area.replace(/_/g, ' ')}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No policy areas assigned.</p>
                )}
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
                <span className="font-medium">{orgContacts.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Engagements</span>
                <span className="font-medium">{orgEngagements.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Active Grants</span>
                <span className="font-medium">{orgGrants.length}</span>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {org.created_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Added</span>
                  <span>{formatDate(org.created_at)}</span>
                </div>
              )}
              {org.updated_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last updated</span>
                  <span>{formatDate(org.updated_at)}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
