import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.OPENAI_API_KEY;
  
  return NextResponse.json({
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    apiKeyInfo: {
      present: !!apiKey,
      length: apiKey?.length || 0,
      prefix: apiKey ? apiKey.substring(0, 20) + '...' : 'N/A',
      suffix: apiKey ? '...' + apiKey.substring(apiKey.length - 10) : 'N/A',
      // Show first and last few characters for comparison
      firstChars: apiKey ? apiKey.substring(0, 10) : 'N/A',
      lastChars: apiKey ? apiKey.substring(apiKey.length - 10) : 'N/A',
    },
    allEnvVars: {
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
      // Don't expose full API keys, just presence
      OPENAI_API_KEY_PRESENT: !!process.env.OPENAI_API_KEY,
      SENDGRID_API_KEY_PRESENT: !!process.env.SENDGRID_API_KEY,
      SMTP_FROM: process.env.SMTP_FROM,
    }
  });
}
