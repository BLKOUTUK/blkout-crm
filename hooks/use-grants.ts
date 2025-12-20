'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase'

// Using any for now until migration is applied
type GrantInsert = Record<string, unknown>
type GrantUpdate = Record<string, unknown>

const supabase = createClient()

// Fetch all grants with optional filters
export function useGrants(filters?: {
  stage?: string
  funderId?: string
  minAmount?: number
  maxAmount?: number
}) {
  return useQuery({
    queryKey: ['grants', filters],
    queryFn: async () => {
      let query = supabase
        .from('grants')
        .select(`
          *,
          funder:organizations(id, name, org_type)
        `)
        .order('created_at', { ascending: false })

      if (filters?.stage) {
        query = query.eq('stage', filters.stage)
      }
      if (filters?.funderId) {
        query = query.eq('funder_id', filters.funderId)
      }
      if (filters?.minAmount) {
        query = query.gte('amount_requested', filters.minAmount)
      }
      if (filters?.maxAmount) {
        query = query.lte('amount_requested', filters.maxAmount)
      }

      const { data, error } = await query

      if (error) throw error
      return data
    },
  })
}

// Fetch single grant with full details
export function useGrant(id: string) {
  return useQuery({
    queryKey: ['grants', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('grants')
        .select(`
          *,
          funder:organizations(*),
          milestones:grant_milestones(*),
          documents:grant_documents(*),
          payments:grant_payments(*)
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!id,
  })
}

// Create grant
export function useCreateGrant() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (grant: GrantInsert) => {
      const { data, error } = await supabase
        .from('grants')
        .insert(grant)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grants'] })
    },
  })
}

// Update grant
export function useUpdateGrant() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: GrantUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('grants')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['grants'] })
      queryClient.invalidateQueries({ queryKey: ['grants', data.id] })
    },
  })
}

// Update grant stage
export function useUpdateGrantStage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: string }) => {
      const { data, error } = await supabase
        .from('grants')
        .update({ stage })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['grants'] })
      queryClient.invalidateQueries({ queryKey: ['grants', data.id] })
    },
  })
}

// Delete grant
export function useDeleteGrant() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('grants').delete().eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grants'] })
    },
  })
}

// Get grants by stage for pipeline
export function useGrantPipeline() {
  return useQuery({
    queryKey: ['grants', 'pipeline'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('grants')
        .select(`
          *,
          funder:organizations(id, name)
        `)
        .in('stage', ['research', 'preparing', 'submitted', 'under_review', 'active'])
        .order('deadline', { ascending: true })

      if (error) throw error

      // Group by stage
      const pipeline: Record<string, typeof data> = {
        research: [],
        preparing: [],
        submitted: [],
        under_review: [],
        active: [],
      }

      data.forEach((grant) => {
        if (pipeline[grant.stage]) {
          pipeline[grant.stage].push(grant)
        }
      })

      return pipeline
    },
  })
}

// Get upcoming deadlines
export function useGrantDeadlines(daysAhead = 30) {
  return useQuery({
    queryKey: ['grants', 'deadlines', daysAhead],
    queryFn: async () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + daysAhead)

      const { data, error } = await supabase
        .from('grants')
        .select(`
          id,
          grant_name,
          deadline,
          next_report_due,
          stage,
          funder:organizations(id, name)
        `)
        .or(`deadline.lte.${futureDate.toISOString()},next_report_due.lte.${futureDate.toISOString()}`)
        .order('deadline', { ascending: true })

      if (error) throw error
      return data
    },
  })
}

// Grant milestones
export function useGrantMilestones(grantId: string) {
  return useQuery({
    queryKey: ['grants', grantId, 'milestones'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('grant_milestones')
        .select('*')
        .eq('grant_id', grantId)
        .order('due_date', { ascending: true })

      if (error) throw error
      return data
    },
    enabled: !!grantId,
  })
}

// Update milestone status
export function useUpdateMilestone() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, grantId, status }: { id: string; grantId: string; status: string }) => {
      const { data, error } = await supabase
        .from('grant_milestones')
        .update({ status })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return { ...data, grantId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['grants', data.grantId, 'milestones'] })
    },
  })
}

// Grant statistics
export function useGrantStats() {
  return useQuery({
    queryKey: ['grants', 'stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('grants')
        .select('stage, amount_requested, amount_awarded, probability')

      if (error) throw error

      const stats = {
        total: data.length,
        byStage: {} as Record<string, number>,
        pipelineValue: 0,
        weightedPipeline: 0,
        totalSecured: 0,
      }

      data.forEach((grant) => {
        stats.byStage[grant.stage] = (stats.byStage[grant.stage] || 0) + 1

        if (['submitted', 'under_review'].includes(grant.stage)) {
          stats.pipelineValue += grant.amount_requested || 0
          stats.weightedPipeline += ((grant.amount_requested || 0) * (grant.probability || 0)) / 100
        }

        if (grant.stage === 'active') {
          stats.totalSecured += grant.amount_awarded || 0
        }
      })

      return stats
    },
  })
}
