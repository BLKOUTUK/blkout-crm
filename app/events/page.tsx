'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ExternalLink } from 'lucide-react'
import { useEvents, type CrmEvent } from '@/hooks/use-events'

function formatDate(e: CrmEvent): string {
  const fmt = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  const start = fmt(e.date)
  const time = e.start_time ? `, ${e.start_time.slice(0, 5)}` : ''
  return e.end_date && e.end_date !== e.date ? `${start} – ${fmt(e.end_date)}` : `${start}${time}`
}

function EventList({ status, empty }: { status: 'approved' | 'pending'; empty: string }) {
  const { data, isLoading, error } = useEvents(status)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    )
  }
  if (error) {
    return <p className="text-destructive">Failed to load events: {(error as Error).message}</p>
  }
  if (!data || data.length === 0) {
    return <p className="text-muted-foreground">{empty}</p>
  }

  return (
    <ul className="divide-y">
      {data.map((e) => (
        <li key={e.id} className="flex items-start justify-between gap-4 py-3">
          <div className="min-w-0">
            <p className="font-medium">{e.title}</p>
            <p className="text-sm text-muted-foreground">
              {formatDate(e)}
              {e.location ? ` · ${e.location}` : ''}
              {e.organizer ? ` · ${e.organizer}` : ''}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {e.cost && <Badge variant="outline">{e.cost}</Badge>}
            {e.url && (
              <a href={e.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${e.title}`}>
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}

export default function EventsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Events</h1>
        <p className="text-muted-foreground">
          Upcoming events from the community calendar, and those awaiting moderation
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Awaiting moderation</CardTitle>
        </CardHeader>
        <CardContent>
          <EventList status="pending" empty="Nothing waiting for moderation." />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming</CardTitle>
        </CardHeader>
        <CardContent>
          <EventList status="approved" empty="No upcoming approved events." />
        </CardContent>
      </Card>
    </div>
  )
}
