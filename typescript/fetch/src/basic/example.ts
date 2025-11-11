/**
 * Example: Using OpenRouter with raw fetch API
 *
 * This example demonstrates how to make direct HTTP requests to OpenRouter's API
 * using the native fetch API without any additional libraries.
 *
 * To run: bun examples/basic/example-basic-fetch.ts
 */

// Make this a module
export {};

// OpenRouter API endpoint
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Type definitions for the API response
interface ChatCompletionResponse {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Request payload following OpenAI-compatible chat completions format
const requestBody = {
  model: 'openai/gpt-4o-mini',
  messages: [
    {
      role: 'user',
      content: 'Write a haiku about TypeScript',
    },
  ],
};

console.log('=== OpenRouter Raw Fetch Example ===\n');
console.log('Request:');
console.log(`URL: ${OPENROUTER_API_URL}`);
console.log('Model:', requestBody.model);
console.log('Message:', requestBody.messages[0]?.content);
console.log();

try {
  // Ensure API key is available
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY environment variable is not set');
  }

  // Make the HTTP POST request to OpenRouter
  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      // Required: Authorization header with your API key
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      // Required: Content type for JSON payload
      'Content-Type': 'application/json',
      // Optional but recommended: Identify your app
      'HTTP-Referer': 'https://github.com/openrouter/examples',
      'X-Title': 'OpenRouter Fetch Example',
    },
    body: JSON.stringify(requestBody),
  });

  // Check if the request was successful
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
  }

  // Parse the JSON response
  const data = (await response.json()) as ChatCompletionResponse;

  // Display the response
  console.log('Response:');
  console.log('Status:', response.status, response.statusText);
  console.log('Model used:', data.model);
  console.log('\nGenerated content:');
  console.log(data.choices[0]?.message?.content);
  console.log('\nUsage stats:');
  console.log('- Prompt tokens:', data.usage.prompt_tokens);
  console.log('- Completion tokens:', data.usage.completion_tokens);
  console.log('- Total tokens:', data.usage.total_tokens);

  // Optional: Show raw response structure
  if (process.env.DEBUG) {
    console.log('\nFull response object:');
    console.log(JSON.stringify(data, null, 2));
  }
} catch (error) {
  console.error('Error making request to OpenRouter:');

  if (error instanceof Error) {
    console.error('Error message:', error.message);
  } else {
    console.error('Unknown error:', error);
  }

  process.exit(1);
}
