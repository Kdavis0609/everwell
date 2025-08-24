import { NextRequest, NextResponse } from 'next/server';
import { getBaseUrl } from '@/lib/utils/url';

export async function GET(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const to = searchParams.get('to');

    if (!to) {
      return NextResponse.json(
        { ok: false, error: 'Missing "to" parameter' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return NextResponse.json(
        { ok: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Check for required environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const siteUrl = getBaseUrl();

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { ok: false, error: 'Supabase URL or anon key not configured' },
        { status: 500 }
      );
    }

    // Call Supabase REST endpoint directly
    const response = await fetch(`${supabaseUrl}/auth/v1/recover`, {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: to,
        redirect_to: `${siteUrl}/auth/callback?type=recovery`
      })
    });

    const body = await response.json();
    const ok = response.status < 300;

    return NextResponse.json({
      ok,
      status: response.status,
      body
    });

  } catch (error) {
    console.error('Supabase password reset test error:', error);
    
    return NextResponse.json(
      { 
        ok: false, 
        status: 500,
        body: { error: 'Unexpected error occurred' }
      },
      { status: 500 }
    );
  }
}
