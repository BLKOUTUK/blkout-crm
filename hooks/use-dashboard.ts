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
      const res = await fetch(`/api/crm/activities?limit=${limit}`)
      if (!res.ok) throw new Error('Failed to load activities')
      return res.json()
    },
  })
}

// Pending tasks
export function usePendingTasks() {
  return useQuery({
    queryKey: ['tasks', 'pending'],
    queryFn: async () => {
      const res = await fetch(`/api/crm/tasks?status=pending&limit=10`)
      if (!res.ok) throw new Error('Failed to load tasks')
      return res.json()
    },
  })
}
