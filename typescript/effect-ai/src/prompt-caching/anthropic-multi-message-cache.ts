/**
 * Example: Anthropic Prompt Caching - Multi-Message Conversation (Effect AI)
 *
 * This example demonstrates Anthropic prompt caching in a multi-message conversation
 * via OpenRouter using Effect AI.
 *
 * Pattern: User message cache in multi-turn conversation using Effect patterns
 *
 * To run: bun run typescript/effect-ai/src/prompt-caching/multi-message-cache.ts
 */

import * as OpenRouterClient from '@effect/ai-openrouter/OpenRouterClient';
import * as OpenRouterLanguageModel from '@effect/ai-openrouter/OpenRouterLanguageModel';
import * as LanguageModel from '@effect/ai/LanguageModel';
import * as Prompt from '@effect/ai/Prompt';
import { FetchHttpClient } from '@effect/platform';
import * as BunContext from '@effect/platform-bun/BunContext';
import { LARGE_SYSTEM_PROMPT } from '@openrouter-examples/shared/constants';
import { Console, Effect, Layer, Redacted } from 'effect';

const program = Effect.gen(function* () {
  const testId = Date.now();
  const largeContext = `Test ${testId}: Context:\n\n${LARGE_SYSTEM_PROMPT}`;

  yield* Console.log(
    '╔════════════════════════════════════════════════════════════════════════════╗',
  );
  yield* Console.log(
    '║   Anthropic Prompt Caching - Multi-Message (Effect AI)                    ║',
  );
  yield* Console.log(
    '╚════════════════════════════════════════════════════════════════════════════╝',
  );
  yield* Console.log('');
  yield* Console.log('Testing cache_control in multi-turn conversation');
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
            text: "Hello, what's your purpose?",
          },
        ],
      },
      {
        role: 'assistant' as const,
        content: "I'm an AI assistant designed to help with various tasks.",
      },
      {
        role: 'user' as const,
        content: 'What programming languages do you know?',
      },
    ]);

  yield* Console.log('First Call (Cache Miss Expected)');
  const response1 = yield* LanguageModel.generateText({
    prompt: makePrompt(),
  });
  const cached1 = response1.usage.cachedInputTokens ?? 0;
  yield* Console.log(`  Response: ${response1.text.substring(0, 80)}...`);
  yield* Console.log(`  cached_tokens=${cached1}`);

  yield* Effect.sleep('1 second');

  yield* Console.log('\nSecond Call (Cache Hit Expected)');
  const response2 = yield* LanguageModel.generateText({
    prompt: makePrompt(),
  });
  const cached2 = response2.usage.cachedInputTokens ?? 0;
  yield* Console.log(`  Response: ${response2.text.substring(0, 80)}...`);
  yield* Console.log(`  cached_tokens=${cached2}`);

  // Analysis
  yield* Console.log('\n' + '='.repeat(80));
  yield* Console.log('ANALYSIS');
  yield* Console.log('='.repeat(80));
  yield* Console.log(`First call:  cached_tokens=${cached1} (expected: 0)`);
  yield* Console.log(`Second call: cached_tokens=${cached2} (expected: >0)`);

  const success = cached1 === 0 && cached2 > 0;

  if (success) {
    yield* Console.log('\n✓ SUCCESS - Multi-message caching is working correctly');
  } else {
    yield* Console.log('\n✗ FAILURE - Multi-message caching is not working as expected');
  }

  yield* Console.log('='.repeat(80));
});

const OpenRouterClientLayer = OpenRouterClient.layer({
  apiKey: Redacted.make(process.env.OPENROUTER_API_KEY!),
}).pipe(Layer.provide(FetchHttpClient.layer));

const OpenRouterModelLayer = OpenRouterLanguageModel.layer({
  model: 'anthropic/claude-3.5-sonnet',
  config: {
    stream_options: { include_usage: true },
  },
}).pipe(Layer.provide(OpenRouterClientLayer));

await program.pipe(
  Effect.provide(OpenRouterModelLayer),
  Effect.provide(BunContext.layer),
  Effect.runPromise,
);

console.log('\n✓ Program completed successfully');
