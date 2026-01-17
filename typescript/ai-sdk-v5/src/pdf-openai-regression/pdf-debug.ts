/**
 * Debug script: Inspect the actual payload being sent to OpenRouter
 *
 * This helps diagnose why OpenAI PDF support fails via AI SDK.
 */

import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText } from 'ai';
import { readPdfAsDataUrl, readExpectedCode } from '@openrouter-examples/shared/fixtures';

async function main() {
  console.log('=== PDF Debug: Inspecting AI SDK Payload ===\n');

  const pdfDataUrl = await readPdfAsDataUrl('small');
  const expectedCode = await readExpectedCode('small');
  console.log(`PDF data URL length: ${pdfDataUrl.length}`);
  console.log(`Expected code: ${expectedCode}\n`);

  // Create provider with debug middleware
  const openrouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
    // Enable request logging via custom fetch
    fetch: async (url, init) => {
      console.log('=== REQUEST ===');
      console.log('URL:', url);
      
      if (init?.body) {
        try {
          const body = JSON.parse(init.body as string);
          console.log('Model:', body.model);
          console.log('Messages:', JSON.stringify(body.messages, (key, value) => {
            // Truncate base64 data for readability
            if (typeof value === 'string' && value.length > 100) {
              return value.slice(0, 100) + `... [${value.length} chars total]`;
            }
            return value;
          }, 2));
        } catch {
          console.log('Body (raw):', String(init.body).slice(0, 500));
        }
      }
      console.log('=== END REQUEST ===\n');
      
      const response = await fetch(url, init);
      
      // Clone response to read body without consuming it
      const clone = response.clone();
      const text = await clone.text();
      
      console.log('=== RESPONSE ===');
      console.log('Status:', response.status);
      console.log('Body (truncated):', text.slice(0, 500));
      console.log('=== END RESPONSE ===\n');
      
      // Return a new response with the same body
      return new Response(text, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    },
  });

  try {
    console.log('Testing OpenAI model...\n');
    const result = await generateText({
      model: openrouter('openai/gpt-4o-mini'),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'What is the verification code in this PDF? Reply with just the code.',
            },
            {
              type: 'file',
              data: pdfDataUrl,
              mediaType: 'application/pdf',
            },
          ],
        },
      ],
    });

    console.log('\n=== RESULT ===');
    console.log('Response text:', result.text);
    
  } catch (err) {
    console.error('Error:', err instanceof Error ? err.message : String(err));
  }
}

main().catch(console.error);
