/**
 * PDF Provider Matrix Test
 *
 * Tests PDF inputs against specific providers to find which ones fail.
 * Uses OpenRouter's provider routing to force specific backends.
 *
 * This helps identify provider-specific bugs (e.g., Azure rejecting 'file' type).
 *
 * To run: bun run typescript/ai-sdk-v5/src/pdf-openai-regression/pdf-provider-matrix.ts
 */

import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText } from 'ai';
import { readPdfAsDataUrl, readExpectedCode } from '@openrouter-examples/shared/fixtures';
import { createCachedFetch } from '@openrouter-examples/shared/request-cache';

// Test matrix: model + specific provider combinations
// Provider slugs from: https://openrouter.ai/docs/features/provider-routing
const TEST_MATRIX = [
  // OpenAI model via different providers - THIS IS THE KEY TEST
  { model: 'openai/gpt-4o', provider: 'OpenAI', label: 'gpt-4o via OpenAI direct' },
  { model: 'openai/gpt-4o', provider: 'Azure', label: 'gpt-4o via Azure' },

  // GPT-4o-mini via different providers
  { model: 'openai/gpt-4o-mini', provider: 'OpenAI', label: 'gpt-4o-mini via OpenAI direct' },
  { model: 'openai/gpt-4o-mini', provider: 'Azure', label: 'gpt-4o-mini via Azure' },

  // Claude via different providers
  { model: 'anthropic/claude-3-5-sonnet', provider: 'Anthropic', label: 'Claude via Anthropic' },
  { model: 'anthropic/claude-3-5-sonnet', provider: 'Amazon Bedrock', label: 'Claude via Bedrock' },
  { model: 'anthropic/claude-3-5-sonnet', provider: 'Google Vertex', label: 'Claude via Vertex' },

  // Gemini via different providers
  { model: 'google/gemini-2.0-flash-001', provider: 'Google AI Studio', label: 'Gemini via AI Studio' },
  { model: 'google/gemini-2.0-flash-001', provider: 'Google Vertex', label: 'Gemini via Vertex' },

  // Other providers
  { model: 'mistralai/pixtral-large-2411', provider: 'Mistral', label: 'Pixtral via Mistral' },
] as const;

interface TestResult {
  label: string;
  model: string;
  provider: string;
  success: boolean;
  codeExtracted: string | null;
  matches: boolean;
  error?: string;
  actualProvider?: string;
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

async function testModelProvider(
  model: string,
  providerSlug: string,
  label: string,
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
      model: openrouter(model, {
        // Force specific provider using extraBody
        extraBody: {
          provider: {
            only: [providerSlug],
          },
        },
      }),
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

    // Try to extract actual provider from response metadata
    let actualProvider: string | undefined;
    const rawResponse = result.response as unknown;
    if (rawResponse && typeof rawResponse === 'object' && 'body' in rawResponse) {
      const body = (rawResponse as { body?: { provider?: string } }).body;
      actualProvider = body?.provider;
    }

    return {
      label,
      model,
      provider: providerSlug,
      success: true,
      codeExtracted,
      matches: codeExtracted === expectedCode,
      actualProvider,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      label,
      model,
      provider: providerSlug,
      success: false,
      codeExtracted: null,
      matches: false,
      error: truncate(errorMsg),
    };
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║           PDF Provider Matrix Test - Targeting Specific Backends           ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝');
  console.log();

  const cachedFetch = createCachedFetch({ enabled: true, ttlMs: 60 * 60 * 1000 });

  console.log('Loading PDF fixture (small.pdf)...');
  const pdfDataUrl = await readPdfAsDataUrl('small');
  const expectedCode = await readExpectedCode('small');
  console.log(`Expected code: ${expectedCode}\n`);

  const results: TestResult[] = [];

  for (const test of TEST_MATRIX) {
    console.log(`Testing: ${test.label}...`);
    const result = await testModelProvider(
      test.model,
      test.provider,
      test.label,
      pdfDataUrl,
      expectedCode,
      cachedFetch,
    );
    results.push(result);
  }

  // Print results table
  console.log('\n=== Results ===\n');
  console.log('Test Case                                    | Status  | Code       | Match');
  console.log('---------------------------------------------|---------|------------|------');

  for (const r of results) {
    const labelPad = r.label.padEnd(44);
    const status = r.success ? 'SUCCESS' : 'FAIL   ';
    const code = (r.codeExtracted ?? 'N/A').padEnd(10);
    const match = r.matches ? 'YES' : 'NO ';
    console.log(`${labelPad} | ${status} | ${code} | ${match}`);
  }

  // Show errors
  const failures = results.filter((r) => !r.success);
  if (failures.length > 0) {
    console.log('\n=== Failures ===\n');
    for (const f of failures) {
      console.log(`${f.label}:`);
      console.log(`  Model: ${f.model}`);
      console.log(`  Provider: ${f.provider}`);
      console.log(`  Error: ${f.error}`);
      console.log();
    }
  }

  // Summary
  console.log('\n=== Summary ===\n');
  const successCount = results.filter((r) => r.matches).length;
  const failCount = results.filter((r) => !r.success).length;
  const partialCount = results.filter((r) => r.success && !r.matches).length;

  console.log(`Total tests: ${results.length}`);
  console.log(`  ✓ Success (code matched): ${successCount}`);
  console.log(`  ⚠ Partial (response but wrong code): ${partialCount}`);
  console.log(`  ✗ Failed (error): ${failCount}`);

  // Identify provider-specific issues
  const providerIssues = new Map<string, string[]>();
  for (const r of results) {
    if (!r.success) {
      const issues = providerIssues.get(r.provider) || [];
      issues.push(`${r.model}: ${r.error}`);
      providerIssues.set(r.provider, issues);
    }
  }

  if (providerIssues.size > 0) {
    console.log('\n=== Provider-Specific Issues ===\n');
    for (const [provider, issues] of providerIssues) {
      console.log(`${provider}:`);
      for (const issue of issues) {
        console.log(`  - ${issue}`);
      }
    }
  }

  process.exit(failCount > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Fatal:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
