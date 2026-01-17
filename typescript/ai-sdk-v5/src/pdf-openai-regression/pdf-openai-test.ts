/**
 * Example: PDF Input with OpenAI Models via OpenRouter (AI SDK v5)
 *
 * This test verifies whether PDF attachments work with OpenAI models
 * when using @openrouter/ai-sdk-provider.
 *
 * Bug hypothesis: PDFs fail for OpenAI models but work for Anthropic/Google.
 *
 * Expected behavior:
 * - All models should be able to read the PDF and extract the verification code
 * - The code in small.pdf is: SMALL-7X9Q2
 *
 * Caching: Responses are cached to .cache/requests/ to avoid hitting the API
 * repeatedly during development. Delete the cache to force fresh requests.
 *
 * To run: bun run typescript/ai-sdk-v5/src/pdf-openai-regression/pdf-openai-test.ts
 */

import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText } from 'ai';
import { readPdfAsDataUrl, readExpectedCode } from '@openrouter-examples/shared/fixtures';
import { createCachedFetch } from '@openrouter-examples/shared/request-cache';

const MODELS_TO_TEST = [
  // OpenAI models - testing various variants
  'openai/gpt-4o-mini',
  'openai/gpt-4o',
  'openai/gpt-4-turbo',
  // Anthropic
  'anthropic/claude-3-5-sonnet',
  // Google
  'google/gemini-2.0-flash-001',
  // Other providers for comparison
  'x-ai/grok-3-mini-beta',
  'mistralai/pixtral-large-2411',
] as const;

interface TestResult {
  model: string;
  success: boolean;
  codeExtracted: string | null;
  matches: boolean;
  error?: string;
}

function truncate(str: string, max = 200): string {
  return str.length <= max ? str : str.slice(0, max) + '...';
}

function extractCode(text: string): string | null {
  const match = text.match(/([A-Z]+)\s*[-–—]\s*([A-Z0-9]{5})/i);
  if (match) {
    return `${match[1].toUpperCase()}-${match[2].toUpperCase()}`;
  }
  const strict = text.match(/[A-Z]+-[A-Z0-9]{5}/);
  return strict ? strict[0] : null;
}

async function testModel(
  model: string,
  pdfDataUrl: string,
  expectedCode: string,
  cachedFetch: typeof fetch,
): Promise<TestResult> {
  const openrouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
    fetch: cachedFetch,
  });

  try {
    const result = await generateText({
      model: openrouter(model),
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

    const codeExtracted = extractCode(result.text);
    return {
      model,
      success: true,
      codeExtracted,
      matches: codeExtracted === expectedCode,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      model,
      success: false,
      codeExtracted: null,
      matches: false,
      error: truncate(errorMsg),
    };
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║     PDF Input Test: OpenAI vs Others via AI SDK + OpenRouter Provider      ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝');
  console.log();

  // Create cached fetch
  const cachedFetch = createCachedFetch({ enabled: true, ttlMs: 60 * 60 * 1000 });

  // Load PDF fixture
  console.log('Loading PDF fixture (small.pdf)...');
  const pdfDataUrl = await readPdfAsDataUrl('small');
  const expectedCode = await readExpectedCode('small');
  console.log(`Expected code: ${expectedCode}\n`);

  const results: TestResult[] = [];

  // Test each model sequentially to avoid rate limits
  for (const model of MODELS_TO_TEST) {
    console.log(`Testing: ${model}...`);
    const result = await testModel(model, pdfDataUrl, expectedCode, cachedFetch);
    results.push(result);
  }

  // Print results table
  console.log('\n=== Results ===\n');
  console.log('Model                          | Status  | Code       | Match');
  console.log('-------------------------------|---------|------------|------');

  for (const r of results) {
    const modelPad = r.model.padEnd(30);
    const status = r.success ? 'SUCCESS' : 'FAIL   ';
    const code = (r.codeExtracted ?? 'N/A').padEnd(10);
    const match = r.matches ? 'YES' : 'NO ';
    console.log(`${modelPad} | ${status} | ${code} | ${match}`);
  }

  // Show errors if any
  const failures = results.filter((r) => !r.success);
  if (failures.length > 0) {
    console.log('\n=== Errors ===\n');
    for (const f of failures) {
      console.log(`${f.model}:`);
      console.log(`  ${f.error}`);
    }
  }

  // Summary
  console.log('\n=== Summary ===\n');
  const openaiResult = results.find((r) => r.model === 'openai/gpt-4o-mini');
  const anthropicResult = results.find((r) => r.model === 'anthropic/claude-3-5-sonnet');
  const googleResult = results.find((r) => r.model === 'google/gemini-2.0-flash-001');

  if (openaiResult?.matches) {
    console.log('✓ OpenAI PDF support: WORKING');
  } else if (openaiResult?.success) {
    console.log('⚠ OpenAI PDF support: Request succeeded but code not found');
  } else {
    console.log('✗ OpenAI PDF support: FAILING');
    console.log('  BUG CONFIRMED: OpenAI models cannot read PDFs via AI SDK + OpenRouter');
  }

  if (anthropicResult?.matches) {
    console.log('✓ Anthropic PDF support: WORKING');
  } else {
    console.log('✗ Anthropic PDF support: NOT WORKING');
  }

  if (googleResult?.matches) {
    console.log('✓ Google PDF support: WORKING');
  } else {
    console.log('✗ Google PDF support: NOT WORKING');
  }

  // Exit with error if OpenAI fails but others work (confirms the bug)
  const bugConfirmed = !openaiResult?.matches && (anthropicResult?.matches || googleResult?.matches);
  if (bugConfirmed) {
    console.log('\n❌ BUG REPRODUCED: OpenAI fails while other providers work');
    process.exit(1);
  }

  if (results.every((r) => r.matches)) {
    console.log('\n✓ All models working - no bug present');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
