/**
 * Example: Google Gemini 3 Reasoning/Thinking Details (Effect AI)
 *
 * This example demonstrates requesting reasoning details from Gemini 3 models
 * via OpenRouter using Effect AI.
 *
 * Pattern: Single request with reasoning enabled using Effect patterns
 * - Effect.gen for effect composition
 * - Layer-based dependency injection
 * - Type-safe error handling
 *
 * NOTE: This example currently fails due to a schema limitation in @effect/ai-openrouter.
 * The reasoning_details format "google-gemini-v1" is not yet included in the schema.
 * Expected formats: "unknown" | "openai-responses-v1" | "anthropic-claude-v1"
 * Actual format returned: "google-gemini-v1"
 *
 * This will be fixed once the schema is updated to include "google-gemini-v1".
 * The fetch and AI SDK v5 examples work correctly as they don't enforce strict schemas.
 */

import * as OpenRouterClient from '@effect/ai-openrouter/OpenRouterClient';
import * as OpenRouterLanguageModel from '@effect/ai-openrouter/OpenRouterLanguageModel';
import * as LanguageModel from '@effect/ai/LanguageModel';
import * as Prompt from '@effect/ai/Prompt';
import { FetchHttpClient } from '@effect/platform';
import * as BunContext from '@effect/platform-bun/BunContext';
import { Console, Effect, Layer, Redacted } from 'effect';

const program = Effect.gen(function* () {
  yield* Console.log(
    '╔════════════════════════════════════════════════════════════════════════════╗',
  );
  yield* Console.log(
    '║        Google Gemini 3 - Reasoning/Thinking Details (Effect AI)           ║',
  );
  yield* Console.log(
    '╚════════════════════════════════════════════════════════════════════════════╝',
  );
  yield* Console.log('');
  yield* Console.log('Testing Gemini reasoning feature with a multi-step problem');
  yield* Console.log('');

  const prompt = Prompt.make([
    {
      role: 'user' as const,
      content:
        'Solve this problem step by step: If a train leaves station A at 2pm traveling 60mph, and another train leaves station B (120 miles away) at 2:30pm traveling 80mph toward station A, when and where do they meet?',
    },
  ]);

  yield* Console.log('Request with Reasoning Enabled');
  const response = yield* LanguageModel.generateText({
    prompt,
  });

  // Access usage metrics
  const reasoningTokens = response.usage.reasoningTokens ?? 0;
  const promptTokens = response.usage.inputTokens ?? 0;
  const completionTokens = response.usage.outputTokens ?? 0;

  yield* Console.log(
    `  prompt=${promptTokens}, completion=${completionTokens}, reasoning=${reasoningTokens}`,
  );

  // Analysis
  yield* Console.log('\n' + '='.repeat(80));
  yield* Console.log('ANALYSIS');
  yield* Console.log('='.repeat(80));

  yield* Console.log(`Reasoning tokens: ${reasoningTokens}`);

  if (reasoningTokens > 0) {
    yield* Console.log(`✓ Reasoning enabled: ${reasoningTokens} tokens used for thinking`);
  } else {
    yield* Console.log('✗ No reasoning tokens detected');
  }

  yield* Console.log('\n--- Final Answer ---');
  yield* Console.log(response.text);

  const success = reasoningTokens > 0;

  if (success) {
    yield* Console.log(
      '\n════════════════════════════════════════════════════════════════════════════',
    );
    yield* Console.log('✓ SUCCESS - Gemini reasoning is working correctly');
    yield* Console.log(
      '════════════════════════════════════════════════════════════════════════════',
    );
  } else {
    yield* Console.log(
      '\n════════════════════════════════════════════════════════════════════════════',
    );
    yield* Console.log('✗ FAILURE - Gemini reasoning is not working as expected');
    yield* Console.log(
      '════════════════════════════════════════════════════════════════════════════',
    );
  }
});

const OpenRouterClientLayer = OpenRouterClient.layer({
  apiKey: Redacted.make(process.env.OPENROUTER_API_KEY!),
}).pipe(Layer.provide(FetchHttpClient.layer));

const OpenRouterModelLayer = OpenRouterLanguageModel.layer({
  model: 'google/gemini-3-pro-preview',
  config: {
    reasoning: {
      enabled: true,
      max_tokens: 2000,
      exclude: false,
    },
  },
}).pipe(Layer.provide(OpenRouterClientLayer));

await program.pipe(
  Effect.provide(OpenRouterModelLayer),
  Effect.provide(BunContext.layer),
  Effect.runPromise,
);

console.log('\n✓ Program completed successfully');
