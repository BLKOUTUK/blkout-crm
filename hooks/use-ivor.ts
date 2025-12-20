'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { checkIvorHealth, sendIvorMessage, searchIvorResources } from '@/lib/ivor'
import type { IvorMessage, IvorChatRequest, IvorHealthStatus, IvorSearchRequest, IvorStats } from '@/types/ivor'

// Lazy-load supabase client to avoid build-time errors
function getSupabase() {
  return createClient()
}

// IVOR health status hook
export function useIvorHealth() {
  return useQuery<IvorHealthStatus>({
    queryKey: ['ivor', 'health'],
    queryFn: checkIvorHealth,
    refetchInterval: 60000, // Check every minute
    staleTime: 30000,
  })
}

// IVOR chat hook with session management
export function useIvorChat() {
  const queryClient = useQueryClient()
  const [messages, setMessages] = useState<IvorMessage[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const sendMessage = useCallback(async (content: string, contactId?: string) => {
    setIsLoading(true)

    // Add user message
    const userMessage: IvorMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMessage])

    try {
      const request: IvorChatRequest = {
        message: content,
        sessionId: sessionId || undefined,
        contactId,
      }

      const response = await sendIvorMessage(request)

      // Update session ID
      if (response.sessionId) {
        setSessionId(response.sessionId)
      }

      // Add assistant message
      const assistantMessage: IvorMessage = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content: response.message,
        timestamp: response.timestamp,
      }
      setMessages(prev => [...prev, assistantMessage])

      // Log interaction to database if contactId provided
      if (contactId) {
        await logIvorInteraction(contactId, content, response.message)
      }

      return response
    } catch (error) {
      // Add error message
      const errorMessage: IvorMessage = {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: 'I apologize, but I\'m having trouble connecting right now. Please try again in a moment, or reach out to the community team for immediate support.',
        timestamp: new Date().toISOString(),
      }
      setMessages(prev => [...prev, errorMessage])
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [sessionId])

  const clearChat = useCallback(() => {
    setMessages([])
    setSessionId(null)
  }, [])

  return {
    messages,
    sessionId,
    isLoading,
    sendMessage,
    clearChat,
  }
}

// Log IVOR interaction to CRM database
async function logIvorInteraction(contactId: string, query: string, response: string) {
  try {
    await getSupabase().from('activities').insert({
      contact_id: contactId,
      activity_type: 'ivor_interaction',
      subject: 'IVOR Conversation',
      description: query.substring(0, 200),
      metadata: {
        query,
        response: response.substring(0, 500),
        timestamp: new Date().toISOString(),
      },
    })

    // Update contact's IVOR interaction count
    await getSupabase().rpc('increment_ivor_interactions', {
      p_contact_id: contactId,
    })
  } catch (error) {
    console.error('Failed to log IVOR interaction:', error)
  }
}

// IVOR search hook
export function useIvorSearch() {
  return useMutation({
    mutationFn: (request: IvorSearchRequest) => searchIvorResources(request),
  })
}

// IVOR statistics hook
export function useIvorStats() {
  return useQuery<IvorStats>({
    queryKey: ['ivor', 'stats'],
    queryFn: async () => {
      // Get IVOR interaction stats from CRM database
      const { data: activities, error } = await getSupabase()
        .from('activities')
        .select('*')
        .eq('activity_type', 'ivor_interaction')
        .order('occurred_at', { ascending: false })
        .limit(100)

      if (error) {
        console.error('Failed to fetch IVOR stats:', error)
        return getMockIvorStats()
      }

      // Calculate statistics
      const now = new Date()
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

      const queriesThisWeek = activities?.filter(
        a => new Date(a.occurred_at) >= weekAgo
      ).length || 0

      const queriesLastWeek = activities?.filter(
        a => new Date(a.occurred_at) >= twoWeeksAgo && new Date(a.occurred_at) < weekAgo
      ).length || 0

      const queryTrend = queriesThisWeek > queriesLastWeek ? 'up' :
                         queriesThisWeek < queriesLastWeek ? 'down' : 'stable'

      // Extract topics from metadata
      const topicCounts: Record<string, number> = {}
      activities?.forEach(a => {
        const query = (a.metadata as { query?: string })?.query || ''
        const topics = extractTopicsFromQuery(query)
        topics.forEach(topic => {
          topicCounts[topic] = (topicCounts[topic] || 0) + 1
        })
      })

      const topTopics = Object.entries(topicCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([topic, count]) => ({ topic, count }))

      // Get unique contacts
      const uniqueContacts = new Set(activities?.map(a => a.contact_id).filter(Boolean))

      return {
        totalSessions: Math.ceil((activities?.length || 0) / 3), // Estimate sessions
        totalQueries: activities?.length || 0,
        activeUsers: uniqueContacts.size,
        topTopics,
        averageSatisfaction: 4.2, // Mock for now
        queriesThisWeek,
        queryTrend,
      }
    },
    staleTime: 60000, // 1 minute
  })
}

// Extract topics from query text
function extractTopicsFromQuery(query: string): string[] {
  const topicMap: Record<string, string[]> = {
    'Mental Health': ['mental health', 'anxiety', 'depression', 'stress', 'therapy', 'counseling'],
    'Sexual Health': ['hiv', 'sexual health', 'testing', 'prep', 'sti'],
    'Community': ['community', 'events', 'meetup', 'connect', 'social'],
    'Housing': ['housing', 'accommodation', 'rent', 'homeless'],
    'Employment': ['job', 'employment', 'work', 'career'],
    'Legal': ['legal', 'rights', 'discrimination', 'law'],
    'Crisis Support': ['crisis', 'emergency', 'urgent', 'help now', 'suicide'],
  }

  const found: string[] = []
  const lowerQuery = query.toLowerCase()

  Object.entries(topicMap).forEach(([topic, keywords]) => {
    if (keywords.some(kw => lowerQuery.includes(kw))) {
      found.push(topic)
    }
  })

  return found
}

// Mock stats for when database is empty
function getMockIvorStats(): IvorStats {
  return {
    totalSessions: 0,
    totalQueries: 0,
    activeUsers: 0,
    topTopics: [],
    averageSatisfaction: 0,
    queriesThisWeek: 0,
    queryTrend: 'stable',
  }
}

// Recent IVOR interactions hook
export function useRecentIvorInteractions(limit = 10) {
  return useQuery({
    queryKey: ['ivor', 'interactions', limit],
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from('activities')
        .select(`
          *,
          contact:contacts(id, first_name, last_name)
        `)
        .eq('activity_type', 'ivor_interaction')
        .order('occurred_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      return data
    },
  })
}
