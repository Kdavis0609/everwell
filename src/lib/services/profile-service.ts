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
    console.log('Attempting to fetch profile for user:', uid);
    
    // Try to get profile with minimal columns first, then add more if they exist
    let { data, error } = await sb
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .maybeSingle();

    // If that fails, try with just the basic columns
    if (error) {
      console.log('Full profile query failed, trying basic columns...');
      const { data: basicData, error: basicError } = await sb
        .from('profiles')
        .select('id, email, full_name')
        .eq('id', uid)
        .maybeSingle();
      
      if (basicData) {
        data = { 
          ...basicData, 
          avatar_url: null, 
          handle: null, 
          created_at: null, 
          updated_at: null 
        };
        error = null;
      } else {
        error = basicError;
      }
    }

    if (error) { 
      console.warn('Profile query error:', error);
      logError('getProfile.query', error, { uid }); 
      return null; // WHY: Return null instead of throwing for query errors
    }
    
    console.log('Profile query completed, data:', data);
    
    // Transform the data to match the Profile type (id -> user_id)
    if (data) {
      return {
        user_id: data.id,
        email: data.email,
        full_name: data.full_name,
        avatar_url: data.avatar_url || null,
        handle: data.handle || null,
        created_at: data.created_at || null,
        updated_at: data.updated_at || null
      };
    }
    
    // If no profile exists, try to create one
    console.log('No profile found, attempting to create one');
    try {
      await ensureProfile(sb);
      // Try to fetch the profile again with basic columns
      const { data: newData, error: newError } = await sb
        .from('profiles')
        .select('id, email, full_name')
        .eq('id', uid)
        .maybeSingle();
        
      if (newError) {
        console.warn('Failed to fetch profile after creation:', newError);
        return null;
      }
      
      if (newData) {
        return {
          user_id: newData.id,
          email: newData.email,
          full_name: newData.full_name,
          avatar_url: null,
          handle: null,
          created_at: null,
          updated_at: null
        };
      }
    } catch (createError) {
      console.warn('Failed to create profile:', createError);
    }
    
    return null;
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
    console.log('Ensuring profile exists for user:', user.id);
    
    // Try to create profile with minimal required fields
    const payload = {
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name ?? null
    };

    console.log('Attempting to upsert profile with payload:', payload);
    
    const { error } = await sb
      .from('profiles')
      .upsert(payload, { onConflict: 'id' }); // requires unique index on id

    if (error) { 
      console.warn('Profile upsert error:', error);
      logError('ensureProfile.upsert', error, { uid: user.id }); 
      return; // WHY: Return early instead of throwing for upsert errors
    }
    
    console.log('Profile upsert successful');
  } catch (error) {
    logError('ensureProfile.catch', error);
    return; // WHY: Return early for any unexpected errors
  }
}
