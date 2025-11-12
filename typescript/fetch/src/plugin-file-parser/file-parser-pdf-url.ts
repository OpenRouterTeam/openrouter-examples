/**
 * Example: OpenRouter FileParserPlugin - PDF URL
 *
 * This example demonstrates sending PDFs via publicly accessible URLs.
 * This is more efficient than base64 encoding as you don't need to download
 * and encode the file.
 *
 * Key Points:
 * - Send PDFs directly via URL without downloading
 * - Works with all PDF processing engines
 * - Reduces payload size compared to base64
 * - Ideal for publicly accessible documents
 *
 * To run: bun run typescript/fetch/src/plugin-file-parser/file-parser-pdf-url.ts
 */

import type { ChatCompletionResponse } from '@openrouter-examples/shared/types';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * Example using the Bitcoin whitepaper (publicly accessible PDF)
 */
async function examplePDFFromURL() {
  console.log('╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║        OpenRouter FileParserPlugin - PDF URL Example                      ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝');
  console.log();
  console.log('Sending PDF via public URL (Bitcoin whitepaper)');
  console.log('URL: https://bitcoin.org/bitcoin.pdf');
  console.log();

  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY environment variable is not set');
  }

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/openrouter/examples',
      'X-Title': 'FileParser - PDF URL Example',
    },
    body: JSON.stringify({
      model: 'openai/gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'file',
              file: {
                filename: 'bitcoin.pdf',
                // Send PDF via public URL - no need to download or encode
                file_data: 'https://bitcoin.org/bitcoin.pdf',
              },
            },
            {
              type: 'text',
              text: 'What are the main points of this document? Provide a brief 2-3 sentence summary.',
            },
          ],
        },
      ],
      // Configure PDF processing engine
      plugins: [
        {
          id: 'file-parser',
          pdf: {
            engine: 'mistral-ocr', // or 'pdf-text' for free tier
          },
        },
      ],
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
  }

  const data = (await response.json()) as ChatCompletionResponse;

  console.log('✅ Request successful!');
  console.log('\nModel:', data.model);
  // FIXME: ChatCompletionResponse type is missing 'provider' field which exists in actual response
  // @ts-expect-error - provider field exists in response but not in type definition
  console.log('Provider:', data.provider);
  console.log('\nSummary:');
  console.log(data.choices[0].message.content);
  console.log('\nToken usage:');
  console.log(`- Prompt tokens: ${data.usage.prompt_tokens}`);
  console.log(`- Completion tokens: ${data.usage.completion_tokens}`);
  console.log(`- Total tokens: ${data.usage.total_tokens}`);

  return data;
}

async function main() {
  try {
    await examplePDFFromURL();
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
