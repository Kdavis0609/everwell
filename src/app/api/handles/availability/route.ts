import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const handle = searchParams.get('handle') ?? '';
  
  const supabase = createSupabaseServer();
  const { data, error } = await supabase.rpc('is_handle_available', { candidate: handle });
  
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
  
  return NextResponse.json({ ok: true, available: data === true });
}
