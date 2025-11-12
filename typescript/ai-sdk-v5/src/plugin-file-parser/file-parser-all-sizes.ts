/**
 * Example: OpenRouter FileParserPlugin with AI SDK Provider
 *
 * Demonstrates PDF processing using the AI SDK with OpenRouter's file parser plugin.
 * PDFs are sent as file attachments and automatically parsed server-side.
 *
 * Key Points:
 * - FileParserPlugin explicitly configured for models without native PDF support
 * - PDFs sent via data URI format
 * - Tests multiple PDF sizes with verification code extraction
 * - Uses shared fixtures module with absolute paths
 *
 * To run: bun run typescript/ai-sdk-v5/src/plugin-file-parser/file-parser-all-sizes.ts
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
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText } from 'ai';

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

// Use a model that doesn't have native PDF support to demonstrate FileParserPlugin
const MODEL = 'openai/gpt-4o-mini';

/**
 * Process a single PDF with FileParserPlugin
 */
async function testPdf(size: PdfSize, expectedCode: string): Promise<boolean> {
  const dataUrl = await readPdfAsDataUrl(size);
  const fileSize = getPdfSize(size);

  console.log(`\n=== ${size.toUpperCase()} PDF ===`);
  console.log(`Size: ${formatSize(fileSize)}`);
  console.log(`Expected: ${expectedCode}`);

  const model = openrouter(MODEL, {
    plugins: [
      {
        id: 'file-parser',
        pdf: {
          engine: 'mistral-ocr',
        },
      },
    ],
    usage: { include: true },
  });

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
    try {
      const expectedCode = await readExpectedCode(size);
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
