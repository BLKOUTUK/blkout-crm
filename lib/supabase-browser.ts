import { createBrowserClient } from '@supabase/ssr'

// Browser-only Supabase client for use in client components
// Note: Using untyped client until migration is applied
// After migration, uncomment: import { Database } from '@/types/database'
// and add <Database> type parameter to createBrowserClient

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
