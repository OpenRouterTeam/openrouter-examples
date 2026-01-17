/**
 * Example: Google Gemini 3 Reasoning/Thinking Details
 *
 * This example demonstrates requesting reasoning details from Gemini 3 models via OpenRouter.
 *
 * Scientific Method:
 * - Hypothesis: reasoning.enabled triggers Google's thinkingConfig
 * - Experiment: Make request with reasoning enabled and measure reasoning_tokens in usage
 * - Evidence: usage.completion_tokens_details.reasoning_tokens (OpenAI-compatible format)
 *
 * IMPORTANT: OpenRouter transforms Google's native response format to OpenAI-compatible format:
 * - Google native: usageMetadata.thoughtsTokenCount, parts[].thought
 * - OpenRouter returns: usage.completion_tokens_details.reasoning_tokens, message.reasoning
 *
 * Gemini Reasoning Requirements:
 * - Model: google/gemini-3-pro-preview (Gemini 3)
 * - reasoning.enabled: true (or reasoning.max_tokens, or reasoning.effort)
 * - Gemini 3 Pro: reasoning is MANDATORY (always enabled)
 * - Max reasoning tokens: 200,000
 * - Context window: 1,048,576 tokens (1M)
 *
 * Pattern: Single request with reasoning enabled
 * - Request with reasoning.enabled: true
 * - Response includes reasoning text and token count
 * - reasoning_details must be preserved in follow-up requests
 */

import type { ChatCompletionResponse } from '@openrouter-examples/shared/types';

// OpenRouter API endpoint
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * Make a chat completion request to OpenRouter with Gemini reasoning
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
      'X-Title': 'Gemini Reasoning Example',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
  }

  const data = (await response.json()) as ChatCompletionResponse;

  // Show reasoning-relevant metrics in OpenAI-compatible format
  const reasoningTokens = data.usage.completion_tokens_details?.reasoning_tokens ?? 0;
  const promptTokens = data.usage.prompt_tokens;
  const completionTokens = data.usage.completion_tokens;

  const metrics: string[] = [`prompt=${promptTokens}`, `completion=${completionTokens}`];

  if (reasoningTokens > 0) {
    metrics.push(`reasoning=${reasoningTokens} ✓ (THINKING ENABLED)`);
  } else {
    metrics.push('reasoning=0 (NO THINKING)');
  }

  console.log(`  ${metrics.join(', ')}`);

  // Show reasoning text if present
  if (data.choices[0]?.message?.reasoning) {
    const reasoning = data.choices[0].message.reasoning;
    console.log(`  Reasoning preview: ${reasoning.substring(0, 100)}...`);
  }

  return data;
}

/**
 * Main example
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║           Google Gemini 3 - Reasoning/Thinking Details                    ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝');
  console.log();
  console.log('Testing Gemini reasoning feature with a multi-step problem');
  console.log();
  console.log('Expected behavior:');
  console.log('  1. reasoning_tokens > 0 (model used thinking tokens)');
  console.log('  2. message.reasoning contains thinking process');
  console.log('  3. message.reasoning_details[] contains structured details');
  console.log();

  try {
    const requestBody = {
      model: 'google/gemini-3-pro-preview',
      reasoning: {
        enabled: true, // Enable thinking mode
        max_tokens: 2000, // Allocate thinking budget (smaller for faster response)
        exclude: false, // Show thoughts in response
      },
      messages: [
        {
          role: 'user',
          content:
            'Solve this problem step by step: If a train leaves station A at 2pm traveling 60mph, and another train leaves station B (120 miles away) at 2:30pm traveling 80mph toward station A, when and where do they meet?',
        },
      ],
    };

    // Make request with reasoning enabled
    const response = await makeRequest(requestBody, 'Request with Reasoning Enabled');

    // Analyze response
    console.log('\n' + '='.repeat(80));
    console.log('ANALYSIS');
    console.log('='.repeat(80));

    const reasoningTokens = response.usage.completion_tokens_details?.reasoning_tokens ?? 0;
    const reasoning = response.choices[0]?.message?.reasoning;
    const reasoningDetails = response.choices[0]?.message?.reasoning_details;
    const answer = response.choices[0]?.message?.content;

    console.log(`Reasoning tokens: ${reasoningTokens}`);
    console.log(`Has reasoning text: ${reasoning ? 'YES' : 'NO'}`);
    console.log(`Has reasoning_details: ${reasoningDetails ? 'YES' : 'NO'}`);
    console.log(
      `Reasoning details count: ${Array.isArray(reasoningDetails) ? reasoningDetails.length : 0}`,
    );

    if (reasoningTokens > 0) {
      console.log(`✓ Reasoning enabled: ${reasoningTokens} tokens used for thinking`);
    } else {
      console.log('✗ No reasoning tokens detected');
    }

    if (reasoning) {
      console.log('\n--- Reasoning Process ---');
      console.log(reasoning);
    }

    if (reasoningDetails && Array.isArray(reasoningDetails)) {
      console.log('\n--- Reasoning Details (structured) ---');
      for (const detail of reasoningDetails) {
        console.log(`Type: ${detail.type}, Format: ${detail.format}`);
        if (detail.type === 'reasoning.text') {
          console.log(`Text preview: ${detail.text?.substring(0, 100)}...`);
        }
      }
    }

    console.log('\n--- Final Answer ---');
    console.log(answer);

    const success = reasoningTokens > 0 && reasoning;
    console.log(`\nResult: ${success ? '✓ REASONING WORKING' : '✗ REASONING NOT WORKING'}`);

    if (success) {
      console.log('\n════════════════════════════════════════════════════════════════════════════');
      console.log('✓ SUCCESS - Gemini reasoning is working correctly');
      console.log('════════════════════════════════════════════════════════════════════════════');
    } else {
      console.log('\n════════════════════════════════════════════════════════════════════════════');
      console.log('✗ FAILURE - Gemini reasoning is not working as expected');
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
