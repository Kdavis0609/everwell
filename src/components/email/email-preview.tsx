'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Mail, Eye, Send } from 'lucide-react';
import { toast } from 'sonner';

interface EmailPreviewProps {
  userId: string;
  onToggleReminders: (enabled: boolean) => Promise<void>;
  remindersEnabled: boolean;
}

// Mock data for preview
const mockData = {
  profile: {
    full_name: 'John Doe',
    email: 'john@example.com'
  },
  insights: {
    summary: 'Great progress this week! Your weight is trending down and you\'re consistently hitting your step goals. Focus on maintaining this momentum.',
    actions: [
      'Aim for 8 hours of sleep tonight to support your recovery',
      'Try adding 10 minutes of stretching to your morning routine',
      'Stay hydrated by drinking water with each meal'
    ]
  },
  weeklyProgress: [
    {
      metric_name: 'weight_lbs',
      current_avg: 175.2,
      target_value: 170,
      progress_percent: 85
    },
    {
      metric_name: 'steps',
      current_avg: 8500,
      target_value: 10000,
      progress_percent: 85
    },
    {
      metric_name: 'sleep_hours',
      current_avg: 7.2,
      target_value: 8,
      progress_percent: 90
    }
  ],
  enabledMetrics: [
    { name: 'Weight', unit: 'lbs' },
    { name: 'Steps', unit: 'steps' },
    { name: 'Sleep', unit: 'hours' },
    { name: 'Water', unit: 'oz' }
  ]
};

export function EmailPreview({ userId, onToggleReminders, remindersEnabled }: EmailPreviewProps) {
  const [sending, setSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const handleSendTestEmail = async () => {
    setSending(true);
    try {
      const response = await fetch('/api/email/daily', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        throw new Error('Failed to send test email');
      }

      toast.success('Test email sent successfully!');
    } catch (error) {
      console.error('Error sending test email:', error);
      toast.error('Failed to send test email');
    } finally {
      setSending(false);
    }
  };

  const handleToggleReminders = async (enabled: boolean) => {
    try {
      await onToggleReminders(enabled);
      toast.success(`Daily reminders ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error toggling reminders:', error);
      toast.error('Failed to update reminder settings');
    }
  };

  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Mail className="h-5 w-5" />
          <span>Daily Email Reminders</span>
        </CardTitle>
        <CardDescription>
          Receive personalized daily emails with your health insights and goals
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Toggle Switch */}
        <div className="flex items-center space-x-2">
          <Switch
            id="daily-reminders"
            checked={remindersEnabled}
            onCheckedChange={handleToggleReminders}
          />
          <Label htmlFor="daily-reminders">
            Send daily reminder emails at 8:00 AM
          </Label>
        </div>

        {/* Preview and Test Buttons */}
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center space-x-2"
          >
            <Eye className="h-4 w-4" />
            <span>{showPreview ? 'Hide' : 'Show'} Preview</span>
          </Button>
          <Button
            onClick={handleSendTestEmail}
            disabled={sending || !remindersEnabled}
            className="flex items-center space-x-2"
          >
            <Send className="h-4 w-4" />
            <span>{sending ? 'Sending...' : 'Send Test Email'}</span>
          </Button>
        </div>

        {/* Email Preview */}
        {showPreview && (
          <div className="border rounded-lg p-4 bg-gray-50 max-h-96 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-sm p-6 max-w-2xl mx-auto">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-green-500 text-white p-6 rounded-lg text-center mb-6">
                <h1 className="text-2xl font-bold">Good morning, {mockData.profile.full_name}! 🌅</h1>
                <p className="text-blue-100">{today}</p>
              </div>

              {/* Insights Section */}
              <div className="bg-blue-50 p-4 rounded-lg mb-4 border-l-4 border-blue-500">
                <h2 className="text-lg font-semibold mb-3">Today's Health Insights</h2>
                <div className="bg-blue-100 p-3 rounded mb-3">
                  <p><strong>Summary:</strong> {mockData.insights.summary}</p>
                </div>
                <h3 className="font-semibold mb-2">Today's Focus Areas:</h3>
                {mockData.insights.actions.map((action, index) => (
                  <div key={index} className="bg-yellow-100 p-3 rounded mb-2 border-l-4 border-yellow-500">
                    <strong>{index + 1}.</strong> {action}
                  </div>
                ))}
              </div>

              {/* Weekly Progress */}
              <div className="bg-blue-50 p-4 rounded-lg mb-4 border-l-4 border-blue-500">
                <h2 className="text-lg font-semibold mb-3">Weekly Progress</h2>
                {mockData.weeklyProgress.map((progress, index) => (
                  <div key={index} className="mb-3">
                    <div className="font-semibold mb-1">
                      {progress.metric_name.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">
                        {progress.current_avg?.toFixed(1)} / {progress.target_value}
                      </span>
                      <div className="flex-1 bg-gray-200 h-2 rounded">
                        <div 
                          className="bg-green-500 h-2 rounded" 
                          style={{ width: `${Math.min(100, progress.progress_percent || 0)}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600">
                        {progress.progress_percent?.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Metrics to Track */}
              <div className="bg-blue-50 p-4 rounded-lg mb-4 border-l-4 border-blue-500">
                <h2 className="text-lg font-semibold mb-3">Today's Metrics to Track</h2>
                <p>You have <strong>{mockData.enabledMetrics.length}</strong> metrics enabled:</p>
                <ul className="list-disc list-inside mt-2">
                  {mockData.enabledMetrics.map((metric, index) => (
                    <li key={index}>{metric.name}</li>
                  ))}
                </ul>
              </div>

              {/* CTA Button */}
              <div className="text-center">
                <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold">
                  Log Today's Metrics →
                </button>
              </div>

              {/* Footer */}
              <div className="text-center mt-6 pt-4 border-t text-gray-600 text-sm">
                <p><strong>EverWell</strong> - Your personal health companion</p>
                <p>This email contains informational guidance only and is not medical advice.</p>
                <p className="mt-2">
                  <a href="#" className="text-blue-600 underline">Manage email preferences</a>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Information */}
        <div className="text-sm text-gray-600 space-y-2">
          <p>• Emails are sent daily at 8:00 AM in your local timezone</p>
          <p>• Includes your daily AI insights, weekly progress, and goals</p>
          <p>• You can unsubscribe or change preferences at any time</p>
        </div>
      </CardContent>
    </Card>
  );
}
