'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { createSupabaseBrowser } from '@/lib/supabase/client';
import { Settings, LogOut, User, Brain, FileText, Heart, Target, Zap } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ThemeToggle } from '@/components/theme-toggle';
import Link from 'next/link';
import { toast } from 'sonner';

export function TopNav() {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createSupabaseBrowser();
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <nav className="border-b bg-card">
      <div className="container mx-auto px-4 md:px-6 py-4 max-w-7xl">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Heart className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold text-foreground">EverWell</span>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-4">
            <Button variant="ghost" asChild>
              <Link href="/dashboard">
                Dashboard
              </Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/insights" className="flex items-center space-x-2">
                <Brain className="w-4 h-4" />
                <span>Insights</span>
              </Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/tools/import-export" className="flex items-center space-x-2">
                <FileText className="w-4 h-4" />
                <span>Import/Export</span>
              </Link>
            </Button>
          </div>

          {/* Right side - Theme Toggle and User Menu */}
          <div className="flex items-center space-x-2">
            <ThemeToggle />
            
            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src="/api/avatar" alt="User avatar" />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      <User className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings/metrics" className="flex items-center">
                    <Target className="mr-2 h-4 w-4" />
                    <span>Metrics</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings/integrations" className="flex items-center">
                    <Zap className="mr-2 h-4 w-4" />
                    <span>Integrations</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/insights" className="flex items-center">
                    <Brain className="mr-2 h-4 w-4" />
                    <span>Insights</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/tools/import-export" className="flex items-center">
                    <FileText className="mr-2 h-4 w-4" />
                    <span>Import/Export</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  );
}
