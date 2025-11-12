/**
 * Example: OpenRouter FileParserPlugin with AI SDK Provider
 *
 * Demonstrates PDF processing using the AI SDK with OpenRouter's file parser plugin.
 * PDFs are sent as file attachments and automatically parsed server-side.
 *
 * Key Points:
 * - FileParserPlugin automatically enabled for file attachments
 * - PDFs sent via data URI format
 * - Tests multiple PDF sizes with verification code extraction
 *
 * To run: bun run typescript/ai-sdk-v5/src/plugin-file-parser/file-parser-all-sizes.ts
 */

import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText } from 'ai';

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

const MODEL = 'anthropic/claude-3.5-sonnet';

const PDF_SIZES = ['small', 'medium', 'large', 'xlarge'] as const;

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
  const file = Bun.file(filePath);
  const buffer = await file.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  return `data:application/pdf;base64,${base64}`;
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
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Process a single PDF with FileParserPlugin
 */
async function testPdf(size: (typeof PDF_SIZES)[number], expectedCode: string): Promise<boolean> {
  const path = `./fixtures/pdfs/${size}.pdf`;
  const file = Bun.file(path);
  const dataUrl = await readPdfAsDataUrl(path);

  console.log(`\n=== ${size.toUpperCase()} PDF ===`);
  console.log(`Size: ${formatSize(file.size)}`);
  console.log(`Expected: ${expectedCode}`);

  const model = openrouter(MODEL, { usage: { include: true } });

  const result = await generateText({
    model,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Extract the verification code. Reply with ONLY the code.',
          },
          {
            type: 'file',
            data: dataUrl,
            mediaType: 'application/pdf',
          },
        ],
      },
    ],
  });

  const extracted = extractCode(result.text);
  const success = extracted === expectedCode;

  console.log(`Extracted: ${extracted || '(none)'}`);
  console.log(`Status: ${success ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Tokens: ${result.usage.totalTokens}`);

  const usage = result.providerMetadata?.openrouter?.usage;
  if (usage && typeof usage === 'object' && 'cost' in usage) {
    const cost = usage.cost as number;
    console.log(`Cost: $${cost.toFixed(6)}`);
  }

  return success;
}

/**
 * Main example
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║        OpenRouter FileParserPlugin - AI SDK Provider                      ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝');
  console.log();
  console.log('Testing PDF processing with verification code extraction');
  console.log();

  const results: boolean[] = [];

  for (const size of PDF_SIZES) {
    const expectedCode = EXPECTED_CODES[size];
    if (!expectedCode) {
      console.error(`No expected code found for ${size}`);
      results.push(false);
      continue;
    }

    try {
      results.push(await testPdf(size, expectedCode));
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
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
