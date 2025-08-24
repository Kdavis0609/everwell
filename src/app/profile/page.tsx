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

  // More robust change detection
  const hasChangesRobust = profile && authUser && (
    formData.full_name !== (profile.full_name || '') ||
    formData.full_name.trim() !== (profile.full_name || '').trim()
  );

  // More detailed change detection debugging
  if (profile && authUser) {
    console.log('Change detection details:', {
      formDataFullName: `"${formData.full_name}"`,
      profileFullName: `"${profile.full_name || ''}"`,
      formDataTrimmed: `"${formData.full_name.trim()}"`,
      profileTrimmed: `"${(profile.full_name || '').trim()}"`,
      hasChanges: hasChanges,
      hasChangesAlt: hasChangesAlt,
      formDataLength: formData.full_name.length,
      profileLength: (profile.full_name || '').length,
      areEqual: formData.full_name === (profile.full_name || ''),
      areEqualTrimmed: formData.full_name.trim() === (profile.full_name || '').trim()
    });
  }

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

  // Log profile changes for debugging
  useEffect(() => {
    if (profile) {
      console.log('Profile state updated:', {
        user_id: profile.user_id,
        full_name: profile.full_name,
        handle: profile.handle,
        email: profile.email
      });
    }
  }, [profile]);

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
  }, [profile?.full_name, profile?.user_id]); // Depend on both full_name and user_id to ensure proper sync

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

      // Simple approach: try to get profile, if it fails, create one
      console.log('Fetching profile for user ID:', user.id);
      
      let profileData = null;
      let profileError = null;

             // First, try to get the profile with basic columns
               try {
          const { data, error } = await supabase
            .from('profiles')
            .select('id, email, full_name, handle, created_at, updated_at')
            .eq('id', user.id)
            .single();
         
         if (data) {
           profileData = data;
           console.log('Profile found:', profileData);
         } else {
           profileError = error;
           console.log('Profile not found, error:', error);
         }
       } catch (error) {
         console.log('Profile fetch failed:', error);
         profileError = error;
       }

      // If no profile exists, create one
      if (!profileData) {
        console.log('Creating new profile...');
                                   try {
            const { data: newProfile, error: createError } = await supabase
              .from('profiles')
              .insert({
                id: user.id,
                email: user.email
              })
              .select('id, email, full_name, handle, created_at, updated_at')
              .single();

          if (createError) {
            console.error('Failed to create profile:', createError);
            toast.error('Failed to create profile');
            return;
          }

          profileData = newProfile;
          console.log('Profile created successfully:', profileData);
        } catch (createError) {
          console.error('Profile creation failed:', createError);
          toast.error('Failed to create profile');
          return;
        }
      }

      // Create the profile object
      const profile: Profile = {
        user_id: profileData.id,
        email: user.email || profileData.email,
        full_name: profileData.full_name || null,
        avatar_url: profileData.avatar_url || null,
        handle: profileData.handle || null,
        created_at: profileData.created_at || null,
        updated_at: profileData.updated_at || null
      };

             console.log('Setting profile state:', profile);
       console.log('Created at value:', profile.created_at);
       setProfile(profile);
      
      // Set form data
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
      
      // Update local state instead of reloading entire profile
      if (profile) {
        const updatedProfile = {
          ...profile,
          full_name: formData.full_name || null
        };
        setProfile(updatedProfile);
        console.log('Updated local profile state:', updatedProfile);
      }

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
      
      // First, try the RPC function
      console.log('Testing handle availability for:', handle);
      const { data, error } = await supabase.rpc('is_handle_available', {
        candidate: handle
      });

      if (error) {
        console.error('Handle availability check error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: error
        });
        
        // If RPC fails, try direct check as fallback
        if (error.message?.includes('function') || error.message?.includes('does not exist')) {
          console.log('RPC function does not exist, trying direct check...');
          
          // Direct check for existing handle
          const { data: existingProfiles, error: checkError } = await supabase
            .from('profiles')
            .select('id')
            .eq('handle', handle)
            .neq('id', authUser?.id || '');
          
          if (checkError) {
            console.error('Direct handle check failed:', checkError);
            setHandleAvailable(true); // Default to available if check fails
            return;
          }
          
          const isAvailable = !existingProfiles || existingProfiles.length === 0;
          console.log('Direct check result:', isAvailable);
          setHandleAvailable(isAvailable);
          return;
        } else {
          setHandleAvailable(false);
        }
        return;
      }

      console.log('RPC function exists and returned:', data);
      setHandleAvailable(data);
    } catch (error) {
      console.error('Handle availability check failed:', error);
      // Default to available if check fails
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
      
      console.log('Attempting to update handle:', handleData.handle);
      
      // First try the RPC function
      const { data, error } = await supabase.rpc('update_my_handle', {
        new_handle: handleData.handle
      });

      if (error) {
        console.error('Handle update error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: JSON.stringify(error, null, 2)
        });
        
        // If RPC fails, try direct update as fallback
        if (error.message?.includes('function') || error.message?.includes('does not exist') || error.message?.includes('ambiguous')) {
          console.log('RPC failed, trying direct update...');
          
          // Check if handle is available
          const { data: existingProfiles, error: checkError } = await supabase
            .from('profiles')
            .select('id')
            .eq('handle', handleData.handle)
            .neq('id', authUser?.id || '');
          
          if (checkError) {
            console.error('Handle availability check failed:', checkError);
            toast.error('Failed to check handle availability');
            return;
          }
          
          if (existingProfiles && existingProfiles.length > 0) {
            toast.error('This handle is already taken. Please try a different one.');
            return;
          }
          
          // Direct update
          const { data: updateData, error: updateError } = await supabase
            .from('profiles')
            .update({ handle: handleData.handle })
            .eq('id', authUser?.id)
            .select('handle');
          
          if (updateError) {
            console.error('Direct handle update failed:', updateError);
            toast.error(`Failed to update handle: ${updateError.message}`);
            return;
          }
          
                     if (updateData && updateData.length > 0) {
             const updatedHandle = updateData[0].handle;
             setHandleData({ handle: updatedHandle });
             
             // Update profile state
             if (profile) {
               const updatedProfile = {
                 ...profile,
                 handle: updatedHandle
               };
               setProfile(updatedProfile);
               console.log('Updated profile with new handle:', updatedProfile);
             }

             toast.success('Handle updated successfully!');
             setHandleAvailable(true);
             return;
           }
        }
        
        // Handle other RPC errors
        if (error.message?.includes('invalid_handle')) {
          toast.error('Invalid handle format. Use only letters, numbers, hyphens, and underscores.');
        } else if (error.message?.includes('not_authenticated')) {
          toast.error('Please log in to update your handle');
        } else if (error.message?.includes('duplicate key') || error.message?.includes('already exists')) {
          toast.error('This handle is already taken. Please try a different one.');
        } else {
          toast.error(`Failed to update handle: ${error.message || 'Unknown error'}`);
        }
        return;
      }

      console.log('Handle update response:', data);

             if (data && data.length > 0) {
         const updatedHandle = data[0].handle;
         setHandleData({ handle: updatedHandle });
         
         // Update profile state
         if (profile) {
           const updatedProfile = {
             ...profile,
             handle: updatedHandle
           };
           setProfile(updatedProfile);
           console.log('Updated profile with new handle (RPC):', updatedProfile);
         }

         toast.success('Handle updated successfully!');
         setHandleAvailable(true);
       } else {
         console.error('No data returned from handle update');
         toast.error('Handle update failed: No data returned');
       }
    } catch (error) {
      console.error('Handle update failed with exception:', error);
      toast.error(`Failed to update handle: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
                      disabled={saving || !hasChangesRobust}
                      className="w-full sm:w-auto"
                      variant={hasChangesRobust ? "default" : "secondary"}
                    >
                     {saving ? (
                       <>
                         <LoadingSpinner size={16} className="mr-2" />
                         Saving...
                       </>
                                          ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          {hasChangesRobust ? 'Save Changes' : 'No Changes'}
                        </>
                      )}
                   </Button>
                                      {hasChangesRobust && (
                      <p className="text-xs text-muted-foreground mt-2">
                        You have unsaved changes
                      </p>
                    )}
                   
                                       {/* Debug info */}
                    <div className="mt-4 p-2 bg-muted rounded text-xs">
                      <p><strong>Debug Info:</strong></p>
                      <p>Form Data: "{formData.full_name}" (length: {formData.full_name.length})</p>
                      <p>Profile: "{profile?.full_name || 'null'}" (length: {(profile?.full_name || '').length})</p>
                      <p>Form Data Trimmed: "{formData.full_name.trim()}"</p>
                      <p>Profile Trimmed: "{(profile?.full_name || '').trim()}"</p>
                      <p>Has Changes: {hasChanges ? 'true' : 'false'}</p>
                      <p>Has Changes Alt: {hasChangesAlt ? 'true' : 'false'}</p>
                      <p>Has Changes Robust: {hasChangesRobust ? 'true' : 'false'}</p>
                                             <p>Auth User: {authUser ? 'loaded' : 'null'}</p>
                       <p>Handle: "{profile?.handle || 'null'}"</p>
                       <p>Created At: "{profile?.created_at || 'null'}"</p>
                     {!profile?.handle && (
                       <p className="text-yellow-600 mt-2">
                         <strong>Note:</strong> Handle feature requires database migration. 
                         Run the SQL in handles_migration.sql in your Supabase dashboard.
                       </p>
                     )}
                                                                 <button 
                        onClick={() => {
                          console.log('Test button clicked');
                          setFormData({ full_name: 'Test Change' });
                        }}
                        className="mt-2 px-2 py-1 bg-blue-500 text-white rounded text-xs mr-2"
                      >
                        Test Change
                      </button>
                      <button 
                        onClick={async () => {
                          console.log('Testing database functions...');
                          const supabase = createSupabaseBrowser();
                          
                          // Test basic profile access
                          try {
                            const { data: basicTest, error: basicError } = await supabase
                              .from('profiles')
                              .select('id')
                              .limit(1);
                            console.log('Basic profile test:', { data: basicTest, error: basicError });
                          } catch (e) {
                            console.log('Basic profile test failed:', e);
                          }
                          
                          // Test if handle column exists
                          try {
                            const { data: profileTest, error: profileError } = await supabase
                              .from('profiles')
                              .select('handle')
                              .limit(1);
                            console.log('Handle column test:', { data: profileTest, error: profileError });
                          } catch (e) {
                            console.log('Handle column test failed:', e);
                          }
                          
                          // Test other columns
                          try {
                            const { data: fullTest, error: fullError } = await supabase
                              .from('profiles')
                              .select('id, email, full_name, avatar_url, created_at, updated_at')
                              .limit(1);
                            console.log('Full profile test:', { data: fullTest, error: fullError });
                          } catch (e) {
                            console.log('Full profile test failed:', e);
                          }
                          
                          // Test RPC functions
                          try {
                            const { data: rpcTest, error: rpcError } = await supabase.rpc('is_handle_available', { candidate: 'test' });
                            console.log('RPC function test:', { data: rpcTest, error: rpcError });
                          } catch (e) {
                            console.log('RPC function test failed:', e);
                          }
                        }}
                        className="mt-2 px-2 py-1 bg-green-500 text-white rounded text-xs mr-2"
                      >
                        Test DB Functions
                      </button>
                      <button 
                        onClick={async () => {
                          console.log('Refreshing profile data...');
                          await loadProfile();
                        }}
                        className="mt-2 px-2 py-1 bg-purple-500 text-white rounded text-xs"
                      >
                        Refresh Profile
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
                       {profile?.handle ? `@${profile.handle}` : (authUser?.id || 'Loading...')}
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
