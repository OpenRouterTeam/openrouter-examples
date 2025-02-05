import { OpenRouterProvider } from '@openrouter/ai-sdk-provider';
import { StreamingTextResponse } from 'ai';

require("dotenv").config();

const provider = new OpenRouterProvider({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
  headers: {
    "HTTP-Referer": "https://github.com/OpenRouterTeam/openrouter-examples",
  }
});

async function main() {
  const response = await provider.chat({
    messages: [{ role: "user", content: "Say this is a test" }],
    model: "openai/gpt-3.5-turbo",
  });

  console.log("Non-streaming response:", response);

  // Streaming example
  const streamingResponse = await provider.chat({
    messages: [{ role: "user", content: "Say this is a streaming test" }],
    model: "openai/gpt-4",
    stream: true,
  });

  console.log("\nStreaming response:");
  for await (const chunk of streamingResponse) {
    process.stdout.write(chunk.content || "");
  }
}

main().catch(console.error);
