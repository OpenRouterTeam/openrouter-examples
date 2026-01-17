# Google Gemini 3 Reasoning/Thinking

Google Gemini 3 models support a "thinking mode" feature that allows the model to engage in internal reasoning before generating responses. This improves answer quality on complex, multi-step problems.

## What is Gemini Reasoning?

When reasoning is enabled, Gemini models:
- Allocate tokens for internal "thinking" before responding
- Work through problems step-by-step
- Show their reasoning process (unless excluded)
- Produce higher-quality answers on complex tasks

## Quick Start

### Fetch API

```typescript
const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'google/gemini-3-pro-preview',
    reasoning: {
      enabled: true,        // Enable thinking mode
      max_tokens: 4096,     // Token budget for thinking
      exclude: false        // Show thoughts in response
    },
    messages: [
      {
        role: 'user',
        content: 'Solve this complex problem step by step...'
      }
    ]
  })
});

const data = await response.json();
console.log('Reasoning:', data.choices[0].message.reasoning);
console.log('Reasoning tokens:', data.usage.completion_tokens_details.reasoning_tokens);
console.log('Answer:', data.choices[0].message.content);
```

### AI SDK v5

```typescript
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText } from 'ai';

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

const result = await generateText({
  model: openrouter('google/gemini-3-pro-preview'),
  providerOptions: {
    openrouter: {
      reasoning: {
        enabled: true,
        maxTokens: 4096,
        exclude: false
      }
    }
  },
  messages: [
    {
      role: 'user',
      content: 'Solve this complex problem step by step...'
    }
  ]
});

console.log('Answer:', result.text);
console.log('Reasoning tokens:', result.providerMetadata?.openrouter?.usage?.completionTokensDetails?.reasoningTokens);
```

## Examples

### Fetch Examples
- [basic-reasoning.ts](../typescript/fetch/src/gemini-thinking/basic-reasoning.ts) - Basic reasoning with a multi-step problem

### AI SDK v5 Examples
- [basic-reasoning.ts](../typescript/ai-sdk-v5/src/gemini-thinking/basic-reasoning.ts) - Basic reasoning using Vercel AI SDK v5

## API Reference

### Request Parameters

```typescript
{
  model: 'google/gemini-3-pro-preview' | 'google/gemini-2.5-pro' | 'google/gemini-2.5-flash',
  reasoning: {
    // Option 1: Simple enable (uses default budget)
    enabled: true,
    
    // Option 2: Control token budget
    max_tokens: 4096,  // -1 for dynamic, 0 to disable
    
    // Option 3: Use effort level (maps to budget automatically)
    effort: 'low' | 'medium' | 'high',
    
    // Option 4: Hide thoughts from response
    exclude: true  // false = show thoughts, true = hide thoughts
  },
  messages: [...]
}
```

### Response Format

```typescript
{
  choices: [{
    message: {
      content: "The final answer",
      reasoning: "The model's thinking process...",  // Only if exclude: false
      reasoning_details: [  // Structured reasoning metadata
        {
          type: "reasoning.text",
          text: "Internal reasoning text",
          format: "gemini",
          index: 0
        },
        {
          type: "reasoning.encrypted",  // Google's thoughtSignature
          data: "encrypted_signature_string",
          format: "gemini",
          index: 0
        }
      ]
    }
  }],
  usage: {
    prompt_tokens: 123,
    completion_tokens: 456,
    total_tokens: 579,
    completion_tokens_details: {
      reasoning_tokens: 234  // Tokens used for thinking
    }
  }
}
```

## Supported Models

| Model | Reasoning Support | Max Thinking Tokens | Context Window |
|-------|------------------|---------------------|----------------|
| `google/gemini-3-pro-preview` | MANDATORY (always enabled) | 200,000 | 1,048,576 (1M) |
| `google/gemini-2.5-pro` | MANDATORY (always enabled) | 32,768 | 2,097,152 (2M) |
| `google/gemini-2.5-flash` | OPTIONAL | 24,576 | 1,048,576 (1M) |

**Note:** For Gemini 3 Pro and Gemini 2.5 Pro, reasoning is mandatory and always enabled. The model will use thinking tokens even if not explicitly requested.

## Key Concepts

### Thinking Budget

The `max_tokens` parameter controls how many tokens the model can use for internal reasoning:

- **-1 (dynamic)**: Model determines budget automatically
- **0**: Disable reasoning (only for optional models)
- **Positive number**: Specific token budget (clamped to model limits)

### Effort Levels

Instead of specifying exact token counts, you can use effort levels:

- **low**: Minimal thinking (faster, lower cost)
- **medium**: Balanced thinking (default)
- **high**: Maximum thinking (slower, higher quality)

OpenRouter automatically maps these to appropriate token budgets for each model.

### Excluding Thoughts

Set `exclude: true` to hide the thinking process and only receive the final answer:

```typescript
reasoning: {
  enabled: true,
  exclude: true  // Thoughts used internally but not returned
}
```

This reduces response size and latency while still benefiting from reasoning.

## Important Notes

### Preserving Reasoning Details

**CRITICAL:** When continuing a conversation, you must include `reasoning_details` from previous responses in follow-up requests. Google requires the `thoughtSignature` to be preserved.

```typescript
// First request
const response1 = await fetch(...);

// Follow-up request - must include reasoning_details
const response2 = await fetch(..., {
  body: JSON.stringify({
    messages: [
      {
        role: 'assistant',
        content: response1.choices[0].message.content,
        reasoning_details: response1.choices[0].message.reasoning_details  // REQUIRED
      },
      {
        role: 'user',
        content: 'Follow-up question'
      }
    ]
  })
});
```

### Cost Considerations

Reasoning tokens are billed separately:
- Thinking tokens typically cost less than output tokens
- More thinking = higher cost but better quality
- Use effort levels to balance cost vs quality

### Latency Trade-offs

More thinking tokens = longer response times:
- **Low effort**: Fast responses, good for simple tasks
- **High effort**: Slower responses, better for complex reasoning

### OpenRouter Transformation

OpenRouter automatically transforms Google's native API to OpenAI-compatible format:

| Google Native | OpenRouter Format |
|--------------|------------------|
| `generationConfig.thinkingConfig` | `reasoning` parameter |
| `usageMetadata.thoughtsTokenCount` | `usage.completion_tokens_details.reasoning_tokens` |
| `parts[].thought: true` | `message.reasoning` |
| `thoughtSignature` | `reasoning_details[].data` |

This allows you to use the standard OpenAI format while accessing Google's thinking features.

## Resources

- [OpenRouter Docs - Reasoning Tokens](https://openrouter.ai/docs/use-cases/reasoning-tokens)
- [Google Gemini API Documentation](https://ai.google.dev/docs)
- [Full Examples Repository](https://github.com/openrouter/openrouter-examples)

## Troubleshooting

### No reasoning tokens in response

**Check:**
1. Is the model supported? (Gemini 2.5+)
2. Is `reasoning.enabled` set to `true`?
3. Is the token budget > 0?

### "thought_signature" error in follow-up requests

**Solution:** Include `reasoning_details` from previous responses when continuing conversations.

### High costs

**Solution:** Use lower effort levels or reduce `max_tokens` for thinking budget.

### Slow responses

**Solution:** Use lower effort levels or smaller thinking budgets to reduce latency.
