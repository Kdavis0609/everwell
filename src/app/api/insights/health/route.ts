import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const notes: string[] = [];
  
  try {
    // Check environment variables
    const openaiKeyPresent = !!process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
    const baseUrl = process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1';
    
    notes.push(`Environment check: key=${openaiKeyPresent ? 'present' : 'missing'}, model=${model}, baseUrl=${baseUrl}`);

    let providerPing = {
      attempted: false,
      status: null as number | null,
      latencyMs: null as number | null,
      parsedJson: null as boolean | null,
      error: undefined as string | undefined
    };

    // Only attempt provider ping if API key is present
    if (openaiKeyPresent) {
      providerPing.attempted = true;
      
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: model,
            messages: [
              {
                role: 'system',
                content: 'You are a test assistant. Return exactly {"ok":true} and nothing else. No explanation, no markdown, just the JSON.'
              },
              {
                role: 'user',
                content: 'Return exactly {"ok":true}'
              }
            ],
            temperature: 0,
            max_tokens: 10
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        
        const latencyMs = Date.now() - startTime;
        providerPing.status = response.status;
        providerPing.latencyMs = latencyMs;

        if (!response.ok) {
          providerPing.error = `HTTP ${response.status}: ${response.statusText}`;
          notes.push(`Provider ping failed: ${providerPing.error}`);
        } else {
          const result = await response.json();
          const content = result.choices?.[0]?.message?.content;
          
          if (!content) {
            providerPing.error = 'No content in response';
            notes.push('Provider ping failed: No content in response');
          } else {
            try {
              const parsed = JSON.parse(content.trim());
              providerPing.parsedJson = parsed.ok === true;
              
              if (providerPing.parsedJson) {
                notes.push(`Provider ping successful: ${latencyMs}ms, parsed JSON correctly`);
              } else {
                providerPing.error = 'Response did not contain {"ok":true}';
                notes.push(`Provider ping failed: Response was not {"ok":true}`);
              }
            } catch (parseError) {
              providerPing.error = 'Failed to parse JSON response';
              notes.push(`Provider ping failed: JSON parse error - ${parseError}`);
            }
          }
        }
      } catch (error) {
        const latencyMs = Date.now() - startTime;
        providerPing.latencyMs = latencyMs;
        
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            providerPing.error = 'Request timeout (10s)';
            notes.push('Provider ping failed: 10 second timeout');
          } else {
            providerPing.error = error.message;
            notes.push(`Provider ping failed: ${error.message}`);
          }
        } else {
          providerPing.error = 'Unknown error';
          notes.push('Provider ping failed: Unknown error');
        }
      }
    } else {
      notes.push('Skipping provider ping: No OpenAI API key present');
    }

    return NextResponse.json({
      ok: true,
      env: {
        openaiKeyPresent,
        model,
        baseUrl
      },
      providerPing,
      notes
    });

  } catch (error) {
    const latencyMs = Date.now() - startTime;
    notes.push(`Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    return NextResponse.json({
      ok: false,
      env: {
        openaiKeyPresent: !!process.env.OPENAI_API_KEY,
        model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
        baseUrl: process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1'
      },
      providerPing: {
        attempted: false,
        status: null,
        latencyMs,
        parsedJson: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      notes
    }, { status: 500 });
  }
}
