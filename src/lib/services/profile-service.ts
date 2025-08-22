import type { SupabaseClient } from '@supabase/supabase-js';
import { logError } from '@/lib/errors';

export async function getProfile(sb: SupabaseClient) {
  try {
    const { data: { session }, error: sErr } = await sb.auth.getSession();
    if (sErr) { 
      logError('getProfile.session', sErr); 
      return null; // WHY: Return null instead of throwing for session errors
    }
    if (!session) { 
      logError('getProfile.auth', { message: 'No session' }); 
      return null; 
    }

    const uid = session.user.id;
    const { data, error } = await sb
      .from('profiles')
      .select('user_id, email, full_name, avatar_url')
      .eq('user_id', uid)
      .maybeSingle();

    if (error) { 
      logError('getProfile.query', error, { uid }); 
      return null; // WHY: Return null instead of throwing for query errors
    }
    return data;
  } catch (error) {
    logError('getProfile.catch', error);
    return null; // WHY: Return null for any unexpected errors
  }
}

export async function ensureProfile(sb: SupabaseClient) {
  try {
    const { data: { session }, error: sErr } = await sb.auth.getSession();
    if (sErr) { 
      logError('ensureProfile.session', sErr); 
      return; // WHY: Return early instead of throwing for session errors
    }
    if (!session) { 
      logError('ensureProfile.auth', { message: 'No session' }); 
      return; 
    }

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

    if (error) { 
      logError('ensureProfile.upsert', error, { uid: user.id }); 
      return; // WHY: Return early instead of throwing for upsert errors
    }
  } catch (error) {
    logError('ensureProfile.catch', error);
    return; // WHY: Return early for any unexpected errors
  }
}
