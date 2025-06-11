import { ChatOpenAI } from "langchain/chat_models/openai"
import { HumanMessage, SystemMessage, AIMessage } from "langchain/schema"
require("dotenv").config()

// TODO: make a key at openrouter.ai/keys and put it in .env
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_BASE_URL =
  process.env.OPENROUTER_BASE_URL || "https://openrouter.ai"

const chat = new ChatOpenAI(
  {
    modelName: "openai/gpt-3.5-turbo",
    // modelName: "tiiuae/falcon-40b-instruct",
    // modelName: "anthropic/claude-instant-v1",
    // modelName: "anthropic/claude-2",
    // modelName: "google/palm-2-chat-bison",
    temperature: 0.8,
    maxTokens: 300,
    streaming: true,
    openAIApiKey: OPENROUTER_API_KEY,
    configuration: {
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": "https://localhost:3000/",
        "X-Title": "Langchain.js Testing",
      }
    },
  }
)

async function main() {
  const response = await chat.call([
    new SystemMessage(
      "You are a helpful assistant that translates English to some other language, depending on the context."
    ),
    ...lotsOfMessages(2),
    new HumanMessage(
      "Translate: I am bouncy goofball who loves cookies and wants to go to Disneyland and ride the teacups. But one day I will be a real boy."
    ),
  ])

  console.log(response)
}

// Helpers

function* lotsOfMessages(numMessages: number) {
  const batch = [
    new HumanMessage("Translate: I make cookies."),
    new AIMessage("Je fais des biscuits."),
    new HumanMessage("Translate: I am a human."),
    new AIMessage("Je suis un humain."),
    new HumanMessage("Translate: I am a robot."),
    new AIMessage("Je suis un robot."),
    new HumanMessage("Translate: I am a dog."),
    new AIMessage("Je suis un chien."),
    new HumanMessage("Translate: I am a cat."),
    new AIMessage("Je suis un chat."),
    new HumanMessage("Translate: I am a bird."),
    new AIMessage("Je suis un oiseau."),
    new HumanMessage("Translate: I am a fish."),
    new AIMessage("Je suis un poisson."),
    new HumanMessage("Translate: I am a horse."),
    new AIMessage("Je suis un cheval."),
    new HumanMessage("Translate: I am a cow."),
    new AIMessage("Je suis une vache."),
    new HumanMessage("Translate: I am a pig."),
    new AIMessage("Je suis un cochon."),
  ]
  for (let i = 0; i < numMessages; i++) {
    yield batch[i % batch.length]
  }
}

// Run
main().catch((e) => console.error(e))
