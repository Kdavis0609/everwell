import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    return NextResponse.json({ 
      error: 'No API key found',
      env: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    });
  }

  // Test the API key directly
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Say "Hello World" only' }],
        max_tokens: 10
      })
    });

    const data = await response.json();
    
    return NextResponse.json({
      status: response.status,
      apiKeyPresent: !!apiKey,
      apiKeyPrefix: apiKey.substring(0, 10) + '...',
      apiKeyLength: apiKey.length,
      response: data,
      env: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      apiKeyPresent: !!apiKey,
      apiKeyPrefix: apiKey.substring(0, 10) + '...',
      apiKeyLength: apiKey.length,
      env: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    });
  }
}
