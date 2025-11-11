/**
 * Example: Anthropic Prompt Caching - Control (No cache_control)
 *
 * This example demonstrates the CONTROL scenario: no cache_control markers.
 *
 * Scientific Method:
 * - Hypothesis: Without cache_control, no caching should occur
 * - Experiment: Make identical calls twice without cache_control
 * - Evidence: usage.prompt_tokens_details.cached_tokens should remain 0
 *
 * IMPORTANT: OpenRouter transforms Anthropic's native response format to OpenAI-compatible format:
 * - Anthropic native: usage.cache_read_input_tokens, usage.cache_creation_input_tokens
 * - OpenRouter returns: usage.prompt_tokens_details.cached_tokens (OpenAI-compatible)
 *
 * Purpose: This control scenario ensures our test methodology is sound
 * - Same large system prompt
 * - NO cache_control markers
 * - Should NOT see cache metrics
 */

import { LARGE_SYSTEM_PROMPT } from '@openrouter-examples/shared/constants';
import type { ChatCompletionResponse } from '@openrouter-examples/shared/types';

// OpenRouter API endpoint
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * Make a chat completion request to OpenRouter WITHOUT Anthropic caching
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
      'X-Title': 'Anthropic Cache - Control (No Cache)',
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
    metrics.push(`cached=${cachedTokens} ⚠ (UNEXPECTED CACHE HIT)`);
  } else {
    metrics.push('cached=0 (EXPECTED - NO CACHE)');
  }

  console.log(`  ${metrics.join(', ')}`);

  return data;
}

/**
 * Main example
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║       Anthropic Prompt Caching - Control (No cache_control)               ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝');
  console.log();
  console.log('Testing WITHOUT cache_control (control scenario)');
  console.log(
    `System prompt size: ${LARGE_SYSTEM_PROMPT.length} characters (~${Math.round(LARGE_SYSTEM_PROMPT.length / 4)} tokens)`,
  );
  console.log();
  console.log('Expected behavior:');
  console.log('  1st call: cached_tokens = 0 (no cache_control)');
  console.log('  2nd call: cached_tokens = 0 (no cache_control)');
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
              // NO cache_control - this is the control
            },
          ],
        },
        {
          role: 'user',
          content: 'What are the key principles you follow?',
        },
      ],
    };

    // First call
    const response1 = await makeRequest(requestBody, 'First Call (No Cache Expected)');

    // Wait 1 second between calls to ensure they're processed separately
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Second identical call
    const response2 = await makeRequest(requestBody, 'Second Call (No Cache Expected)');

    // Verify cache behavior using OpenAI-compatible format
    console.log('\n' + '='.repeat(80));
    console.log('ANALYSIS (CONTROL)');
    console.log('='.repeat(80));

    const cached1 = response1.usage.prompt_tokens_details?.cached_tokens ?? 0;
    const cached2 = response2.usage.prompt_tokens_details?.cached_tokens ?? 0;

    console.log(`First call:  cached_tokens=${cached1} (expected: 0, no cache_control)`);
    console.log(`Second call: cached_tokens=${cached2} (expected: 0, no cache_control)`);

    if (cached1 === 0 && cached2 === 0) {
      console.log('✓ No cache metrics present (expected for control - no cache_control)');
    } else {
      console.log('✗ Unexpected cache metrics in control scenario');
    }

    const success = cached1 === 0 && cached2 === 0;
    console.log(`\nResult: ${success ? '✓ CONTROL VALID' : '✗ CONTROL INVALID'}`);

    if (success) {
      console.log('\n════════════════════════════════════════════════════════════════════════════');
      console.log('✓ SUCCESS - Control scenario confirms no false positives');
      console.log('════════════════════════════════════════════════════════════════════════════');
      console.log();
      console.log('This control validates that:');
      console.log('- Cache metrics are NOT present without cache_control');
      console.log('- Our test methodology is sound');
      console.log('- Positive results in other examples are genuine cache hits');
    } else {
      console.log('\n════════════════════════════════════════════════════════════════════════════');
      console.log('✗ FAILURE - Control scenario shows unexpected cache behavior');
      console.log('════════════════════════════════════════════════════════════════════════════');
      console.log();
      console.log('This invalidates our testing methodology:');
      console.log('- Cache metrics appearing without cache_control suggests false positives');
      console.log('- Need to investigate why caching occurs without explicit markers');
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
