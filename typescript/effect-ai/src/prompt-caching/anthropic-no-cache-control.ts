/**
 * Example: Anthropic Prompt Caching - Control (No cache_control) (Effect AI)
 *
 * This is a CONTROL scenario demonstrating that without cache_control,
 * no caching occurs.
 *
 * Purpose: Validates that cache behavior is due to cache_control, not coincidence
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
    '║   Anthropic Prompt Caching - Control (No cache_control) (Effect AI)       ║',
  );
  yield* Console.log(
    '╚════════════════════════════════════════════════════════════════════════════╝',
  );
  yield* Console.log('');
  yield* Console.log('Testing WITHOUT cache_control (control scenario)');
  yield* Console.log('');

  const makePrompt = () =>
    Prompt.make([
      {
        role: 'user' as const,
        content: [
          {
            type: 'text' as const,
            text: largeContext,
            // NO cache_control - this is the control
          },
          {
            type: 'text' as const,
            text: 'What are the key principles?',
          },
        ],
      },
    ]);

  yield* Console.log('First Call (No Cache Expected)');
  const response1 = yield* LanguageModel.generateText({
    prompt: makePrompt(),
  });
  const cached1 = response1.usage.cachedInputTokens ?? 0;
  yield* Console.log(`  cached_tokens=${cached1}`);

  yield* Effect.sleep('1 second');

  yield* Console.log('\nSecond Call (No Cache Expected)');
  const response2 = yield* LanguageModel.generateText({
    prompt: makePrompt(),
  });
  const cached2 = response2.usage.cachedInputTokens ?? 0;
  yield* Console.log(`  cached_tokens=${cached2}`);

  // Analysis
  yield* Console.log('\n' + '='.repeat(80));
  yield* Console.log('ANALYSIS (CONTROL)');
  yield* Console.log('='.repeat(80));
  yield* Console.log(`First call:  cached_tokens=${cached1} (expected: 0)`);
  yield* Console.log(`Second call: cached_tokens=${cached2} (expected: 0)`);

  if (cached1 === 0 && cached2 === 0) {
    yield* Console.log('✓ No cache metrics present (expected for control)');
  } else {
    yield* Console.log('✗ Unexpected cache metrics in control scenario');
  }

  const success = cached1 === 0 && cached2 === 0;

  if (success) {
    yield* Console.log('\n✓ SUCCESS - Control scenario confirms no false positives');
  } else {
    yield* Console.log('\n✗ FAILURE - Control scenario shows unexpected cache behavior');
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
