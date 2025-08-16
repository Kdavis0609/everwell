'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export function useAuthGuard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
          console.error('Auth check error:', error);
          setLoading(false);
          return;
        }

        if (user) {
          // User is logged in, redirect to dashboard
          router.push('/dashboard');
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Auth guard error:', error);
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  return { loading };
}
