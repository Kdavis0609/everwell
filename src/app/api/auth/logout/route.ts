import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return new Response('Not found', { status: 404 });
  }
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: '', ...options, maxAge: 0 });
        },
      },
    }
  );

  try { await supabase.auth.signOut(); } catch {}

  const res = NextResponse.json({ ok: true });
  [
    'sb-access-token',
    'sb-refresh-token',
    'supabase-auth-token',
    'supabase-session',
    'next-auth.session-token',
  ].forEach((n) => res.cookies.set({ name: n, value: '', maxAge: 0, path: '/' }));
  return res;
}
