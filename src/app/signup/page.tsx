'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowser } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Heart, Mail, Lock, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { useAuthGuard } from '@/lib/hooks/use-auth-guard';
import { LoadingSpinner } from '@/components/loading-spinner';

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

const passwordRequirements: PasswordRequirement[] = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'At least one uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'At least one lowercase letter', test: (p) => /[a-z]/.test(p) },
  { label: 'At least one number', test: (p) => /\d/.test(p) },
  { label: 'At least one special character', test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
];

export default function SignupPage() {
  const router = useRouter();
  const { loading: authGuardLoading } = useAuthGuard();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });

  // Show loading while checking auth
  if (authGuardLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50 p-4">
        <div className="flex items-center space-x-2">
          <LoadingSpinner size={20} />
          <span className="text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validatePassword = (password: string) => {
    return passwordRequirements.every(req => req.test(password));
  };

  const getPasswordStrength = (password: string) => {
    const passedRequirements = passwordRequirements.filter(req => req.test(password)).length;
    const totalRequirements = passwordRequirements.length;
    return (passedRequirements / totalRequirements) * 100;
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password || !formData.confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (!validatePassword(formData.password)) {
      toast.error('Password does not meet requirements');
      return;
    }

    setLoading(true);

    try {
      const supabase = createSupabaseBrowser();
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/auth/callback`
        }
      });

      if (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Sign up error:', error);
        }
        toast.error(error.message);
        return;
      }

      if (data.user) {
        // Check if email confirmation is required
        if (data.user.email_confirmed_at) {
          // Email confirmation is OFF, redirect to dashboard
          toast.success('Account created successfully!');
          router.push('/dashboard');
        } else {
          // Email confirmation is ON, show check email screen
          router.push('/signup/check-email');
        }
      }
    } catch (error) {
      console.error('Sign up error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = getPasswordStrength(formData.password);
  const isPasswordValid = validatePassword(formData.password);
  const doPasswordsMatch = formData.password === formData.confirmPassword;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary rounded-full flex items-center justify-center mb-4">
            <Heart className="w-6 h-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Create Account</CardTitle>
          <CardDescription>Join EverWell to start tracking your health metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp} className="space-y-4">
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
                  placeholder="Create a password"
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

              {/* Password strength indicator */}
              {formData.password && (
                <div className="space-y-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        passwordStrength < 40 ? 'bg-red-500' :
                        passwordStrength < 70 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${passwordStrength}%` }}
                    />
                  </div>
                  
                  {/* Password requirements */}
                  <div className="space-y-1">
                    {passwordRequirements.map((req, index) => (
                      <div key={index} className="flex items-center space-x-2 text-xs">
                        {req.test(formData.password) ? (
                          <CheckCircle className="h-3 w-3 text-green-500" />
                        ) : (
                          <XCircle className="h-3 w-3 text-red-500" />
                        )}
                        <span className={req.test(formData.password) ? 'text-green-600' : 'text-red-600'}>
                          {req.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  className="pl-10 pr-10"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              
              {/* Password match indicator */}
              {formData.confirmPassword && (
                <div className="flex items-center space-x-2 text-xs">
                  {doPasswordsMatch ? (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  ) : (
                    <XCircle className="h-3 w-3 text-red-500" />
                  )}
                  <span className={doPasswordsMatch ? 'text-green-600' : 'text-red-600'}>
                    {doPasswordsMatch ? 'Passwords match' : 'Passwords do not match'}
                  </span>
                </div>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading || !isPasswordValid || !doPasswordsMatch}
            >
              {loading ? 'Creating account...' : 'Create account'}
            </Button>

            <div className="text-center">
              <div className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link href="/login" className="text-primary hover:underline">
                  Sign in
                </Link>
              </div>
            </div>
          </form>

          <p className="text-xs text-muted-foreground mt-4 text-center">
            By creating an account, you agree to our Terms of Service and Privacy Policy
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
