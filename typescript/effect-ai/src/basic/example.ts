/**
 * Example: Using OpenRouter with @effect/ai and @effect/ai-openrouter
 *
 * This example demonstrates idiomatic Effect patterns for AI interactions:
 * - Effect.gen for generator-style effect composition
 * - Layer-based dependency injection
 * - Type-safe error handling with Effect
 * - Streaming responses with Effect streams
 */

import * as OpenRouterClient from '@effect/ai-openrouter/OpenRouterClient';
import * as OpenRouterLanguageModel from '@effect/ai-openrouter/OpenRouterLanguageModel';
import * as Chat from '@effect/ai/Chat';
import * as LanguageModel from '@effect/ai/LanguageModel';
import { FetchHttpClient } from '@effect/platform';
import * as BunContext from '@effect/platform-bun/BunContext';
import { Console, Effect, Layer, Redacted, Stream } from 'effect';

/**
 * Main program using Effect.gen for composable effects
 *
 * Effect.gen is the idiomatic way to write Effect code - it provides
 * a generator-based syntax similar to async/await but with full
 * error handling and dependency injection capabilities
 */
const program = Effect.gen(function* () {
  // Log separator for readability
  yield* Console.log('\n=== Example 1: Simple Chat Completion ===\n');

  // Generate text using the language model
  // The LanguageModel service is injected via the Effect context
  const response = yield* LanguageModel.generateText({
    prompt: 'Explain what Effect is in functional programming in 2 sentences.',
  });

  // Access the generated text from the response
  yield* Console.log('Response:', response.text);
  yield* Console.log('Finish reason:', response.finishReason);
  yield* Console.log('Usage:', response.usage);

  // Example 2: Stateful conversation with Chat
  yield* Console.log('\n=== Example 2: Stateful Chat Conversation ===\n');

  // Chat.empty creates a new chat session with empty history
  // Chat maintains conversation context across multiple turns
  const chat = yield* Chat.empty;

  // First turn - the model responds to our greeting
  const greeting = yield* chat.generateText({
    prompt: "Hi! I'm learning about Effect.",
  });
  yield* Console.log('Assistant:', greeting.text);

  // Second turn - the model has context from the previous message
  // This demonstrates how Chat maintains conversation state
  const followUp = yield* chat.generateText({
    prompt: 'What are the main benefits?',
  });
  yield* Console.log('Assistant:', followUp.text);

  // Example 3: Streaming responses
  yield* Console.log('\n=== Example 3: Streaming Text Generation ===\n');

  yield* Console.log('Streaming response:');

  // streamText returns a Stream of response parts
  // Streams in Effect are lazy and composable
  // Stream.runForEach processes each part as it arrives
  yield* LanguageModel.streamText({
    prompt: 'Count from 1 to 5, explaining each number briefly.',
  }).pipe(
    Stream.runForEach((part) => {
      // Only print text deltas to show streaming effect
      if (part.type === 'text-delta') {
        // TODO: print without newlines
        return Console.log(part.delta);
      }
      // Log other part types for demonstration
      return Console.log(`[${part.type}]`);
    }),
  );

  yield* Console.log('\n=== All examples completed ===');
});

/**
 * Layer composition for dependency injection
 *
 * Effect uses Layers to construct the dependency graph.
 * Layers are composable and type-safe, ensuring all dependencies
 * are satisfied at compile time.
 */

// Create the OpenRouter HTTP client layer with API key
// Redacted.make ensures the API key is never accidentally logged
const OpenRouterClientLayer = OpenRouterClient.layer({
  apiKey: Redacted.make(process.env.OPENROUTER_API_KEY!),
}).pipe(
  // Provide the Fetch HTTP client implementation
  // Layer.provide composes layers, satisfying dependencies
  Layer.provide(FetchHttpClient.layer),
);

// Create the language model layer using OpenRouter
// This uses the "openai/gpt-4o-mini" model via OpenRouter
const OpenRouterModelLayer = OpenRouterLanguageModel.layer({
  model: 'openai/gpt-4o-mini',
  config: {
    // Optional: configure model parameters
    temperature: 0.7,
    max_tokens: 500,
  },
}).pipe(
  // The model layer depends on the OpenRouter client
  Layer.provide(OpenRouterClientLayer),
);

/**
 * Run the program with dependency injection
 *
 * Effect.provide supplies all required dependencies (layers) to the program.
 * The layers are constructed once and shared across the entire program.
 *
 * Effect.runPromise executes the Effect and returns a Promise.
 * In production, you'd typically use Effect.runFork or other runners
 * for better resource management.
 */
await program.pipe(
  // Provide the language model layer (includes all dependencies)
  Effect.provide(OpenRouterModelLayer),
  // Provide the Bun runtime context for platform services
  Effect.provide(BunContext.layer),
  // Run the effect - returns a Promise<void>
  Effect.runPromise,
);

console.log('\n✓ Program completed successfully');
