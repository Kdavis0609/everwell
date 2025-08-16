'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Mail, TestTube, Database, Server } from 'lucide-react';
import { toast } from 'sonner';

interface TestResult {
  ok: boolean;
  message?: string;
  error?: string;
}

export default function EmailDiagnosticsPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [magicCooldown, setMagicCooldown] = useState(0);
  const [resetCooldown, setResetCooldown] = useState(0);
  const [results, setResults] = useState<{
    smtp: TestResult | null;
    magic: TestResult | null;
    reset: TestResult | null;
    config: any | null;
  }>({
    smtp: null,
    magic: null,
    reset: null,
    config: null
  });

  // Cooldown timers
  useEffect(() => {
    if (magicCooldown > 0) {
      const timer = setTimeout(() => setMagicCooldown(magicCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [magicCooldown]);

  useEffect(() => {
    if (resetCooldown > 0) {
      const timer = setTimeout(() => setResetCooldown(resetCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resetCooldown]);

  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-red-600 mb-2">Access Denied</h2>
              <p className="text-muted-foreground">This page is only available in development mode.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const runTest = async (testType: 'smtp' | 'magic' | 'reset' | 'config') => {
    if (!email && testType !== 'config') {
      toast.error('Please enter an email address');
      return;
    }

    // Check cooldowns
    if (testType === 'magic' && magicCooldown > 0) {
      toast.error(`Please wait ${magicCooldown} seconds before trying again`);
      return;
    }
    if (testType === 'reset' && resetCooldown > 0) {
      toast.error(`Please wait ${resetCooldown} seconds before trying again`);
      return;
    }

    setLoading(true);
    setResults(prev => ({ ...prev, [testType]: null }));

    try {
      let response: Response;
      let data: any;

      switch (testType) {
        case 'smtp':
          response = await fetch(`/api/dev/smtp-test?to=${encodeURIComponent(email)}`);
          data = await response.json();
          break;
        case 'magic':
          response = await fetch(`/api/dev/supabase-magic-test?to=${encodeURIComponent(email)}`);
          data = await response.json();
          // Set 60-second cooldown
          setMagicCooldown(60);
          break;
        case 'reset':
          response = await fetch(`/api/dev/supabase-reset-test?to=${encodeURIComponent(email)}`);
          data = await response.json();
          // Set 60-second cooldown
          setResetCooldown(60);
          break;
        case 'config':
          response = await fetch('/api/dev/auth-config');
          data = await response.json();
          break;
      }

      setResults(prev => ({ ...prev, [testType]: data }));
      
      if (data.ok) {
        toast.success(`${testType.toUpperCase()} test passed`);
      } else {
        toast.error(`${testType.toUpperCase()} test failed: ${data.error || data.message}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setResults(prev => ({ 
        ...prev, 
        [testType]: { ok: false, error: errorMessage }
      }));
      toast.error(`${testType.toUpperCase()} test failed: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const getErrorTip = (result: TestResult | null) => {
    if (!result || result.ok) return null;
    
    const status = (result as any).status;
    const body = (result as any).body;
    const errorMessage = result.error?.toLowerCase() || '';
    const bodyError = body?.error?.toLowerCase() || '';
    const bodyErrorDesc = body?.error_description?.toLowerCase() || '';
    
    // Rate limit (429)
    if (status === 429) {
      return {
        title: 'Supabase Email Rate Limit Hit',
        tip: 'Lower "Minimum interval between emails" in Supabase → Auth → Emails to 10–30s while testing or wait a minute.',
        action: 'Supabase → Authentication → Emails → Minimum interval between emails'
      };
    }
    
    // SMTP authentication errors
    if (bodyError.includes('auth failed') || bodyErrorDesc.includes('auth failed') || 
        bodyError.includes('unauthenticated sender') || bodyErrorDesc.includes('unauthenticated sender')) {
      return {
        title: 'SMTP Authentication Failed',
        tip: 'Verify sender in SendGrid; in Supabase → Emails, Username must be "apikey" and Password must be the SG.* secret.',
        action: 'Supabase → Authentication → Emails → SMTP Settings'
      };
    }
    
    // Server error (500)
    if (status === 500) {
      return {
        title: 'Server Error',
        tip: 'Open Supabase → Logs (service: auth, level: error) to see the exact SMTP error.',
        action: 'Supabase → Logs → Filter: service=auth, level=error'
      };
    }
    
    // Legacy error code handling for SMTP test
    const errorCode = (result as any).details?.code;
    if (errorCode === '535' || errorMessage.includes('535')) {
      return {
        title: 'Authentication Failed',
        tip: 'Check SendGrid API key and ensure username is "apikey"',
        action: 'Verify SENDGRID_API_KEY in .env.local'
      };
    }
    
    if (errorCode === '550' || errorMessage.includes('550')) {
      return {
        title: 'Unauthenticated Sender',
        tip: 'Sender email not verified in SendGrid',
        action: 'Verify sender in SendGrid → Sender Authentication'
      };
    }
    
    if (errorCode === '429' || errorMessage.includes('429') || errorMessage.includes('rate limit')) {
      return {
        title: 'Rate Limit Exceeded',
        tip: 'Too many email requests',
        action: 'Wait 30+ seconds between tests'
      };
    }
    
    if (errorMessage.includes('redirect') || errorMessage.includes('invalid redirect')) {
      return {
        title: 'Invalid Redirect URL',
        tip: 'Redirect URLs not configured in Supabase',
        action: 'Add redirect URLs to Supabase → Authentication → URL Configuration'
      };
    }
    
    if (errorMessage.includes('user not found')) {
      return {
        title: 'User Not Found',
        tip: 'Email address not registered',
        action: 'Register the email address first'
      };
    }
    
    return null;
  };

  const ResultDisplay = ({ result, title }: { result: TestResult | null; title: string }) => {
    const errorTip = getErrorTip(result);
    
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{title}</span>
          {result && (
            <Badge variant={result.ok ? 'default' : 'destructive'}>
              {result.ok ? 'PASS' : 'FAIL'}
            </Badge>
          )}
        </div>
        
        {result && (
          <div className="space-y-2">
            <div className="text-xs bg-muted p-2 rounded">
              <pre className="whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
            </div>
            
            {errorTip && (
              <div className="text-xs bg-amber-50 border border-amber-200 p-3 rounded">
                <div className="font-medium text-amber-800 mb-1">{errorTip.title}</div>
                <div className="text-amber-700 mb-1">{errorTip.tip}</div>
                <div className="text-amber-600 font-mono">{errorTip.action}</div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Email Diagnostics</h1>
          <p className="text-muted-foreground">Development tools for testing email functionality</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TestTube className="w-5 h-5" />
              <span>Test Configuration</span>
            </CardTitle>
            <CardDescription>
              Check your current auth configuration and test email functionality
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Test Email Address</Label>
              <div className="flex space-x-2">
                <Input
                  id="email"
                  type="email"
                  placeholder="test@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={() => runTest('config')}
                  disabled={loading}
                  variant="outline"
                >
                  <Server className="w-4 h-4 mr-2" />
                  Check Config
                </Button>
              </div>
            </div>

            {results.config && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Auth Configuration</span>
                  <Badge variant="default">LOADED</Badge>
                </div>
                <div className="text-xs bg-muted p-2 rounded">
                  <pre className="whitespace-pre-wrap">{JSON.stringify(results.config, null, 2)}</pre>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Mail className="w-5 h-5" />
                <span>SMTP Test</span>
              </CardTitle>
              <CardDescription>
                Test direct SendGrid SMTP connection
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={() => runTest('smtp')}
                disabled={loading || !email}
                className="w-full"
              >
                <Mail className="w-4 h-4 mr-2" />
                Test SMTP
              </Button>
              <ResultDisplay result={results.smtp} title="SMTP Result" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="w-5 h-5" />
                <span>Magic Link</span>
              </CardTitle>
              <CardDescription>
                Test Supabase magic link email
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                             <Button
                 onClick={() => runTest('magic')}
                 disabled={loading || !email || magicCooldown > 0}
                 className="w-full"
               >
                 <Database className="w-4 h-4 mr-2" />
                 {magicCooldown > 0 ? `Wait ${magicCooldown}s` : 'Test Magic Link'}
               </Button>
              <ResultDisplay result={results.magic} title="Magic Link Result" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="w-5 h-5" />
                <span>Password Reset</span>
              </CardTitle>
              <CardDescription>
                Test Supabase password reset email
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                             <Button
                 onClick={() => runTest('reset')}
                 disabled={loading || !email || resetCooldown > 0}
                 className="w-full"
               >
                 <Database className="w-4 h-4 mr-2" />
                 {resetCooldown > 0 ? `Wait ${resetCooldown}s` : 'Test Reset'}
               </Button>
              <ResultDisplay result={results.reset} title="Reset Result" />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Troubleshooting Tips</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="space-y-2">
              <p className="font-medium">Common Error Codes:</p>
              <ul className="space-y-1 ml-4">
                <li><strong>535:</strong> Authentication failed - check SendGrid API key</li>
                <li><strong>550:</strong> Unauthenticated sender - verify sender in SendGrid</li>
                <li><strong>429:</strong> Rate limit exceeded - wait 30+ seconds</li>
                <li><strong>Redirect errors:</strong> Add URLs to Supabase → Authentication → URL Configuration</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <p className="font-medium">Environment Variables:</p>
              <ul className="space-y-1 ml-4">
                <li><code>SENDGRID_API_KEY</code> - Your SendGrid API key (starts with "SG.")</li>
                <li><code>SMTP_FROM</code> - Verified sender email (optional, uses default)</li>
                <li><code>NEXT_PUBLIC_SITE_URL</code> - Your site URL for redirects</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <p className="font-medium">Supabase SMTP Settings:</p>
              <ul className="space-y-1 ml-4">
                <li><strong>Host:</strong> smtp.sendgrid.net</li>
                <li><strong>Port:</strong> 587 (or 465 if blocked)</li>
                <li><strong>Username:</strong> apikey</li>
                <li><strong>Password:</strong> Your SendGrid API key</li>
              </ul>
            </div>
            
            <p><strong>Check Spam:</strong> Test emails may go to spam folder</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
