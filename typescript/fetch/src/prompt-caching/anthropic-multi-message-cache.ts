/**
 * Example: Anthropic Prompt Caching - Multi-Message Conversation
 *
 * This example demonstrates Anthropic prompt caching in a multi-message conversation via OpenRouter.
 *
 * Scientific Method:
 * - Hypothesis: cache_control at content-item level triggers Anthropic caching
 * - Experiment: Make identical calls twice and measure cache hit via usage metrics
 * - Evidence: usage.prompt_tokens_details.cached_tokens (OpenAI-compatible format)
 *
 * IMPORTANT: OpenRouter transforms Anthropic's native response format to OpenAI-compatible format:
 * - Anthropic native: usage.cache_read_input_tokens, usage.cache_creation_input_tokens
 * - OpenRouter returns: usage.prompt_tokens_details.cached_tokens (OpenAI-compatible)
 *
 * Anthropic Cache Requirements:
 * - **CRITICAL**: stream_options.include_usage must be set to true (otherwise no usage details)
 * - Minimum 2048+ tokens to cache reliably (we use 30k+ char system prompt from shared)
 * - cache_control: {type: "ephemeral"} on content items
 * - TTL: 5 minutes for ephemeral caches
 *
 * Pattern: Multi-message conversation with cache_control
 * - System message with cache
 * - Multiple user/assistant exchanges
 * - Cache should persist across the conversation
 */

import { LARGE_SYSTEM_PROMPT } from '@openrouter-examples/shared/constants';
import type { ChatCompletionResponse } from '@openrouter-examples/shared/types';

// OpenRouter API endpoint
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * Make a chat completion request to OpenRouter with Anthropic caching
 */
async function makeRequest(
  requestBody: unknown,
  description: string,
): Promise<ChatCompletionResponse> {
  console.log(`\n${description}`);

  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY environment variable is not set');
  }

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/openrouter/examples',
      'X-Title': 'Anthropic Cache - Multi-Message',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
  }

  const data = (await response.json()) as ChatCompletionResponse;

  // Show cache-relevant metrics in OpenAI-compatible format
  const cachedTokens = data.usage.prompt_tokens_details?.cached_tokens ?? 0;
  const promptTokens = data.usage.prompt_tokens;
  const completionTokens = data.usage.completion_tokens;

  const metrics: string[] = [`prompt=${promptTokens}`, `completion=${completionTokens}`];

  if (cachedTokens > 0) {
    metrics.push(`cached=${cachedTokens} ✓ (CACHE HIT)`);
  } else {
    metrics.push('cached=0 (CACHE MISS)');
  }

  console.log(`  ${metrics.join(', ')}`);

  return data;
}

/**
 * Main example
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║    Anthropic Prompt Caching - Multi-Message with cache_control            ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝');
  console.log();
  console.log('Testing cache_control on system message in a multi-message conversation');
  console.log(
    `System prompt size: ${LARGE_SYSTEM_PROMPT.length} characters (~${Math.round(LARGE_SYSTEM_PROMPT.length / 4)} tokens)`,
  );
  console.log();
  console.log('Expected behavior:');
  console.log('  1st call: cached_tokens = 0 (cache miss, creates cache)');
  console.log('  2nd call: cached_tokens > 0 (cache hit, reads from cache)');
  console.log();

  try {
    const requestBody = {
      model: 'anthropic/claude-3.5-sonnet',
      stream_options: {
        include_usage: true, // CRITICAL: Required for cached_tokens to be populated
      },
      messages: [
        {
          role: 'system',
          content: [
            {
              type: 'text',
              text: LARGE_SYSTEM_PROMPT,
              cache_control: { type: 'ephemeral' },
            },
          ],
        },
        {
          role: 'user',
          content: "Hello, what's your name?",
        },
        {
          role: 'assistant',
          content: "I'm Claude, an AI assistant created by Anthropic.",
        },
        {
          role: 'user',
          content: 'What programming languages do you know?',
        },
      ],
    };

    // First call - should create cache
    const response1 = await makeRequest(requestBody, 'First Call (Cache Miss Expected)');

    // Wait 1 second between calls to ensure they're processed separately
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Second identical call - should hit cache
    const response2 = await makeRequest(requestBody, 'Second Call (Cache Hit Expected)');

    // Verify cache behavior using OpenAI-compatible format
    console.log('\n' + '='.repeat(80));
    console.log('ANALYSIS');
    console.log('='.repeat(80));

    const cached1 = response1.usage.prompt_tokens_details?.cached_tokens ?? 0;
    const cached2 = response2.usage.prompt_tokens_details?.cached_tokens ?? 0;

    console.log(`First call:  cached_tokens=${cached1} (expected: 0, cache miss creates cache)`);
    console.log(`Second call: cached_tokens=${cached2} (expected: >0, cache hit reads from cache)`);

    if (cached1 === 0) {
      console.log('✓ First call cache miss (created cache for future requests)');
    } else {
      console.log(`⚠ First call unexpectedly had cached tokens: ${cached1}`);
    }

    if (cached2 > 0) {
      console.log(`✓ Second call cache hit: ${cached2} tokens read from cache`);
    } else {
      console.log(`✗ Second call did NOT hit cache (cached_tokens=${cached2})`);
    }

    const success = cached1 === 0 && cached2 > 0;
    console.log(`\nResult: ${success ? '✓ CACHE WORKING' : '✗ CACHE NOT WORKING'}`);

    if (success) {
      console.log('\n════════════════════════════════════════════════════════════════════════════');
      console.log('✓ SUCCESS - Multi-message caching is working correctly');
      console.log('════════════════════════════════════════════════════════════════════════════');
    } else {
      console.log('\n════════════════════════════════════════════════════════════════════════════');
      console.log('✗ FAILURE - Multi-message caching is not working as expected');
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

// Run the example
main();
