import type { SupabaseClient } from '@supabase/supabase-js';
import { logError } from '@/lib/logError';

export async function getProfile(sb: SupabaseClient) {
  const { data: { session }, error: sErr } = await sb.auth.getSession();
  if (sErr) { logError('getProfile.session', sErr); throw sErr; }
  if (!session) { logError('getProfile.auth', { message: 'No session' }); return null; }

  const uid = session.user.id;
  const { data, error } = await sb
    .from('profiles')
    .select('user_id, email, full_name, avatar_url')
    .eq('user_id', uid)
    .maybeSingle();

  if (error) { logError('getProfile.query', error, { uid }); throw error; }
  return data;
}

export async function ensureProfile(sb: SupabaseClient) {
  const { data: { session }, error: sErr } = await sb.auth.getSession();
  if (sErr) { logError('ensureProfile.session', sErr); throw sErr; }
  if (!session) { logError('ensureProfile.auth', { message: 'No session' }); return; }

  const user = session.user;
  const payload = {
    user_id: user.id,
    email: user.email ?? null,
    full_name: user.user_metadata?.full_name ?? null,
    avatar_url: user.user_metadata?.avatar_url ?? null,
  };

  const { error } = await sb
    .from('profiles')
    .upsert(payload, { onConflict: 'user_id' }); // requires unique index on user_id

  if (error) { logError('ensureProfile.upsert', error, { uid: user.id }); throw error; }
}
