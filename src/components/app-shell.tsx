import { ReactNode } from 'react';
import { TopNav } from './top-nav';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="container mx-auto px-4 md:px-6 py-6 max-w-7xl">
        {children}
      </main>
    </div>
  );
}
