'use client';

import { EmailTest } from '@/components/email/email-test';
import { AppShell } from '@/components/app-shell';

export default function TestEmailPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Email Testing</h1>
          <p className="text-muted-foreground">
            Test the email sending functionality with mocked components
          </p>
        </div>
        <EmailTest />
      </div>
    </AppShell>
  );
}
