import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'

export default async function Home() {
  try {
    const supabase = await createSupabaseServer()
    const { data: { session } } = await supabase.auth.getSession()
    redirect(session ? '/dashboard' : '/login')
  } catch (error) {
    console.error('Auth session check failed:', error)
    redirect('/login')
  }
}
