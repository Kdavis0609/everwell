'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase/client';
import { AppShell } from '@/components/app-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmailPreview } from '@/components/email/email-preview';
import { LoadingSpinner } from '@/components/loading-spinner';
import { Settings, Bell, Mail } from 'lucide-react';
import { MetricsService } from '@/lib/services/metrics-service';
import { UserPreferences } from '@/lib/types';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      const supabase = createSupabaseBrowser();
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user) {
        window.location.href = '/login';
        return;
      }

      const uid = userData.user.id;
      setUserId(uid);

      try {
        const userPreferences = await MetricsService.getUserPreferences(supabase);
        setPreferences(userPreferences);
      } catch (error) {
        console.error('Error loading preferences:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleToggleReminders = async (enabled: boolean) => {
    if (!userId) return;

    try {
      const supabase = createSupabaseBrowser();
      await MetricsService.updateUserPreferences(supabase, {
        reminders: {
          ...preferences?.reminders,
          daily_email: enabled
        }
      });

      setPreferences(prev => prev ? {
        ...prev,
        reminders: {
          ...prev.reminders,
          daily_email: enabled
        }
      } : null);
    } catch (error) {
      console.error('Error updating preferences:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center space-x-2">
            <LoadingSpinner size={20} />
            <span className="text-muted-foreground">Loading settings...</span>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center space-x-2">
          <Settings className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>

        {/* Notifications Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bell className="h-5 w-5" />
              <span>Notifications</span>
            </CardTitle>
            <CardDescription>
              Manage your notification preferences and email reminders
            </CardDescription>
          </CardHeader>
          <CardContent>
            {userId && preferences && (
              <EmailPreview
                userId={userId}
                onToggleReminders={handleToggleReminders}
                remindersEnabled={preferences.reminders?.daily_email || false}
              />
            )}
          </CardContent>
        </Card>

        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>
              Your account details and preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Email</label>
              <p className="text-sm text-muted-foreground">
                {preferences?.user_id ? 'User ID: ' + preferences.user_id : 'Loading...'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">Timezone</label>
              <p className="text-sm text-muted-foreground">
                {preferences?.timezone || 'UTC'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Quick Links */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Links</CardTitle>
            <CardDescription>
              Access other settings and features
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <a
                href="/settings/metrics"
                className="flex items-center space-x-3 p-4 rounded-lg border hover:bg-gray-50 transition-colors"
              >
                <Settings className="h-5 w-5 text-blue-600" />
                <div>
                  <div className="font-medium">Metric Settings</div>
                  <div className="text-sm text-muted-foreground">
                    Configure which health metrics to track
                  </div>
                </div>
              </a>
              <a
                href="/dashboard"
                className="flex items-center space-x-3 p-4 rounded-lg border hover:bg-gray-50 transition-colors"
              >
                <Mail className="h-5 w-5 text-green-600" />
                <div>
                  <div className="font-medium">Dashboard</div>
                  <div className="text-sm text-muted-foreground">
                    View your health data and insights
                  </div>
                </div>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
