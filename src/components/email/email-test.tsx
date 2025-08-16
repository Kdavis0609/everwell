'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Send, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

// Mock Resend client for testing
class MockResend {
  emails() {
    return {
      send: async (options: any) => {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Simulate success/failure based on email
        if (options.to[0].includes('error')) {
          throw new Error('Mock email sending failed');
        }
        
        return {
          data: { id: 'mock-email-id-' + Date.now() },
          error: null
        };
      }
    };
  }
}

export function EmailTest() {
  const [email, setEmail] = useState('test@example.com');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSendTestEmail = async () => {
    setSending(true);
    setResult(null);

    try {
      // Use mock Resend client
      const mockResend = new MockResend();
      
      const emailContent = generateMockEmailContent();
      
      const response = await mockResend.emails().send({
        from: 'EverWell <noreply@everwell.com>',
        to: [email],
        subject: 'Test Daily Health Reminder',
        html: emailContent.html,
        text: emailContent.text
      });

      setResult({
        success: true,
        message: `Email sent successfully! ID: ${response.data.id}`
      });
      
      toast.success('Test email sent successfully!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setResult({
        success: false,
        message: `Failed to send email: ${errorMessage}`
      });
      
      toast.error('Failed to send test email');
    } finally {
      setSending(false);
    }
  };

  const generateMockEmailContent = () => {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Test Daily Health Reminder</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #2563eb, #10b981); color: white; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px; }
          .section { background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #2563eb; }
          .insight { background: #f0f9ff; padding: 15px; border-radius: 6px; margin-bottom: 15px; border-left: 4px solid #0ea5e9; }
          .action { background: #fef3c7; padding: 12px; border-radius: 6px; margin-bottom: 10px; border-left: 4px solid #f59e0b; }
          .cta { background: #2563eb; color: white; padding: 15px 25px; border-radius: 8px; text-decoration: none; display: inline-block; margin-top: 20px; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Good morning, Test User! 🌅</h1>
          <p>${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        <div class="section">
          <h2>Today's Health Insights</h2>
          <div class="insight">
            <p><strong>Summary:</strong> This is a test email to verify the daily reminder functionality. Your health tracking is going well!</p>
          </div>
          <h3>Today's Focus Areas:</h3>
          <div class="action">
            <strong>1.</strong> Test the email sending functionality
          </div>
          <div class="action">
            <strong>2.</strong> Verify the email template looks good
          </div>
          <div class="action">
            <strong>3.</strong> Check that all features work correctly
          </div>
        </div>

        <div class="section">
          <h2>Weekly Progress</h2>
          <p>Test progress data would appear here in the real email.</p>
        </div>

        <div class="section">
          <h2>Today's Metrics to Track</h2>
          <p>You have <strong>4</strong> metrics enabled:</p>
          <ul>
            <li>Weight</li>
            <li>Steps</li>
            <li>Sleep</li>
            <li>Water</li>
          </ul>
        </div>

        <div style="text-align: center;">
          <a href="#" class="cta">
            Log Today's Metrics →
          </a>
        </div>

        <div class="footer">
          <p><strong>EverWell</strong> - Your personal health companion</p>
          <p>This is a test email. This email contains informational guidance only and is not medical advice.</p>
          <p><a href="#">Manage email preferences</a></p>
        </div>
      </body>
      </html>
    `;

    const text = `
Good morning, Test User!

${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

TODAY'S HEALTH INSIGHTS
This is a test email to verify the daily reminder functionality. Your health tracking is going well!

Today's Focus Areas:
1. Test the email sending functionality
2. Verify the email template looks good
3. Check that all features work correctly

WEEKLY PROGRESS
Test progress data would appear here in the real email.

TODAY'S METRICS TO TRACK
You have 4 metrics enabled:
- Weight
- Steps
- Sleep
- Water

Log your metrics: [Dashboard URL]

---
EverWell - Your personal health companion
This is a test email. This email contains informational guidance only and is not medical advice.
Manage email preferences: [Settings URL]
    `;

    return { html, text };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Mail className="h-5 w-5" />
          <span>Email Test Component</span>
        </CardTitle>
        <CardDescription>
          Test the email sending functionality with a mocked Resend client
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Email Input */}
        <div className="space-y-2">
          <Label htmlFor="test-email">Test Email Address</Label>
          <Input
            id="test-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter email address to test"
          />
          <p className="text-sm text-muted-foreground">
            Use an email containing "error" to test failure scenarios
          </p>
        </div>

        {/* Send Button */}
        <Button
          onClick={handleSendTestEmail}
          disabled={sending}
          className="flex items-center space-x-2"
        >
          <Send className="h-4 w-4" />
          <span>{sending ? 'Sending...' : 'Send Test Email'}</span>
        </Button>

        {/* Result Display */}
        {result && (
          <div className={`p-4 rounded-lg border ${
            result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center space-x-2">
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              <span className={result.success ? 'text-green-800' : 'text-red-800'}>
                {result.message}
              </span>
            </div>
          </div>
        )}

        {/* Test Instructions */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">Test Instructions:</h3>
          <ul className="text-sm space-y-1">
            <li>• Enter any valid email address to test successful sending</li>
            <li>• Include "error" in the email to test failure scenarios</li>
            <li>• The mock client simulates a 1-second delay</li>
            <li>• Check the result display for success/failure feedback</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
