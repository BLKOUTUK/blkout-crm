'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase'

// Using any for now until migration is applied
type OrganizationInsert = Record<string, unknown>
type OrganizationUpdate = Record<string, unknown>

function getSupabase() { return createClient() }

// Fetch all organizations
export function useOrganizations(filters?: {
  type?: string
  relationshipType?: string
  status?: string
  isFunder?: boolean
}) {
  return useQuery({
    queryKey: ['organizations', filters],
    queryFn: async () => {
      let query = getSupabase()
        .from('organizations')
        .select(`
          *,
          primary_contact:contacts(id, first_name, last_name, email)
        `)
        .order('name', { ascending: true })

      if (filters?.type) {
        query = query.eq('org_type', filters.type)
      }
      if (filters?.relationshipType) {
        query = query.eq('relationship_type', filters.relationshipType)
      }
      if (filters?.status) {
        query = query.eq('relationship_status', filters.status)
      }
      if (filters?.isFunder !== undefined) {
        query = query.eq('is_funder', filters.isFunder)
      }

      const { data, error } = await query

      if (error) throw error
      return data
    },
  })
}

// Fetch single organization
export function useOrganization(id: string) {
  return useQuery({
    queryKey: ['organizations', id],
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from('organizations')
        .select(`
          *,
          primary_contact:contacts(*),
          contacts:contacts(id, first_name, last_name, email, job_title, influence_level),
          partnerships:partnerships(*)
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!id,
  })
}

// Create organization
export function useCreateOrganization() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (org: OrganizationInsert) => {
      const { data, error } = await getSupabase()
        .from('organizations')
        .insert(org)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
    },
  })
}

// Update organization
export function useUpdateOrganization() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: OrganizationUpdate & { id: string }) => {
      const { data, error } = await getSupabase()
        .from('organizations')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
      queryClient.invalidateQueries({ queryKey: ['organizations', data.id] })
    },
  })
}

// Delete organization
export function useDeleteOrganization() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await getSupabase().from('organizations').delete().eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
    },
  })
}

// Get organization stats by type
export function useOrganizationStats() {
  return useQuery({
    queryKey: ['organizations', 'stats'],
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from('organizations')
        .select('org_type, relationship_status')

      if (error) throw error

      // Calculate stats
      const byType: Record<string, number> = {}
      const byStatus: Record<string, number> = {}

      data.forEach((org) => {
        byType[org.org_type] = (byType[org.org_type] || 0) + 1
        byStatus[org.relationship_status] = (byStatus[org.relationship_status] || 0) + 1
      })

      return {
        total: data.length,
        byType,
        byStatus,
      }
    },
  })
}
