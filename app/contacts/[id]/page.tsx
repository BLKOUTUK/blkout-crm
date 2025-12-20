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
  Mail,
  Phone,
  Building2,
  MapPin,
  Calendar,
  MoreHorizontal,
  Edit,
  Trash2,
  MessageSquare,
  CheckSquare,
  Clock,
  Star,
  ExternalLink,
} from 'lucide-react'
import { cn, getInitials, formatDate, statusColors } from '@/lib/utils'

// Mock contact data - replace with real Supabase query
const mockContact = {
  id: '1',
  first_name: 'Jane',
  last_name: 'Smith',
  email: 'jane.smith@dhsc.gov.uk',
  phone: '+44 20 7xxx xxxx',
  mobile: '+44 77xx xxx xxx',
  contact_type: ['government_official', 'partner_contact'],
  status: 'active',
  engagement_level: 'high',
  influence_level: 'decision_maker',
  job_title: 'Policy Lead - Health Inequalities',
  organization: {
    id: '1',
    name: 'Department of Health and Social Care',
    org_type: 'government_public_sector',
  },
  address: 'DHSC, 39 Victoria Street, London SW1H 0EU',
  preferred_contact_method: 'email',
  notes: 'Key ally for HIV policy work. Met at 2024 conference. Interested in community-led approaches.',
  tags: ['HIV policy', 'health inequalities', 'key relationship'],
  created_at: '2024-06-15T10:00:00Z',
  updated_at: '2025-01-10T14:30:00Z',
  last_contacted: '2025-01-08T09:00:00Z',
}

const mockActivities = [
  {
    id: '1',
    activity_type: 'meeting',
    subject: 'HIV Policy Discussion',
    occurred_at: '2025-01-08T09:00:00Z',
    description: 'Discussed upcoming policy changes and BLKOUT input opportunities',
  },
  {
    id: '2',
    activity_type: 'email',
    subject: 'Follow-up: Community Consultation',
    occurred_at: '2025-01-05T14:00:00Z',
    description: 'Sent consultation response document',
  },
  {
    id: '3',
    activity_type: 'call',
    subject: 'Quick Check-in',
    occurred_at: '2024-12-20T11:00:00Z',
    description: 'Brief call about Q1 2025 planning',
  },
]

const mockTasks = [
  {
    id: '1',
    title: 'Send policy brief',
    due_date: '2025-01-20',
    priority: 'high',
    status: 'pending',
  },
  {
    id: '2',
    title: 'Schedule quarterly review',
    due_date: '2025-02-01',
    priority: 'medium',
    status: 'pending',
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

const influenceLabels: Record<string, string> = {
  decision_maker: 'Decision Maker',
  influencer: 'Influencer',
  gatekeeper: 'Gatekeeper',
  advocate: 'Advocate',
  neutral: 'Neutral',
}

const activityIcons: Record<string, React.ElementType> = {
  meeting: Calendar,
  email: Mail,
  call: Phone,
  note: MessageSquare,
}

export default function ContactDetailPage() {
  const params = useParams()
  const contact = mockContact // Replace with useContact(params.id)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Link href="/contacts">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
              {getInitials(contact.first_name, contact.last_name)}
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold">
                {contact.first_name} {contact.last_name}
              </h1>
              <p className="text-muted-foreground">
                {contact.job_title}
                {contact.organization && (
                  <>
                    {' at '}
                    <Link
                      href={`/organizations/${contact.organization.id}`}
                      className="text-primary hover:underline"
                    >
                      {contact.organization.name}
                    </Link>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <MessageSquare className="mr-2 h-4 w-4" />
            Log Activity
          </Button>
          <Button variant="outline">
            <CheckSquare className="mr-2 h-4 w-4" />
            Add Task
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
                Edit Contact
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Mail className="mr-2 h-4 w-4" />
                Send Email
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Archive Contact
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Status Badges */}
      <div className="flex flex-wrap gap-2">
        {contact.contact_type.map((type) => (
          <Badge key={type} variant="outline">
            {contactTypeLabels[type] || type}
          </Badge>
        ))}
        <Badge className={cn('text-xs', engagementColors[contact.engagement_level])}>
          {contact.engagement_level} engagement
        </Badge>
        <Badge className={cn('text-xs', statusColors[contact.status])}>
          {contact.status}
        </Badge>
        {contact.influence_level && (
          <Badge variant="secondary">
            <Star className="mr-1 h-3 w-3" />
            {influenceLabels[contact.influence_level]}
          </Badge>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="activities">
            <TabsList>
              <TabsTrigger value="activities">Activities</TabsTrigger>
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="activities" className="mt-4 space-y-4">
              {mockActivities.map((activity) => {
                const Icon = activityIcons[activity.activity_type] || MessageSquare
                return (
                  <Card key={activity.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                          <Icon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium">{activity.subject}</p>
                              <p className="text-sm text-muted-foreground">
                                {activity.description}
                              </p>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {formatDate(activity.occurred_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
              <Button variant="outline" className="w-full">
                Load More Activities
              </Button>
            </TabsContent>

            <TabsContent value="tasks" className="mt-4 space-y-4">
              {mockTasks.map((task) => (
                <Card key={task.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        <div>
                          <p className="font-medium">{task.title}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            Due {formatDate(task.due_date)}
                          </div>
                        </div>
                      </div>
                      <Badge
                        variant={task.priority === 'high' ? 'destructive' : 'secondary'}
                      >
                        {task.priority}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
              <Button variant="outline" className="w-full">
                <CheckSquare className="mr-2 h-4 w-4" />
                Add New Task
              </Button>
            </TabsContent>

            <TabsContent value="notes" className="mt-4">
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm">{contact.notes}</p>
                  <div className="mt-4 flex flex-wrap gap-1">
                    {contact.tags?.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Contact Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contact Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${contact.email}`} className="text-sm hover:underline">
                  {contact.email}
                </a>
              </div>
              {contact.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${contact.phone}`} className="text-sm hover:underline">
                    {contact.phone}
                  </a>
                </div>
              )}
              {contact.mobile && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${contact.mobile}`} className="text-sm hover:underline">
                    {contact.mobile} (Mobile)
                  </a>
                </div>
              )}
              {contact.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{contact.address}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Organization */}
          {contact.organization && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Organization</CardTitle>
              </CardHeader>
              <CardContent>
                <Link
                  href={`/organizations/${contact.organization.id}`}
                  className="flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-muted"
                >
                  <Building2 className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{contact.organization.name}</p>
                    <p className="text-sm text-muted-foreground">
                      View organization
                    </p>
                  </div>
                  <ExternalLink className="ml-auto h-4 w-4 text-muted-foreground" />
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last contacted</span>
                <span>{formatDate(contact.last_contacted)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{formatDate(contact.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last updated</span>
                <span>{formatDate(contact.updated_at)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
