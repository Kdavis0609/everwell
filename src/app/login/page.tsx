// src/app/login/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createSupabaseBrowser } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { Heart, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { LoadingSpinner } from '@/components/loading-spinner';
import { parseRedirectTo } from '@/lib/utils/redirect';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('magic-link');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });

  // Create Supabase client
  const supabase = createSupabaseBrowser();

  // Handle auth state changes for redirects
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        const redirectTo = searchParams.get('redirectTo');
        const safeRedirectTo = parseRedirectTo(redirectTo);
        router.push(safeRedirectTo);
      }
    });

    return () => subscription.unsubscribe();
  }, [router, searchParams, supabase.auth]);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleEmailPasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
      });

      if (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Sign in error:', error);
        }
        toast.error(error.message);
        return;
      }

      if (data.user) {
        // Handle "Remember me" functionality
        if (!formData.rememberMe) {
          // Set session to not persist
          await supabase.auth.setSession({
            access_token: data.session?.access_token || '',
            refresh_token: data.session?.refresh_token || ''
          });
        }

        toast.success('Signed in successfully!');
        
        // Redirect will be handled by onAuthStateChange
        const redirectTo = searchParams.get('redirectTo');
        const safeRedirectTo = parseRedirectTo(redirectTo);
        router.push(safeRedirectTo);
      }
    } catch (error) {
      console.error('Sign in error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!formData.email) {
      toast.error('Please enter your email address first');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/auth/callback?type=recovery`
      });

      if (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Password reset error:', error);
        }
        toast.error(error.message);
        return;
      }

      toast.success('Password reset email sent! Check your inbox.');
    } catch (error) {
      console.error('Password reset error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary rounded-full flex items-center justify-center mb-4">
            <Heart className="w-6 h-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Welcome to EverWell</CardTitle>
          <CardDescription>Sign in to track your health metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="magic-link">Magic Link</TabsTrigger>
              <TabsTrigger value="email-password">Email & Password</TabsTrigger>
            </TabsList>

            <TabsContent value="magic-link" className="space-y-4">
              <Auth
                supabaseClient={supabase}
                view="magic_link"
                redirectTo={`${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/auth/callback`}
                appearance={{
                  theme: ThemeSupa,
                  variables: {
                    default: {
                      colors: {
                        brand: '#2563EB',
                        brandAccent: '#1D4ED8',
                        inputText: '#1F2937',
                        inputBackground: '#FFFFFF',
                        inputBorder: '#E5E7EB',
                      },
                    },
                  },
                }}
                providers={[]}
              />
            </TabsContent>

            <TabsContent value="email-password" className="space-y-4">
              <form onSubmit={handleEmailPasswordSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      className="pl-10 pr-10"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember-me"
                    checked={formData.rememberMe}
                    onCheckedChange={(checked) => handleInputChange('rememberMe', checked as boolean)}
                  />
                  <Label htmlFor="remember-me" className="text-sm">
                    Remember me
                  </Label>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign in'}
                </Button>

                <div className="text-center space-y-2">
                  <Button
                    type="button"
                    variant="link"
                    className="text-sm"
                    onClick={handleForgotPassword}
                    disabled={loading || !formData.email}
                  >
                    Forgot password?
                  </Button>
                  <div className="text-sm text-muted-foreground">
                    Don't have an account?{' '}
                    <Link href="/signup" className="text-primary hover:underline">
                      Create account
                    </Link>
                  </div>
                </div>
              </form>
            </TabsContent>
          </Tabs>

          <p className="text-xs text-muted-foreground mt-4 text-center">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
