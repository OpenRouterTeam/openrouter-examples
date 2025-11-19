/**
 * Idiomatic Vercel AI SDK example with OpenRouter provider
 *
 * This example demonstrates key AI SDK concepts:
 * - Creating and configuring the OpenRouter provider
 * - Using generateText for non-streaming chat completions
 * - Using streamText for streaming responses
 * - Defining and using tools (function calling)
 * - Usage accounting to track token usage and costs
 * - Multi-turn conversations with system messages
 */

import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText, streamText, tool } from 'ai';
import { z } from 'zod';

// Create the OpenRouter provider instance
// The provider acts as a factory for creating model instances
const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

// Example 1: Simple text generation (non-streaming)
async function simpleGeneration() {
  console.log('\n=== Example 1: Simple Text Generation ===\n');

  // Create a model instance - each model can have its own configuration
  const model = openrouter('openai/gpt-4o-mini');

  // generateText returns the complete response once generation is finished
  const { text, usage, finishReason } = await generateText({
    model,
    prompt: 'Explain what the Vercel AI SDK is in one sentence.',
  });

  console.log('Response:', text);
  console.log('\nUsage:', usage);
  console.log('Finish Reason:', finishReason);
}

// Example 2: Streaming text generation
async function streamingGeneration() {
  console.log('\n=== Example 2: Streaming Text Generation ===\n');

  const model = openrouter('openai/gpt-4o-mini');

  // streamText returns a stream that yields tokens as they're generated
  const result = streamText({
    model,
    prompt: 'Write a haiku about TypeScript.',
  });

  // Stream the response token by token
  process.stdout.write('Streaming response: ');
  for await (const chunk of result.textStream) {
    process.stdout.write(chunk);
  }
  console.log('\n');

  // After streaming completes, you can access the full response and metadata
  const finalText = await result.text;
  const finalUsage = await result.usage;
  console.log('Final text length:', finalText.length, 'characters');
  console.log('Tokens used:', finalUsage.totalTokens);
}

// Example 3: Tools (Function Calling)
async function toolCalling() {
  console.log('\n=== Example 3: Tools (Function Calling) ===\n');

  // Define tools using the tool() helper and Zod schemas
  // Tools allow the model to call functions to perform actions or retrieve data
  // Note: Use 'inputSchema' not 'parameters' for AI SDK v5
  const weatherTool = tool({
    description: 'Get the current weather for a location',
    inputSchema: z.object({
      location: z.string().describe('The city and country, e.g., San Francisco, CA'),
      unit: z.enum(['celsius', 'fahrenheit']).default('celsius'),
    }),
    execute: async (params) => {
      // In a real app, you'd call a weather API here
      return {
        location: params.location,
        temperature: params.unit === 'celsius' ? 22 : 72,
        unit: params.unit,
        condition: 'Partly cloudy',
      };
    },
  });

  const calculatorTool = tool({
    description: 'Perform basic arithmetic calculations',
    inputSchema: z.object({
      operation: z.enum(['add', 'subtract', 'multiply', 'divide']),
      a: z.number(),
      b: z.number(),
    }),
    execute: async (params) => {
      switch (params.operation) {
        case 'add':
          return { result: params.a + params.b };
        case 'subtract':
          return { result: params.a - params.b };
        case 'multiply':
          return { result: params.a * params.b };
        case 'divide':
          if (params.b === 0) {
            return { error: 'Cannot divide by zero' };
          }
          return { result: params.a / params.b };
      }
    },
  });

  const model = openrouter('openai/gpt-4o-mini');

  // generateText with tools automatically handles tool calls
  // The SDK will call tools as needed and include results in the conversation
  const { text, toolCalls, toolResults } = await generateText({
    model,
    prompt: "What's the weather in Tokyo, Japan? Also, what's 42 multiplied by 17?",
    tools: {
      getWeather: weatherTool,
      calculate: calculatorTool,
    },
  });

  console.log('Final Response:', text);
  console.log('\nTool Calls:', toolCalls);
  console.log('Tool Results:', toolResults);
}

// Example 4: Usage Accounting
async function usageAccounting() {
  console.log('\n=== Example 4: Usage Accounting ===\n');

  // Enable usage accounting to get detailed token usage and cost information
  // This is an OpenRouter-specific feature that provides cost tracking
  const model = openrouter('openai/gpt-4o-mini', {
    usage: {
      include: true, // Request detailed usage information
    },
  });

  const result = await generateText({
    model,
    prompt: 'What are the benefits of using TypeScript?',
  });

  console.log('Response:', result.text);
  console.log('\nStandard Usage:', result.usage);

  // OpenRouter-specific metadata with cost information
  if (result.providerMetadata?.openrouter?.usage) {
    const usage = result.providerMetadata.openrouter.usage as {
      totalTokens?: number;
      promptTokens?: number;
      completionTokens?: number;
      cost?: number;
    };
    console.log('\nOpenRouter Usage Details:');
    console.log('- Total Tokens:', usage.totalTokens);
    console.log('- Prompt Tokens:', usage.promptTokens);
    console.log('- Completion Tokens:', usage.completionTokens);
    if (usage.cost) {
      console.log(`- Cost: $${usage.cost.toFixed(6)}`);
    }
  }
}

// Example 5: Multi-turn conversation with system messages
async function conversationExample() {
  console.log('\n=== Example 5: Multi-turn Conversation ===\n');

  const model = openrouter('openai/gpt-4o-mini');

  // Use messages array for multi-turn conversations
  // System messages set the behavior and context for the model
  const { text } = await generateText({
    model,
    system:
      'You are a helpful coding assistant specializing in TypeScript and modern web development.',
    messages: [
      {
        role: 'user',
        content: 'How do I define a generic function in TypeScript?',
      },
      {
        role: 'assistant',
        content:
          'You define a generic function using angle brackets with a type parameter, like this: `function identity<T>(arg: T): T { return arg; }`',
      },
      {
        role: 'user',
        content: 'Can you show me an example with multiple type parameters?',
      },
    ],
  });

  console.log('Assistant:', text);
}

// Example 6: Provider-specific options
async function providerOptions() {
  console.log('\n=== Example 6: Provider-Specific Options ===\n');

  const model = openrouter('openai/gpt-4o-mini');

  // You can pass OpenRouter-specific options via providerOptions
  // Different providers support different options
  const { text } = await generateText({
    model,
    prompt: 'Tell me about OpenRouter.',
    providerOptions: {
      openrouter: {
        // OpenRouter-specific options can be passed here
        // For example, transforms or other provider features
      },
    },
  });

  console.log('Response:', text);
}

// Run all examples
async function main() {
  console.log('Vercel AI SDK with OpenRouter Provider Examples');
  console.log('='.repeat(50));

  try {
    await simpleGeneration();
    await streamingGeneration();
    await toolCalling();
    await usageAccounting();
    await conversationExample();
    await providerOptions();

    console.log('\n' + '='.repeat(50));
    console.log('All examples completed successfully!');
  } catch (error) {
    console.error('\nError:', error);
    process.exit(1);
  }
}

// Execute if run directly
main();
