// src/lib/supabaseClient.ts
// ⚠️ DEPRECATED: Use @/lib/supabase/client instead
// This file is kept for backward compatibility but should be migrated

import { createBrowserClient } from '@supabase/ssr'

// Validate required environment variables in development
if (process.env.NODE_ENV === 'development') {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.error('❌ NEXT_PUBLIC_SUPABASE_URL is missing. Please add it to your .env.local file.');
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is missing. Please add it to your .env.local file.');
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error('💡 Add these to your .env.local file:');
    console.error('   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co');
    console.error('   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here');
  }
}

// Client-side Supabase client with session persistence
export const supabase = createBrowserClient(
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

// Browser client for SSR (deprecated - use @/lib/supabase/client instead)
export function createClient() {
  console.warn('⚠️ createClient() is deprecated. Use createSupabaseBrowser() from @/lib/supabase/client instead.');
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
