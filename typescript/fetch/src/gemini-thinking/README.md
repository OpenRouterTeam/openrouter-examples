# Google Gemini 3 Reasoning/Thinking Examples

This directory contains examples of using Google Gemini 3's reasoning/thinking feature via OpenRouter.

## What is Gemini Reasoning?

Gemini 3 models can engage in internal reasoning before generating responses. This "thinking mode" allows the model to:
- Work through complex problems step-by-step
- Show its reasoning process
- Improve answer quality on difficult tasks

## How It Works

1. **Request**: Set `reasoning.enabled: true` (or `reasoning.max_tokens`, or `reasoning.effort`)
2. **Processing**: The model uses "thinking tokens" for internal reasoning
3. **Response**: You receive both the reasoning process and the final answer

## Examples

### `basic-reasoning.ts`

Demonstrates basic usage of Gemini reasoning with a multi-step problem.

**Run:**
```bash
bun run src/gemini-thinking/basic-reasoning.ts
```

**Key Features:**
- Enables reasoning mode
- Shows thinking token usage
- Displays reasoning process
- Returns final answer

## API Parameters

### Request Format

```typescript
{
  model: 'google/gemini-3-pro-preview',
  reasoning: {
    enabled: true,        // Enable thinking mode
    max_tokens: 4096,     // Token budget for thinking
    exclude: false        // true = hide thoughts, false = show thoughts
  },
  messages: [...]
}
```

### Alternative: Effort Levels

```typescript
{
  model: 'google/gemini-3-pro-preview',
  reasoning: {
    effort: 'medium'  // 'low', 'medium', 'high'
  },
  messages: [...]
}
```

## Response Format

```typescript
{
  choices: [{
    message: {
      content: "The final answer",
      reasoning: "The model's thinking process...",
      reasoning_details: [
        {
          type: "reasoning.text",
          text: "Internal reasoning...",
          format: "gemini"
        },
        {
          type: "reasoning.encrypted",
          data: "encrypted_signature",
          format: "gemini"
        }
      ]
    }
  }],
  usage: {
    prompt_tokens: 123,
    completion_tokens: 456,
    completion_tokens_details: {
      reasoning_tokens: 234  // Tokens used for thinking
    }
  }
}
```

## Key Points

### Model Support
- ✅ `google/gemini-3-pro-preview` - Reasoning MANDATORY (always enabled)
- ✅ `google/gemini-2.5-pro` - Reasoning MANDATORY (always enabled)
- ✅ `google/gemini-2.5-flash` - Reasoning OPTIONAL

### Token Budgets
- **Gemini 3 Pro**: Max 200,000 thinking tokens, 1M context window
- **Gemini 2.5 Pro**: Max 32,768 thinking tokens
- **Gemini 2.5 Flash**: Max 24,576 thinking tokens

### Important Notes
- **Preserve reasoning_details**: Must include `reasoning_details` from previous messages in follow-up requests
- **Cost**: Thinking tokens are billed separately (usually at a lower rate)
- **Latency**: More thinking tokens = longer response time
- **Quality**: Higher thinking budgets improve answer quality on complex tasks

## OpenRouter Transformation

OpenRouter automatically transforms Google's native API to OpenAI-compatible format:

| Google Native | OpenRouter (OpenAI-compatible) |
|--------------|-------------------------------|
| `usageMetadata.thoughtsTokenCount` | `usage.completion_tokens_details.reasoning_tokens` |
| `parts[].thought: true` | `message.reasoning` |
| `thoughtSignature` | `reasoning_details[].data` |

## Resources

- [OpenRouter Docs - Reasoning Tokens](https://openrouter.ai/docs/use-cases/reasoning-tokens)
- [Google Gemini API Docs](https://ai.google.dev/docs)
