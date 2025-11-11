/**
 * Example: Anthropic Prompt Caching - User Message (Effect AI)
 *
 * This example demonstrates Anthropic prompt caching on a user message via OpenRouter
 * using @effect/ai and @effect/ai-openrouter with Effect's idiomatic patterns.
 *
 * Pattern: User message with options.openrouter.cacheControl in Prompt
 * - Effect.gen for composable effects
 * - Layer-based dependency injection
 * - Cache control on content items in Prompt.make
 *
 * CRITICAL CONFIGURATION:
 * - **MUST** include stream_options: { include_usage: true } in model config layer
 * - Without it, usage.cachedInputTokens will be undefined
 *
 * To run: bun run typescript/effect-ai/src/prompt-caching/user-message-cache.ts
 */

import * as OpenRouterClient from '@effect/ai-openrouter/OpenRouterClient';
import * as OpenRouterLanguageModel from '@effect/ai-openrouter/OpenRouterLanguageModel';
import * as LanguageModel from '@effect/ai/LanguageModel';
import * as Prompt from '@effect/ai/Prompt';
import { FetchHttpClient } from '@effect/platform';
import * as BunContext from '@effect/platform-bun/BunContext';
import { LARGE_SYSTEM_PROMPT } from '@openrouter-examples/shared/constants';
import { Console, Effect, Layer, Redacted } from 'effect';

/**
 * Main program
 */
const program = Effect.gen(function* () {
  const testId = Date.now();
  const largeContext = `Test ${testId}: Here is a comprehensive codebase to analyze:\n\n${LARGE_SYSTEM_PROMPT}`;

  yield* Console.log(
    '╔════════════════════════════════════════════════════════════════════════════╗',
  );
  yield* Console.log(
    '║   Anthropic Prompt Caching - User Message (Effect AI)                     ║',
  );
  yield* Console.log(
    '╚════════════════════════════════════════════════════════════════════════════╝',
  );
  yield* Console.log('');
  yield* Console.log('Testing cache_control on user message content block');
  yield* Console.log(
    `Context size: ${largeContext.length} characters (~${Math.round(largeContext.length / 4)} tokens)`,
  );
  yield* Console.log('');

  const makePrompt = () =>
    Prompt.make([
      {
        role: 'user' as const,
        content: [
          {
            type: 'text' as const,
            text: largeContext,
            options: {
              openrouter: {
                cacheControl: { type: 'ephemeral' as const },
              },
            },
          },
          {
            type: 'text' as const,
            text: 'Based on this codebase, what are the main patterns used?',
          },
        ],
      },
    ]);

  yield* Console.log('First Call (Cache Miss Expected)');
  const response1 = yield* LanguageModel.generateText({
    prompt: makePrompt(),
  });

  yield* Console.log(`  Response: ${response1.text.substring(0, 100)}...`);
  yield* Console.log(`  Cached tokens: ${response1.usage.cachedInputTokens ?? 0}`);

  yield* Effect.sleep('1 second');

  yield* Console.log('\nSecond Call (Cache Hit Expected)');
  const response2 = yield* LanguageModel.generateText({
    prompt: makePrompt(),
  });

  yield* Console.log(`  Response: ${response2.text.substring(0, 100)}...`);
  yield* Console.log(`  Cached tokens: ${response2.usage.cachedInputTokens ?? 0}`);

  // Analysis
  yield* Console.log('\n' + '='.repeat(80));
  yield* Console.log('ANALYSIS');
  yield* Console.log('='.repeat(80));

  const cached1 = response1.usage.cachedInputTokens ?? 0;
  const cached2 = response2.usage.cachedInputTokens ?? 0;

  yield* Console.log(`First call:  cached_tokens=${cached1} (expected: 0)`);
  yield* Console.log(`Second call: cached_tokens=${cached2} (expected: >0)`);

  const success = cached1 === 0 && cached2 > 0;

  if (success) {
    yield* Console.log('\n✓ SUCCESS - User message caching is working correctly');
  } else {
    yield* Console.log('\n✗ FAILURE - User message caching is not working as expected');
  }

  yield* Console.log('='.repeat(80));
});

// Create layers
const OpenRouterClientLayer = OpenRouterClient.layer({
  apiKey: Redacted.make(process.env.OPENROUTER_API_KEY!),
}).pipe(Layer.provide(FetchHttpClient.layer));

const OpenRouterModelLayer = OpenRouterLanguageModel.layer({
  model: 'anthropic/claude-3.5-sonnet',
  config: {
    stream_options: { include_usage: true }, // CRITICAL!
  },
}).pipe(Layer.provide(OpenRouterClientLayer));

// Run program
await program.pipe(
  Effect.provide(OpenRouterModelLayer),
  Effect.provide(BunContext.layer),
  Effect.runPromise,
);

console.log('\n✓ Program completed successfully');
