// IVOR API Client Library

import { IVOR_CONFIG, type IvorChatRequest, type IvorChatResponse, type IvorHealthStatus, type IvorSearchRequest, type IvorSearchResponse } from '@/types/ivor'

const { baseUrl, endpoints } = IVOR_CONFIG

// Check IVOR health status
export async function checkIvorHealth(): Promise<IvorHealthStatus> {
  try {
    const response = await fetch(`${baseUrl}${endpoints.health}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      return {
        status: 'unhealthy',
        service: 'ivor-core',
        name: 'IVOR Core',
        capabilities: [],
        communityImpact: 'Service unavailable',
        timestamp: new Date().toISOString(),
      }
    }

    const data = await response.json()
    return {
      status: 'healthy',
      service: data.service || 'ivor-core',
      name: data.name || 'IVOR Core - Personal AI Services',
      capabilities: data.capabilities || ['community-focused-responses', 'liberation-centered', 'culturally-affirming'],
      communityImpact: data.communityImpact || 'Serving Black queer communities with AI-powered support',
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    console.error('IVOR health check failed:', error)
    return {
      status: 'unhealthy',
      service: 'ivor-core',
      name: 'IVOR Core',
      capabilities: [],
      communityImpact: 'Service connection failed',
      timestamp: new Date().toISOString(),
    }
  }
}

// Send message to IVOR
export async function sendIvorMessage(request: IvorChatRequest): Promise<IvorChatResponse> {
  try {
    const response = await fetch(`${baseUrl}${endpoints.chat}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: request.message,
        sessionId: request.sessionId,
        contactId: request.contactId,
      }),
    })

    if (!response.ok) {
      throw new Error(`IVOR chat request failed: ${response.statusText}`)
    }

    const data = await response.json()
    return {
      message: data.response || data.message || 'I\'m here to help. How can I support you today?',
      sessionId: data.sessionId || request.sessionId || generateSessionId(),
      journeyStage: data.journeyStage,
      resources: data.resources,
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    console.error('IVOR chat error:', error)
    throw error
  }
}

// Search IVOR knowledge base
export async function searchIvorResources(request: IvorSearchRequest): Promise<IvorSearchResponse> {
  try {
    const response = await fetch(`${baseUrl}${endpoints.search}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: request.query,
        limit: request.limit || 5,
        min_score: request.minScore || 0.5,
        filters: request.filters,
      }),
    })

    if (!response.ok) {
      throw new Error(`IVOR search request failed: ${response.statusText}`)
    }

    const data = await response.json()
    return {
      query: request.query,
      results: data.results || [],
      total: data.total || data.results?.length || 0,
      processingTimeMs: data.processing_time_ms || 0,
    }
  } catch (error) {
    console.error('IVOR search error:', error)
    throw error
  }
}

// Generate session ID
function generateSessionId(): string {
  return `ivor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Format IVOR response for display
export function formatIvorResponse(response: string): string {
  // Handle markdown formatting
  return response
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>')
}

// Extract topics from conversation
export function extractTopics(messages: string[]): string[] {
  const topicKeywords = [
    'mental health', 'anxiety', 'depression', 'crisis',
    'housing', 'employment', 'legal', 'healthcare',
    'community', 'events', 'support', 'resources',
    'HIV', 'sexual health', 'wellness', 'therapy',
    'discrimination', 'rights', 'advocacy', 'liberation'
  ]

  const foundTopics = new Set<string>()
  const combined = messages.join(' ').toLowerCase()

  topicKeywords.forEach(topic => {
    if (combined.includes(topic.toLowerCase())) {
      foundTopics.add(topic)
    }
  })

  return Array.from(foundTopics)
}
