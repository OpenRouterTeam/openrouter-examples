/**
 * Example: OpenRouter FileParserPlugin - All PDF Sizes
 *
 * This example demonstrates using OpenRouter's FileParserPlugin with raw fetch
 * to process PDF documents of various sizes. The plugin automatically parses PDFs
 * and makes them consumable by LLMs, even for models that don't natively support
 * file inputs.
 *
 * Key Points:
 * - FileParserPlugin processes PDFs for models without native file support
 * - PDFs are sent via base64-encoded data URLs
 * - Plugin must be explicitly configured in the request body
 * - Tests multiple PDF sizes: small (33KB), medium (813KB), large (3.4MB), xlarge (10.8MB)
 * - Uses shared fixtures module with absolute paths
 *
 * To run: bun run typescript/fetch/src/plugin-file-parser/file-parser-all-sizes.ts
 */

import {
  PDF_SIZES,
  type PdfSize,
  extractCode,
  formatSize,
  getPdfSize,
  readExpectedCode,
  readPdfAsDataUrl,
} from '@openrouter-examples/shared/fixtures';
import type { ChatCompletionResponse } from '@openrouter-examples/shared/types';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * Make a request to process a PDF with FileParserPlugin
 */
async function processPdf(
  size: PdfSize,
  expectedCode: string,
): Promise<{ success: boolean; extracted: string | null; usage?: unknown }> {
  const dataUrl = await readPdfAsDataUrl(size);
  const fileSize = getPdfSize(size);

  console.log(`\n=== ${size.toUpperCase()} PDF ===`);
  console.log(`Size: ${formatSize(fileSize)}`);
  console.log(`Expected: ${expectedCode}`);

  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY environment variable is not set');
  }

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/openrouter/examples',
      'X-Title': `FileParser - ${size} PDF`,
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
                filename: `${size}.pdf`,
                file_data: dataUrl,
              },
            },
            {
              type: 'text',
              text: 'Extract the verification code. Reply with ONLY the code.',
            },
          ],
        },
      ],
      plugins: [
        {
          id: 'file-parser',
          pdf: {
            engine: 'mistral-ocr',
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
  const responseText = data.choices[0].message.content;
  const extracted = extractCode(responseText);
  const success = extracted === expectedCode;

  console.log(`Extracted: ${extracted || '(none)'}`);
  console.log(`Status: ${success ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Tokens: ${data.usage.total_tokens}`);

  return { success, extracted, usage: data.usage };
}

/**
 * Main example
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║            OpenRouter FileParserPlugin - All PDF Sizes                     ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝');
  console.log();
  console.log('Testing PDF processing with verification code extraction');
  console.log();

  const results: boolean[] = [];

  try {
    for (const size of PDF_SIZES) {
      try {
        const expectedCode = await readExpectedCode(size);
        const result = await processPdf(size, expectedCode);
        results.push(result.success);
      } catch (error) {
        console.log('Status: ❌ FAIL');
        console.log(`Error: ${error instanceof Error ? error.message : String(error)}`);
        results.push(false);
      }
    }

    const passed = results.filter(Boolean).length;
    const total = results.length;

    console.log('\n' + '='.repeat(80));
    console.log(`Results: ${passed}/${total} passed`);
    console.log('='.repeat(80));

    if (passed === total) {
      console.log('\n✅ All PDF sizes processed successfully!');
      process.exit(0);
    }
    console.log('\n❌ Some PDF tests failed');
    process.exit(1);
  } catch (error) {
    console.error('\n❌ ERROR during testing:');

    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack trace:', error.stack);
    } else {
      console.error('Unknown error:', error);
    }

    process.exit(1);
  }
}

// Run the example
main();
