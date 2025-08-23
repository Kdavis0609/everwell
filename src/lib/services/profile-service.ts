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
                    // Attempting to fetch profile for user
    
    const { data, error } = await sb
      .from('profiles')
      .select('id, full_name')
      .eq('id', uid)
      .maybeSingle();

    if (error) { 
                      console.warn('Profile query error:', error);
      logError('getProfile.query', error, { uid }); 
      return null; // WHY: Return null instead of throwing for query errors
    }
    
                    // Profile query completed
    
    // Transform the data to match the Profile type (id -> user_id)
    if (data) {
      return {
        user_id: data.id,
        email: null, // Default to null since column doesn't exist
        full_name: data.full_name,
        avatar_url: null, // Default to null since column doesn't exist
        created_at: data.created_at,
        updated_at: data.updated_at
      };
    }
    
    // If no profile exists, try to create one
                    // No profile found, attempting to create one
    try {
      await ensureProfile(sb);
      // Try to fetch the profile again
      const { data: newData, error: newError } = await sb
        .from('profiles')
        .select('id, full_name')
        .eq('id', uid)
        .maybeSingle();
        
      if (newError) {
                          console.warn('Failed to fetch profile after creation:', newError);
        return null;
      }
      
      if (newData) {
        return {
          user_id: newData.id,
          email: null, // Default to null since column doesn't exist
          full_name: newData.full_name,
          avatar_url: null, // Default to null since column doesn't exist
          created_at: newData.created_at,
          updated_at: newData.updated_at
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
    const payload = {
      id: user.id,
      full_name: user.user_metadata?.full_name ?? null,
      // Removed email and avatar_url since columns don't exist in database
    };

                    // Attempting to upsert profile
    
    const { error } = await sb
      .from('profiles')
      .upsert(payload, { onConflict: 'id' }); // requires unique index on id

    if (error) { 
                      console.warn('Profile upsert error:', error);
      logError('ensureProfile.upsert', error, { uid: user.id }); 
      return; // WHY: Return early instead of throwing for upsert errors
    }
    
                    // Profile upsert successful
  } catch (error) {
    logError('ensureProfile.catch', error);
    return; // WHY: Return early for any unexpected errors
  }
}
