import { OpenAIStream, StreamingTextResponse } from 'ai';
import OpenAI from 'openai';

require("dotenv").config();

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": "https://github.com/OpenRouterTeam/openrouter-examples",
  }
});

async function main() {
  const response = await openai.chat.completions.create({
    model: 'openai/gpt-3.5-turbo',
    messages: [{ role: 'user', content: 'Say this is a test' }],
    stream: true,
  });

  // Convert the response into a friendly text-stream
  const stream = OpenAIStream(response);
  
  // Create a StreamingTextResponse and log it to console
  const streamingResponse = new StreamingTextResponse(stream);
  console.log("Streaming response created");

  // Read the stream
  const reader = streamingResponse.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    process.stdout.write(new TextDecoder().decode(value));
  }
}

main().catch(console.error);
