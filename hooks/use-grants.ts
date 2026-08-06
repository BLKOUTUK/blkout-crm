'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// Using any for now until migration is applied
type GrantInsert = Record<string, unknown>
type GrantUpdate = Record<string, unknown>

// Grants live in `grant_pipeline`, which has RLS enabled and no policies, so the
// browser (anon) key reads zero rows and writes silently do nothing. Everything
// here goes through the service-role route handler instead — same pattern as
// use-dashboard's activities/tasks fetches.
const API = '/api/crm/grants'

async function getJSON(url: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to load grants')
  return res.json()
}

async function sendJSON(method: 'POST' | 'PATCH', body: unknown) {
  const res = await fetch(API, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to save grant')
  return res.json()
}

// Fetch all grants with optional filters
export function useGrants(filters?: {
  stage?: string
  funderId?: string
  minAmount?: number
  maxAmount?: number
}) {
  return useQuery({
    queryKey: ['grants', filters],
    queryFn: async (): Promise<any[]> => {
      const params = new URLSearchParams()
      if (filters?.stage) params.set('stage', filters.stage)
      if (filters?.funderId) params.set('funderId', filters.funderId)
      if (filters?.minAmount) params.set('minAmount', String(filters.minAmount))
      if (filters?.maxAmount) params.set('maxAmount', String(filters.maxAmount))
      return getJSON(`${API}?${params.toString()}`)
    },
  })
}

// Fetch single grant with full details
export function useGrant(id: string) {
  return useQuery({
    queryKey: ['grants', id],
    queryFn: async (): Promise<any> => getJSON(`${API}?id=${encodeURIComponent(id)}`),
    enabled: !!id,
  })
}

// Create grant
export function useCreateGrant() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (grant: GrantInsert) => sendJSON('POST', grant),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grants'] })
    },
  })
}

// Update grant
export function useUpdateGrant() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: GrantUpdate & { id: string }) =>
      sendJSON('PATCH', { id, ...updates }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['grants'] })
      queryClient.invalidateQueries({ queryKey: ['grants', data.id] })
    },
  })
}

// Update grant stage
export function useUpdateGrantStage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: string }) =>
      sendJSON('PATCH', { id, stage }),
    onSuccess: (data: any) => {
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
      const res = await fetch(`${API}?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete grant')
      return res.json()
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
      const data: any[] = await getJSON(API)

      const pipeline: Record<string, any[]> = {
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
    queryFn: async (): Promise<any[]> => {
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() + daysAhead)

      const data: any[] = await getJSON(API)
      return data.filter((g) => {
        const dates = [g.deadline, g.next_report_due].filter(Boolean)
        return dates.some((d: string) => new Date(d) <= cutoff)
      })
    },
  })
}

// Grant milestones
// The `grant_milestones` table does not exist in this database — the detail page
// falls back to an empty list. Returning [] rather than querying keeps a
// guaranteed-failing request (retried on every mount) out of the page.
export function useGrantMilestones(grantId: string) {
  return useQuery({
    queryKey: ['grants', grantId, 'milestones'],
    queryFn: async (): Promise<any[]> => [],
    enabled: !!grantId,
  })
}

// Update milestone status — no-op while `grant_milestones` does not exist.
export function useUpdateMilestone() {
  return useMutation({
    mutationFn: async (_args: { id: string; grantId: string; status: string }) => {
      throw new Error('Milestones are not available — the grant_milestones table does not exist')
    },
  })
}

// Grant statistics
export function useGrantStats() {
  return useQuery({
    queryKey: ['grants', 'stats'],
    queryFn: async () => {
      const data: any[] = await getJSON(API)

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
          stats.pipelineValue += Number(grant.amount_requested) || 0
          stats.weightedPipeline +=
            ((Number(grant.amount_requested) || 0) * (Number(grant.probability) || 0)) / 100
        }

        if (grant.stage === 'active') {
          stats.totalSecured += Number(grant.amount_awarded) || 0
        }
      })

      return stats
    },
  })
}
