import { NextResponse } from 'next/server';

export async function GET() {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }
  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
    
    const config = {
      siteUrl,
      magicRedirect: `${siteUrl}/auth/callback`,
      resetRedirect: `${siteUrl}/auth/callback?type=recovery`,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Configured' : 'Missing',
      supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Configured' : 'Missing',
      sendgridApiKey: process.env.SENDGRID_API_KEY ? 'Configured' : 'Missing',
      smtpFrom: process.env.SMTP_FROM || 'Not configured (using default)',
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json({
      ok: true,
      config
    });

  } catch (error) {
    console.error('Auth config error:', error);
    
    return NextResponse.json(
      { ok: false, error: 'Failed to load configuration' },
      { status: 500 }
    );
  }
}
