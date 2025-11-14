/**
 * Example: Anthropic Prompt Caching - User Message (AI SDK v5)
 *
 * This example demonstrates Anthropic prompt caching on a user message via OpenRouter
 * using Vercel AI SDK v5.
 *
 * Pattern: User message with providerOptions.openrouter.cacheControl
 * - User message with content array
 * - cache_control on text content block via providerOptions
 *
 * CRITICAL CONFIGURATION:
 * - **MUST** include extraBody: { stream_options: { include_usage: true } }
 * - Without this, usage details (including cached_tokens) are not populated
 *
 * To run: bun run typescript/ai-sdk-v5/src/prompt-caching/user-message-cache.ts
 */

import { LARGE_SYSTEM_PROMPT } from '@openrouter-examples/shared/constants';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText } from 'ai';

// Create the OpenRouter provider
// CRITICAL: extraBody with stream_options is REQUIRED for usage details
const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
  extraBody: {
    stream_options: { include_usage: true }, // Required for cached_tokens field
  },
});

/**
 * Main example
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║    Anthropic Prompt Caching - User Message (AI SDK v5)                    ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝');
  console.log();
  console.log('Testing cache_control on user message content block');
  console.log(
    `Context size: ${LARGE_SYSTEM_PROMPT.length} characters (~${Math.round(LARGE_SYSTEM_PROMPT.length / 4)} tokens)`,
  );
  console.log();
  console.log('Expected behavior:');
  console.log('  1st call: cached_tokens = 0 (cache miss, creates cache)');
  console.log('  2nd call: cached_tokens > 0 (cache hit, reads from cache)');
  console.log();

  try {
    const testId = Date.now();
    const model = openrouter('anthropic/claude-3-5-sonnet');

    // Use large context in user message
    const largeContext = `Test ${testId}: Here is a comprehensive codebase to analyze:\n\n${LARGE_SYSTEM_PROMPT}`;

    // First call - should create cache
    console.log('First Call (Cache Miss Expected)');
    const result1 = await generateText({
      model,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: largeContext,
              providerOptions: {
                openrouter: {
                  cacheControl: { type: 'ephemeral' }, // Cache this content block
                },
              },
            },
            {
              type: 'text',
              text: 'Based on this codebase, what are the main patterns used?',
            },
          ],
        },
      ],
    });

    console.log('  Response:', result1.text.substring(0, 100) + '...');
    const usage1 = result1.providerMetadata?.openrouter?.usage;
    const cached1 = usage1?.promptTokensDetails?.cachedTokens ?? 0;
    console.log(`  Tokens: prompt=${usage1?.promptTokens}, completion=${usage1?.completionTokens}, cached=${cached1}`);

    // Wait 1 second
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Second identical call - should hit cache
    console.log('\nSecond Call (Cache Hit Expected)');
    const result2 = await generateText({
      model,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: largeContext,
              providerOptions: {
                openrouter: {
                  cacheControl: { type: 'ephemeral' },
                },
              },
            },
            {
              type: 'text',
              text: 'Based on this codebase, what are the main patterns used?',
            },
          ],
        },
      ],
    });

    console.log('  Response:', result2.text.substring(0, 100) + '...');
    const usage2 = result2.providerMetadata?.openrouter?.usage;
    const cached2 = usage2?.promptTokensDetails?.cachedTokens ?? 0;
    console.log(`  Tokens: prompt=${usage2?.promptTokens}, completion=${usage2?.completionTokens}, cached=${cached2}`);

    // Analysis
    console.log('\n' + '='.repeat(80));
    console.log('ANALYSIS');
    console.log('='.repeat(80));

    console.log(`First call:  cached_tokens=${cached1} (expected: 0)`);
    console.log(`Second call: cached_tokens=${cached2} (expected: >0)`);

    if (cached1 === 0) {
      console.log('✓ First call cache miss (created cache)');
    } else {
      console.log(`⚠ First call unexpectedly had cached tokens: ${cached1}`);
    }

    if (cached2 > 0) {
      console.log(`✓ Second call cache hit: ${cached2} tokens read from cache`);
    } else {
      console.log(`✗ Second call did NOT hit cache`);
    }

    const success = cached1 === 0 && cached2 > 0;
    console.log(`\nResult: ${success ? '✓ CACHE WORKING' : '✗ CACHE NOT WORKING'}`);

    if (success) {
      console.log('\n════════════════════════════════════════════════════════════════════════════');
      console.log('✓ SUCCESS - User message caching is working correctly');
      console.log('════════════════════════════════════════════════════════════════════════════');
    } else {
      console.log('\n════════════════════════════════════════════════════════════════════════════');
      console.log('✗ FAILURE - User message caching is not working as expected');
      console.log('════════════════════════════════════════════════════════════════════════════');
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

main();
