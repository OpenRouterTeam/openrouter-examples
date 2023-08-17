import OpenAI from "openai"

require("dotenv").config()

// TODO: make a key at openrouter.ai/keys and put it in .env
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_BASE_URL =
  process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1"

const openai = new OpenAI({
  apiKey: OPENROUTER_API_KEY, // defaults to process.env["OPENAI_API_KEY"]
  baseURL: OPENROUTER_BASE_URL,
  defaultHeaders: {
    "HTTP-Referer": "https://github.com/OpenRouterTeam/openrouter-examples",
  },
})

async function main() {
  const completion = await openai.chat.completions.create({
    messages: [{ role: "user", content: "Say this is a test" }],
    model: "openai/gpt-3.5-turbo",
  })

  console.log(completion.choices)

  // Streaming responses
  const stream = await openai.chat.completions.create({
    model: "openai/gpt-4",
    messages: [{ role: "user", content: "Say this is a test" }],
    stream: true,
  })
  for await (const part of stream) {
    process.stdout.write(part.choices[0]?.delta?.content || "")
  }
}

main()
