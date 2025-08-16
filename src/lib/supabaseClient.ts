// src/lib/supabaseClient.ts
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Client-side Supabase client with session persistence
export const supabase = createSupabaseClient(url, anon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'everwell-auth'
  }
})

// Browser client for SSR
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storageKey: 'everwell-auth'
      }
    }
  )
}
