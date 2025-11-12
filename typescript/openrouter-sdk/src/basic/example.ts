/**
 * Example usage of the @openrouter/sdk package
 *
 * This demonstrates the OpenRouter TypeScript SDK's idiomatic usage patterns:
 * - Type-safe client initialization
 * - Non-streaming chat completions
 * - Streaming chat completions with async iteration
 * - Automatic usage tracking
 */

import { OpenRouter } from '@openrouter/sdk';

// Initialize the OpenRouter SDK client
// The SDK automatically reads OPENROUTER_API_KEY from environment
const openRouter = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY ?? '',
});

async function nonStreamingExample() {
  console.log('=== Non-Streaming Example ===\n');

  // Basic chat completion - returns the full response at once
  const result = await openRouter.chat.send({
    model: 'openai/gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content: 'What is the capital of France?',
      },
    ],
    stream: false, // Explicitly set stream to false for non-streaming
  });

  // The SDK provides strong typing - result has 'choices' property
  if ('choices' in result && result.choices[0]) {
    console.log('Model:', result.model);
    console.log('Response:', result.choices[0].message.content);
    console.log('Usage:', result.usage);
    console.log();
  }
}

async function streamingExample() {
  console.log('=== Streaming Example ===\n');

  // Streaming chat completion - returns an async iterable
  const stream = await openRouter.chat.send({
    model: 'openai/gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content: 'Write a haiku about TypeScript',
      },
    ],
    stream: true, // Enable streaming mode
    streamOptions: {
      includeUsage: true, // Include token usage in the final chunk
    },
  });

  console.log('Streaming response:');
  let fullContent = '';

  // The SDK returns an async iterable that you can iterate with for-await-of
  for await (const chunk of stream) {
    // Each chunk contains partial data
    if (chunk.choices?.[0]?.delta?.content) {
      const content = chunk.choices[0].delta.content;
      process.stdout.write(content); // Write without newline to see real-time streaming
      fullContent += content;
    }

    // Usage stats are included in the final chunk when streamOptions.includeUsage is true
    if (chunk.usage) {
      console.log('\n\nStream usage:', chunk.usage);
    }
  }

  console.log('\n\nFull response:', fullContent);
  console.log();
}

async function main() {
  try {
    // Demonstrate both streaming and non-streaming modes
    await nonStreamingExample();
    await streamingExample();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
