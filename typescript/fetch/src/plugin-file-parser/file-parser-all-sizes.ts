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
 *
 * To run: bun run typescript/fetch/src/plugin-file-parser/file-parser-all-sizes.ts
 */

import type { ChatCompletionResponse } from '@openrouter-examples/shared/types';

// OpenRouter API endpoint
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Expected verification codes from PDFs
const EXPECTED_CODES: Record<string, string> = {
  small: 'SMALL-7X9Q2',
  medium: 'MEDIUM-K4P8R',
  large: 'LARGE-M9N3T',
  xlarge: 'XLARGE-F6H2V',
};

/**
 * Convert PDF file to base64 data URL
 */
async function readPdfAsDataUrl(filePath: string): Promise<string> {
  const pdfFile = Bun.file(filePath);
  const pdfBuffer = await pdfFile.arrayBuffer();
  const base64PDF = Buffer.from(pdfBuffer).toString('base64');
  return `data:application/pdf;base64,${base64PDF}`;
}

/**
 * Extract verification code from response text
 */
function extractCode(text: string): string | null {
  const match = text.match(/[A-Z]+-[A-Z0-9]{5}/);
  return match ? match[0] : null;
}

/**
 * Format file size for display
 */
function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Make a request to process a PDF with FileParserPlugin
 */
async function processPdf(
  size: string,
  expectedCode: string,
): Promise<{ success: boolean; extracted: string | null; usage?: unknown }> {
  const filePath = `./fixtures/pdfs/${size}.pdf`;
  const file = Bun.file(filePath);
  const dataUrl = await readPdfAsDataUrl(filePath);

  console.log(`\n=== ${size.toUpperCase()} PDF ===`);
  console.log(`Size: ${formatSize(file.size)}`);
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
    for (const [size, expectedCode] of Object.entries(EXPECTED_CODES)) {
      try {
        const result = await processPdf(size, expectedCode);
        results.push(result.success);
      } catch (error) {
        console.log(`Status: ❌ FAIL`);
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
    } else {
      console.log('\n❌ Some PDF tests failed');
      process.exit(1);
    }
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
