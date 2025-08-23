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
  const [formData, setFormData] = useState({
    full_name: '',
    email: ''
  });

  // Check if there are unsaved changes
  const hasChanges = profile && (
    formData.full_name !== (profile.full_name || '') || 
    formData.email !== (profile.email || '')
  );

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const supabase = createSupabaseBrowser();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        toast.error('Please log in to view your profile');
        return;
      }

      // Get profile from profiles table
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url, created_at, updated_at')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        toast.error('Failed to load profile');
        return;
      }

      const profile: Profile = {
        user_id: profileData.id,
        email: user.email || profileData.email, // Use auth email first, fallback to profile email
        full_name: profileData.full_name,
        avatar_url: profileData.avatar_url,
        created_at: profileData.created_at,
        updated_at: profileData.updated_at
      };

      setProfile(profile);
      setFormData({
        full_name: profile.full_name || '',
        email: profile.email || ''
      });

    } catch (error) {
      console.error('Profile load error:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;

    // Check if there are any changes to save
    if (formData.full_name === (profile.full_name || '') && 
        formData.email === (profile.email || '')) {
      toast.info('No changes to save');
      return;
    }

    setSaving(true);

    try {
      const supabase = createSupabaseBrowser();
      
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name || null,
          email: formData.email || null
        })
        .eq('id', profile.user_id);

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
                    onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email address"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    This email will be used for account notifications and password recovery
                  </p>
                </div>

                <div className="pt-4">
                  <Button 
                    onClick={handleSave} 
                    disabled={saving || !hasChanges}
                    className="w-full sm:w-auto"
                    variant={hasChanges ? "default" : "secondary"}
                  >
                    {saving ? (
                      <>
                        <LoadingSpinner size={16} className="mr-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        {hasChanges ? 'Save Changes' : 'No Changes'}
                      </>
                    )}
                  </Button>
                  {hasChanges && (
                    <p className="text-xs text-muted-foreground mt-2">
                      You have unsaved changes
                    </p>
                  )}
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
                      {profile?.user_id}
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
