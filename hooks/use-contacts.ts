'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase'

// Using any for now until migration is applied
type ContactInsert = Record<string, unknown>
type ContactUpdate = Record<string, unknown>

function getSupabase() { return createClient() }

// Fetch all contacts
export function useContacts(filters?: {
  type?: string
  status?: string
  organizationId?: string
}) {
  return useQuery({
    queryKey: ['contacts', filters],
    queryFn: async () => {
      let query = getSupabase()
        .from('contacts')
        .select(`
          *,
          organization:organizations(id, name, org_type)
        `)
        .order('last_name', { ascending: true })

      if (filters?.type) {
        query = query.contains('contact_type', [filters.type])
      }
      if (filters?.status) {
        query = query.eq('status', filters.status)
      }
      if (filters?.organizationId) {
        query = query.eq('organization_id', filters.organizationId)
      }

      const { data, error } = await query

      if (error) throw error
      return data
    },
  })
}

// Fetch single contact
export function useContact(id: string) {
  return useQuery({
    queryKey: ['contacts', id],
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from('contacts')
        .select(`
          *,
          organization:organizations(*)
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!id,
  })
}

// Create contact
export function useCreateContact() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (contact: ContactInsert) => {
      const { data, error } = await getSupabase()
        .from('contacts')
        .insert(contact)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
    },
  })
}

// Update contact
export function useUpdateContact() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: ContactUpdate & { id: string }) => {
      const { data, error } = await getSupabase()
        .from('contacts')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      queryClient.invalidateQueries({ queryKey: ['contacts', data.id] })
    },
  })
}

// Delete contact
export function useDeleteContact() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await getSupabase().from('contacts').delete().eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
    },
  })
}

// Search contacts
export function useSearchContacts(searchTerm: string) {
  return useQuery({
    queryKey: ['contacts', 'search', searchTerm],
    queryFn: async () => {
      const { data, error } = await getSupabase().rpc('search_contacts', {
        search_term: searchTerm,
      })

      if (error) throw error
      return data
    },
    enabled: searchTerm.length >= 2,
  })
}
