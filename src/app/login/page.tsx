// src/app/login/page.tsx
'use client'

import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '@/lib/supabaseClient' // <-- use the shared client

export default function LoginPage() {
  return (
    <div className="min-h-screen grid place-items-center p-8">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-semibold mb-4">Sign in</h1>

        <Auth
          supabaseClient={supabase}
          view="magic_link"
          // IMPORTANT: send users to the callback page we created
          redirectTo={`${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  inputText: '#ffffff',
                  inputBackground: '#0b0f14',
                  inputBorder: '#374151',
                  brand: '#10b981',
                  brandAccent: '#059669',
                },
              },
            },
          }}
          providers={[]}
        />
      </div>
    </div>
  )
}
