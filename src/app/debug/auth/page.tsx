'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function AuthDebugPage() {
  const [authStatus, setAuthStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createSupabaseBrowser();
        
        // Check session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        // Check user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        // Test API call
        let apiTest = null;
        try {
          const response = await fetch('/api/insights', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
          });
          apiTest = {
            status: response.status,
            ok: response.ok,
            statusText: response.statusText
          };
        } catch (apiError) {
          apiTest = { error: apiError };
        }

        setAuthStatus({
          session: session ? { user: session.user.id, expires: session.expires_at } : null,
          sessionError,
          user: user ? { id: user.id, email: user.email } : null,
          userError,
          apiTest,
          cookies: document.cookie ? 'Present' : 'None'
        });
      } catch (error) {
        setAuthStatus({ error: error });
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const testAuth = async () => {
    const supabase = createSupabaseBrowser();
    const { data, error } = await supabase.auth.getSession();
    console.log('Auth test:', { data, error });
    alert(`Session: ${data.session ? 'Present' : 'None'}, Error: ${error ? error.message : 'None'}`);
  };

  if (loading) {
    return <div className="p-6">Loading auth debug info...</div>;
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Authentication Debug</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Session Status</CardTitle>
          <CardDescription>Current authentication state</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(authStatus, null, 2)}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test Actions</CardTitle>
          <CardDescription>Test authentication functionality</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={testAuth}>Test Session</Button>
        </CardContent>
      </Card>
    </div>
  );
}
