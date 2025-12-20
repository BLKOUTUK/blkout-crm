// IVOR AI Integration Types

export interface IvorMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface IvorSession {
  id: string
  contact_id?: string
  session_start: string
  session_end?: string
  messages: IvorMessage[]
  topics: string[]
  status: 'active' | 'ended'
}

export interface IvorChatRequest {
  message: string
  sessionId?: string
  contactId?: string
}

export interface IvorChatResponse {
  message: string
  sessionId: string
  journeyStage?: string
  resources?: IvorResource[]
  timestamp: string
}

export interface IvorResource {
  id: string
  name: string
  description: string
  type: string
  location?: string
  url?: string
  metadata?: Record<string, unknown>
}

export interface IvorSearchRequest {
  query: string
  limit?: number
  minScore?: number
  filters?: Record<string, unknown>
}

export interface IvorSearchResult {
  id: string
  score: number
  name: string
  description?: string
  type: string
  location?: string
  metadata: Record<string, unknown>
  source_table: string
  supabase_id?: string
}

export interface IvorSearchResponse {
  query: string
  results: IvorSearchResult[]
  total: number
  processingTimeMs: number
}

export interface IvorHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  service: string
  name: string
  capabilities: string[]
  communityImpact: string
  timestamp: string
}

export interface IvorInteraction {
  id: string
  session_id: string
  contact_id?: string
  query: string
  response: string
  topics: string[]
  resources_suggested?: IvorResource[]
  journey_stage?: string
  satisfaction_score?: number
  created_at: string
}

export interface IvorStats {
  totalSessions: number
  totalQueries: number
  activeUsers: number
  topTopics: Array<{ topic: string; count: number }>
  averageSatisfaction: number
  queriesThisWeek: number
  queryTrend: 'up' | 'down' | 'stable'
}

// IVOR API configuration
// Canonical URLs from @blkout/shared (packages/shared/src/config/urls.ts)
// Using hardcoded defaults here for Next.js compatibility (Vite's import.meta.env doesn't work)
// IMPORTANT: Update these if shared URLs change

// Canonical production URLs (source: packages/shared/src/config/urls.ts)
const SHARED_URLS = {
  IVOR_API: 'https://ivor.blkoutuk.cloud',
  SEMANTIC_SEARCH: 'https://web-production-f5f58.up.railway.app',
} as const

export const IVOR_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_IVOR_API_URL || SHARED_URLS.IVOR_API,
  semanticSearchUrl: process.env.NEXT_PUBLIC_IVOR_SEMANTIC_URL || SHARED_URLS.SEMANTIC_SEARCH,
  endpoints: {
    health: '/api/health',
    chat: '/api/chat',
    search: '/search',
    stats: '/stats',
  },
} as const
