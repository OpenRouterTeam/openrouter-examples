/**
 * Example: Anthropic Prompt Caching - Multi-Message Conversation (AI SDK v5)
 *
 * This example demonstrates Anthropic prompt caching in a multi-message conversation
 * via OpenRouter using Vercel AI SDK v5.
 *
 * Pattern: User message cache in multi-turn conversation
 * - Cache large context in first user message
 * - Cache persists through conversation history
 *
 * To run: bun run typescript/ai-sdk-v5/src/prompt-caching/multi-message-cache.ts
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
  console.log('║   Anthropic Prompt Caching - Multi-Message (AI SDK v5)                    ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝');
  console.log();
  console.log('Testing cache_control in multi-turn conversation');
  console.log();

  try {
    const testId = Date.now();
    const model = openrouter('anthropic/claude-3-5-sonnet');
    const largeContext = `Test ${testId}: Context:\n\n${LARGE_SYSTEM_PROMPT}`;

    // First call with conversation history
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
                  cacheControl: { type: 'ephemeral' },
                },
              },
            },
            {
              type: 'text',
              text: "Hello, what's your purpose?",
            },
          ],
        },
        {
          role: 'assistant',
          content: "I'm an AI assistant designed to help with various tasks.",
        },
        {
          role: 'user',
          content: 'What programming languages do you know?',
        },
      ],
    });

    const cached1 =
      result1.providerMetadata?.openrouter?.usage?.promptTokensDetails?.cachedTokens ?? 0;
    console.log(`  Response: ${result1.text.substring(0, 80)}...`);
    console.log(`  cached_tokens=${cached1}`);

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
              text: "Hello, what's your purpose?",
            },
          ],
        },
        {
          role: 'assistant',
          content: "I'm an AI assistant designed to help with various tasks.",
        },
        {
          role: 'user',
          content: 'What programming languages do you know?',
        },
      ],
    });

    const cached2 =
      result2.providerMetadata?.openrouter?.usage?.promptTokensDetails?.cachedTokens ?? 0;
    console.log(`  Response: ${result2.text.substring(0, 80)}...`);
    console.log(`  cached_tokens=${cached2}`);

    // Analysis
    console.log('\n' + '='.repeat(80));
    console.log('ANALYSIS');
    console.log('='.repeat(80));
    console.log(`First call:  cached_tokens=${cached1} (expected: 0)`);
    console.log(`Second call: cached_tokens=${cached2} (expected: >0)`);

    const success = cached1 === 0 && cached2 > 0;
    console.log(`\nResult: ${success ? '✓ CACHE WORKING' : '✗ CACHE NOT WORKING'}`);

    if (success) {
      console.log('\n✓ SUCCESS - Multi-message caching is working correctly');
    } else {
      console.log('\n✗ FAILURE - Multi-message caching is not working as expected');
    }
  } catch (error) {
    console.error('\n❌ ERROR:', error);
    process.exit(1);
  }
}

main();
