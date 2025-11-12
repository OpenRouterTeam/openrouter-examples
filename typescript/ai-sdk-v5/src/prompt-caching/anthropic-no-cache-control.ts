/**
 * Example: Anthropic Prompt Caching - Control (No cache_control) (AI SDK v5)
 *
 * This is a CONTROL scenario demonstrating that without cache_control,
 * no caching occurs.
 *
 * Purpose: Validates that cache behavior is due to cache_control, not coincidence
 */

import { LARGE_SYSTEM_PROMPT } from '@openrouter-examples/shared/constants';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText } from 'ai';

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
  extraBody: {
    stream_options: { include_usage: true },
  },
});

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║   Anthropic Prompt Caching - Control (No cache_control) (AI SDK v5)       ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝');
  console.log();
  console.log('Testing WITHOUT cache_control (control scenario)');
  console.log();
  console.log('Expected behavior:');
  console.log('  1st call: cached_tokens = 0 (no cache_control)');
  console.log('  2nd call: cached_tokens = 0 (no cache_control)');
  console.log();

  try {
    const testId = Date.now();
    const model = openrouter('anthropic/claude-3-5-sonnet');
    const largeContext = `Test ${testId}: Context:\n\n${LARGE_SYSTEM_PROMPT}`;

    // First call - NO cache_control
    console.log('First Call (No Cache Expected)');
    const result1 = await generateText({
      model,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: largeContext,
              // NO cache_control - this is the control
            },
            {
              type: 'text',
              text: 'What are the key principles?',
            },
          ],
        },
      ],
    });

    // FIXME: providerMetadata.openrouter.usage should have proper type with promptTokensDetails
    const cached1 =
      // @ts-expect-error - usage is typed as JSONValue but should be OpenRouterUsage
      result1.providerMetadata?.openrouter?.usage?.promptTokensDetails?.cachedTokens ?? 0;
    console.log(`  cached_tokens=${cached1}`);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Second call - still NO cache_control
    console.log('\nSecond Call (No Cache Expected)');
    const result2 = await generateText({
      model,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: largeContext,
              // NO cache_control
            },
            {
              type: 'text',
              text: 'What are the key principles?',
            },
          ],
        },
      ],
    });

    // FIXME: providerMetadata.openrouter.usage should have proper type with promptTokensDetails
    const cached2 =
      // @ts-expect-error - usage is typed as JSONValue but should be OpenRouterUsage
      result2.providerMetadata?.openrouter?.usage?.promptTokensDetails?.cachedTokens ?? 0;
    console.log(`  cached_tokens=${cached2}`);

    // Analysis
    console.log('\n' + '='.repeat(80));
    console.log('ANALYSIS (CONTROL)');
    console.log('='.repeat(80));
    console.log(`First call:  cached_tokens=${cached1} (expected: 0)`);
    console.log(`Second call: cached_tokens=${cached2} (expected: 0)`);

    if (cached1 === 0 && cached2 === 0) {
      console.log('✓ No cache metrics present (expected for control - no cache_control)');
    } else {
      console.log('✗ Unexpected cache metrics in control scenario');
    }

    const success = cached1 === 0 && cached2 === 0;
    console.log(`\nResult: ${success ? '✓ CONTROL VALID' : '✗ CONTROL INVALID'}`);

    if (success) {
      console.log('\n✓ SUCCESS - Control scenario confirms no false positives');
    } else {
      console.log('\n✗ FAILURE - Control scenario shows unexpected cache behavior');
    }
  } catch (error) {
    console.error('\n❌ ERROR:', error);
    process.exit(1);
  }
}

main();
