import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Database, ExternalLink } from 'lucide-react';

export function MigrationRequired() {
  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Database className="w-8 h-8 text-amber-600" />
          </div>
          <CardTitle className="text-xl">Database Migration Required</CardTitle>
          <CardDescription>
            The configurable metrics system needs to be set up in your database.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-800">
                <p className="font-medium">Setup Required</p>
                <p>You need to run the database migration to enable configurable health metrics.</p>
              </div>
            </div>
          </div>
          
          <div className="space-y-2 text-sm">
            <p className="font-medium">To fix this:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Open your Supabase project dashboard</li>
              <li>Go to SQL Editor</li>
              <li>Copy the migration from <code className="bg-muted px-1 rounded">supabase/migrations/20250101_metrics_customization.sql</code></li>
              <li>Paste and run the migration</li>
              <li>Refresh this page</li>
            </ol>
          </div>

          <div className="flex space-x-2">
            <Button variant="outline" className="flex-1" onClick={() => window.location.reload()}>
              Refresh Page
            </Button>
            <Button asChild className="flex-1">
              <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                Supabase Dashboard
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
