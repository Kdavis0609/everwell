'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase/client';
import { AppShell } from '@/components/app-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AvatarUpload } from '@/components/avatar-upload';
import { LoadingSpinner } from '@/components/loading-spinner';
import { User, Save, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import type { Profile } from '@/lib/types/profile';

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [authUser, setAuthUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    full_name: ''
  });
  const [handleData, setHandleData] = useState({
    handle: ''
  });
  const [handleLoading, setHandleLoading] = useState(false);
  const [handleAvailable, setHandleAvailable] = useState<boolean | null>(null);
  const [handleDebounceTimer, setHandleDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  // Check if there are unsaved changes (only for full_name since email is read-only)
  const hasChanges = profile && authUser && (
    formData.full_name !== (profile.full_name || '')
  );

  // Alternative change detection for debugging
  const hasChangesAlt = profile && authUser && (
    formData.full_name.trim() !== (profile.full_name || '').trim()
  );

  // Debug change detection
  if (profile && authUser) {
    console.log('Change detection debug:', {
      formDataFullName: formData.full_name,
      profileFullName: profile.full_name,
      profileFullNameOrEmpty: profile.full_name || '',
      areEqual: formData.full_name === (profile.full_name || ''),
      hasChanges: hasChanges,
      hasChangesAlt: hasChangesAlt,
      formDataType: typeof formData.full_name,
      profileType: typeof profile.full_name,
      formDataLength: formData.full_name.length,
      profileLength: (profile.full_name || '').length
    });
  }

  // Debug logging
  console.log('Current state:', {
    profile: profile,
    authUser: authUser,
    formData: formData,
    hasChanges: hasChanges,
    loading: loading
  });

  if (profile) {
    console.log('Profile data:', {
      profileFullName: profile.full_name,
      formFullName: formData.full_name,
      hasChanges,
      profileEmail: profile.email,
      userId: profile.user_id,
      created_at: profile.created_at,
      comparison: {
        formFullName: formData.full_name,
        profileFullName: profile.full_name || '',
        areEqual: formData.full_name === (profile.full_name || '')
      }
    });
  }

  useEffect(() => {
    loadProfile();
  }, []);

  // Sync form data when profile changes
  useEffect(() => {
    if (profile) {
      console.log('Syncing form data with profile:', {
        profileFullName: profile.full_name,
        currentFormData: formData.full_name
      });
      setFormData({
        full_name: profile.full_name || ''
      });
    }
  }, [profile?.full_name]); // Only depend on the full_name field

    const loadProfile = async () => {
    try {
      console.log('Starting profile load...');
      const supabase = createSupabaseBrowser();
      
      // Get auth user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('Auth error:', userError);
        toast.error('Please log in to view your profile');
        return;
      }

      console.log('Auth user loaded:', user);
      setAuthUser(user);

      // Try to get existing profile with error handling
      console.log('Fetching profile for user ID:', user.id);
      let { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url, handle, created_at, updated_at')
        .eq('id', user.id)
        .maybeSingle();

      console.log('Profile fetch result:', { profileData, profileError });

      // If there's an error or no profile data, try to create one
      if (profileError || !profileData) {
        console.log('Profile not found or error occurred, attempting to create...');
        
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            email: user.email,
            full_name: null,
            avatar_url: null
          }, {
            onConflict: 'id'
          })
          .select('id, email, full_name, avatar_url, handle, created_at, updated_at')
          .single();

        if (createError) {
          console.error('Failed to create/upsert profile:', createError);
          toast.error('Failed to create profile');
          return;
        }

        console.log('Profile created/updated successfully:', newProfile);
        profileData = newProfile;
      }

      // Ensure we have profile data
      if (!profileData) {
        console.error('Still no profile data after creation attempt');
        toast.error('Failed to load or create profile');
        return;
      }

      console.log('Final profile data:', profileData);

      const profile: Profile = {
        user_id: profileData.id,
        email: user.email || profileData.email, // Use auth email first
        full_name: profileData.full_name,
        avatar_url: profileData.avatar_url,
        handle: profileData.handle,
        created_at: profileData.created_at,
        updated_at: profileData.updated_at
      };

      console.log('Setting profile state:', profile);
      setProfile(profile);
      
      // Set form data immediately
      setFormData({
        full_name: profile.full_name || ''
      });
      
      // Set handle data
      setHandleData({
        handle: profile.handle || ''
      });

      console.log('Profile load completed successfully');

    } catch (error) {
      console.error('Profile load error:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile || !authUser) return;

    // Check if there are any changes to save (only full_name since email is read-only)
    if (formData.full_name === (profile.full_name || '') && 
        formData.full_name.trim() === (profile.full_name || '').trim()) {
      toast.info('No changes to save');
      return;
    }

    console.log('Saving profile changes:', {
      current: profile.full_name,
      new: formData.full_name,
      userId: authUser.id
    });

    setSaving(true);

    try {
      const supabase = createSupabaseBrowser();
      
      // Update the profile
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name || null
        })
        .eq('id', authUser.id);

      if (error) {
        throw error;
      }

      toast.success('Profile updated successfully!');
      
      // Reload profile to get updated data
      await loadProfile();

    } catch (error) {
      console.error('Profile update error:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpdate = (avatarUrl: string) => {
    if (profile) {
      setProfile({
        ...profile,
        avatar_url: avatarUrl
      });
    }
  };

  const checkHandleAvailability = async (handle: string) => {
    if (!handle || handle.length < 3) {
      setHandleAvailable(null);
      return;
    }

    try {
      const supabase = createSupabaseBrowser();
      const { data, error } = await supabase.rpc('is_handle_available', {
        candidate: handle
      });

      if (error) {
        console.error('Handle availability check error:', error);
        // If the RPC doesn't exist yet (before migration), assume available
        if (error.message?.includes('function') || error.message?.includes('does not exist')) {
          setHandleAvailable(true);
        } else {
          setHandleAvailable(false);
        }
        return;
      }

      setHandleAvailable(data);
    } catch (error) {
      console.error('Handle availability check failed:', error);
      // Default to available if check fails (before migration)
      setHandleAvailable(true);
    }
  };

  const handleHandleChange = (value: string) => {
    const normalizedValue = value.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    setHandleData({ handle: normalizedValue });

    // Clear existing timer
    if (handleDebounceTimer) {
      clearTimeout(handleDebounceTimer);
    }

    // Set new timer for debounced availability check
    const timer = setTimeout(() => {
      checkHandleAvailability(normalizedValue);
    }, 300);

    setHandleDebounceTimer(timer);
  };

  const handleUpdateHandle = async () => {
    if (!handleData.handle || handleData.handle.length < 3) {
      toast.error('Handle must be at least 3 characters long');
      return;
    }

    setHandleLoading(true);

    try {
      const supabase = createSupabaseBrowser();
      const { data, error } = await supabase.rpc('update_my_handle', {
        new_handle: handleData.handle
      });

      if (error) {
        console.error('Handle update error:', error);
        if (error.message?.includes('invalid_handle')) {
          toast.error('Invalid handle format. Use only letters, numbers, hyphens, and underscores.');
        } else if (error.message?.includes('not_authenticated')) {
          toast.error('Please log in to update your handle');
        } else if (error.message?.includes('function') || error.message?.includes('does not exist')) {
          toast.error('Handle system not yet available. Please run the database migration first.');
        } else {
          toast.error('Failed to update handle');
        }
        return;
      }

      if (data && data.length > 0) {
        const updatedHandle = data[0].handle;
        setHandleData({ handle: updatedHandle });
        
        // Update profile state
        if (profile) {
          setProfile({
            ...profile,
            handle: updatedHandle
          });
        }

        toast.success('Handle updated successfully!');
        setHandleAvailable(true);
      }
    } catch (error) {
      console.error('Handle update failed:', error);
      toast.error('Failed to update handle');
    } finally {
      setHandleLoading(false);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center space-x-2">
            <LoadingSpinner size={20} />
            <span className="text-gray-600">Loading profile...</span>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="px-6 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Profile Settings</h1>
              <p className="text-muted-foreground">Manage your account information and preferences</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Avatar Section */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>Profile Picture</span>
                </CardTitle>
                <CardDescription>
                  Upload a profile picture to personalize your account
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <AvatarUpload
                  currentAvatarUrl={profile?.avatar_url}
                  onAvatarUpdate={handleAvatarUpdate}
                  size="lg"
                />
              </CardContent>
            </Card>
          </div>

          {/* Profile Information */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
                <CardDescription>
                  Update your personal information and contact details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name</Label>
                                     <Input
                     id="full_name"
                     type="text"
                     placeholder="Enter your full name"
                     value={formData.full_name}
                     onChange={(e) => {
                       console.log('Input changed:', {
                         newValue: e.target.value,
                         oldValue: formData.full_name
                       });
                       setFormData(prev => ({ ...prev, full_name: e.target.value }));
                     }}
                   />
                </div>

                                                   <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={authUser?.email || profile?.email || ''}
                      disabled
                      className="bg-muted text-muted-foreground"
                    />
                    <p className="text-xs text-muted-foreground">
                      This is the email address your account was created with. To change your email, please contact support.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="handle">Handle</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="handle"
                        type="text"
                        placeholder="Enter your handle"
                        value={handleData.handle}
                        onChange={(e) => handleHandleChange(e.target.value)}
                        className="flex-1"
                        maxLength={30}
                      />
                      <Button
                        onClick={handleUpdateHandle}
                        disabled={handleLoading || !handleData.handle || handleData.handle.length < 3}
                        size="sm"
                      >
                        {handleLoading ? (
                          <>
                            <LoadingSpinner size={16} className="mr-2" />
                            Updating...
                          </>
                        ) : (
                          'Update'
                        )}
                      </Button>
                    </div>
                    <div className="flex items-center space-x-2 text-xs">
                      {handleData.handle && (
                        <>
                          {handleAvailable === true && (
                            <span className="text-green-600">✓ Available</span>
                          )}
                          {handleAvailable === false && (
                            <span className="text-red-600">✗ Taken</span>
                          )}
                          {handleAvailable === null && handleData.handle.length >= 3 && (
                            <span className="text-yellow-600">Checking...</span>
                          )}
                        </>
                      )}
                      <span className="text-muted-foreground">
                        {handleData.handle.length}/30 characters
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Your unique handle for sharing your profile. Use only letters, numbers, hyphens, and underscores.
                    </p>
                  </div>

                <div className="pt-4">
                                     <Button 
                     onClick={handleSave} 
                     disabled={saving || (!hasChanges && !hasChangesAlt)}
                     className="w-full sm:w-auto"
                     variant={(hasChanges || hasChangesAlt) ? "default" : "secondary"}
                   >
                    {saving ? (
                      <>
                        <LoadingSpinner size={16} className="mr-2" />
                        Saving...
                      </>
                                         ) : (
                       <>
                         <Save className="w-4 h-4 mr-2" />
                         {(hasChanges || hasChangesAlt) ? 'Save Changes' : 'No Changes'}
                       </>
                     )}
                  </Button>
                                     {(hasChanges || hasChangesAlt) && (
                     <p className="text-xs text-muted-foreground mt-2">
                       You have unsaved changes
                     </p>
                   )}
                   
                   {/* Debug info */}
                   <div className="mt-4 p-2 bg-muted rounded text-xs">
                     <p><strong>Debug Info:</strong></p>
                     <p>Form Data: "{formData.full_name}"</p>
                     <p>Profile: "{profile?.full_name || 'null'}"</p>
                     <p>Has Changes: {hasChanges ? 'true' : 'false'}</p>
                     <p>Has Changes Alt: {hasChangesAlt ? 'true' : 'false'}</p>
                     <p>Auth User: {authUser ? 'loaded' : 'null'}</p>
                     <button 
                       onClick={() => {
                         console.log('Test button clicked');
                         setFormData({ full_name: 'Test Change' });
                       }}
                       className="mt-2 px-2 py-1 bg-blue-500 text-white rounded text-xs"
                     >
                       Test Change
                     </button>
                   </div>
                </div>
              </CardContent>
            </Card>

            {/* Account Information */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Account Details</CardTitle>
                <CardDescription>
                  Your account information and settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div>
                     <Label className="text-sm font-medium text-muted-foreground">User ID</Label>
                     <p className="text-sm font-mono bg-muted px-2 py-1 rounded mt-1">
                       {authUser?.id || profile?.user_id || 'Loading...'}
                     </p>
                   </div>
                   <div>
                     <Label className="text-sm font-medium text-muted-foreground">Member Since</Label>
                     <p className="text-sm mt-1">
                       {profile?.created_at 
                         ? new Date(profile.created_at).toLocaleDateString('en-US', {
                             year: 'numeric',
                             month: 'long',
                             day: 'numeric'
                           })
                         : 'Unknown'
                       }
                     </p>
                   </div>
                 </div>
                 
                 {profile?.handle && (
                   <div>
                     <Label className="text-sm font-medium text-muted-foreground">Handle</Label>
                     <p className="text-sm font-mono bg-muted px-2 py-1 rounded mt-1">
                       @{profile.handle}
                     </p>
                   </div>
                 )}
                
                {profile?.updated_at && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Last Updated</Label>
                    <p className="text-sm mt-1">
                      {new Date(profile.updated_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
