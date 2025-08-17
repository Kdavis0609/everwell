import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';

export async function GET() {
  const sb = await createSupabaseServer();
  const { data, error } = await sb.auth.getSession();
  return NextResponse.json({ data, error }, { status: error ? 500 : 200 });
}
