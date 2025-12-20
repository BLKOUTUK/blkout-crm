'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase-browser'
import type { DashboardMetrics, GrantPipelineStats, UpcomingDeadline } from '@/types/database'

function getSupabase() { return createClient() }

// Dashboard metrics
export function useDashboardMetrics() {
  return useQuery({
    queryKey: ['dashboard', 'metrics'],
    queryFn: async () => {
      const { data, error } = await getSupabase().rpc('get_dashboard_metrics')

      if (error) throw error
      return data as DashboardMetrics
    },
  })
}

// Grant pipeline stats
export function useGrantPipelineStats() {
  return useQuery({
    queryKey: ['grants', 'stats'],
    queryFn: async () => {
      const { data, error } = await getSupabase().rpc('get_grant_pipeline_stats')

      if (error) throw error
      return data as GrantPipelineStats
    },
  })
}

// Upcoming deadlines
export function useUpcomingDeadlines(daysAhead = 30) {
  return useQuery({
    queryKey: ['dashboard', 'deadlines', daysAhead],
    queryFn: async () => {
      const { data, error } = await getSupabase().rpc('get_upcoming_deadlines', {
        days_ahead: daysAhead,
      })

      if (error) throw error
      return data as UpcomingDeadline[]
    },
  })
}

// Recent activities
export function useRecentActivities(limit = 10) {
  return useQuery({
    queryKey: ['activities', 'recent', limit],
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from('activities')
        .select(`
          *,
          contact:contacts(id, first_name, last_name),
          organization:organizations(id, name)
        `)
        .order('occurred_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      return data
    },
  })
}

// Pending tasks
export function usePendingTasks() {
  return useQuery({
    queryKey: ['tasks', 'pending'],
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from('tasks')
        .select(`
          *,
          contact:contacts(id, first_name, last_name),
          organization:organizations(id, name)
        `)
        .eq('status', 'pending')
        .order('due_date', { ascending: true })
        .limit(10)

      if (error) throw error
      return data
    },
  })
}
