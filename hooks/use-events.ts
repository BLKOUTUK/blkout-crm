'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase-browser'

export interface CrmEvent {
  id: string
  title: string
  date: string
  end_date: string | null
  start_time: string | null
  location: string | null
  organizer: string | null
  cost: string | null
  status: string
  source: string | null
  url: string | null
  liberation_score: number | null
}

const COLUMNS =
  'id, title, date, end_date, start_time, location, organizer, cost, status, source, url, liberation_score'

// Upcoming events on the calendar, plus the ones waiting for moderation.
export function useEvents(status: 'approved' | 'pending') {
  return useQuery({
    queryKey: ['events', status],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10)
      const { data, error } = await createClient()
        .from('events')
        .select(COLUMNS)
        .eq('status', status)
        .eq('archived', false)
        .gte('date', today)
        .order('date', { ascending: true })
        .limit(200)

      if (error) throw error
      return (data ?? []) as CrmEvent[]
    },
  })
}
