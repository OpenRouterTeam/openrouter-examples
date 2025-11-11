# Anthropic Prompt Caching Examples (AI SDK v5)

This directory contains examples demonstrating Anthropic's prompt caching feature via OpenRouter using Vercel AI SDK v5.

## What is Prompt Caching?

Anthropic's prompt caching allows you to cache large portions of your prompts to:
- **Reduce costs** - Cached tokens cost significantly less
- **Improve latency** - Cached content is processed faster
- **Enable larger contexts** - Use more context without proportional cost increases

Cache TTL: 5 minutes for ephemeral caches

## Examples

### User Message Cache (`user-message-cache.ts`)
Cache large context in user messages using AI SDK:
```bash
bun run typescript/ai-sdk-v5/src/prompt-caching/user-message-cache.ts
```

**Pattern**: User message with `providerOptions.openrouter.cacheControl`

## How to Use with AI SDK

```typescript
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText } from 'ai';

// CRITICAL: Must include stream_options for usage details
const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
  extraBody: {
    stream_options: { include_usage: true }, // Required!
  },
});

const result = await generateText({
  model: openrouter('anthropic/claude-3.5-sonnet'),
  messages: [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: 'Large context here...',
          providerOptions: {
            openrouter: {
              cacheControl: { type: 'ephemeral' }, // Cache this block
            },
          },
        },
        {
          type: 'text',
          text: 'Your question here',
        },
      ],
    },
  ],
});

// Check cache metrics
const cachedTokens = result.providerMetadata?.openrouter?.usage?.promptTokensDetails?.cachedTokens ?? 0;
```

## Important Notes

### Critical Configuration
**MUST include `extraBody: { stream_options: { include_usage: true } }`**
- Without this, usage details (including cached_tokens) are not populated
- This is a provider-level configuration, not per-request

### Cache Metrics Location
Cache metrics are in `providerMetadata.openrouter.usage`:
```typescript
{
  promptTokens: number,
  completionTokens: number,
  promptTokensDetails: {
    cachedTokens: number  // Number of tokens read from cache
  }
}
```

### Requirements
1. **stream_options.include_usage = true** - CRITICAL for usage details
2. **Minimum 2048+ tokens** - Smaller content may not be cached
3. **providerOptions.openrouter.cacheControl** - On content items, not messages
4. **Exact match** - Cache only hits on identical content

### Expected Behavior
- **First call**: `cachedTokens = 0` (cache miss, creates cache)
- **Second call**: `cachedTokens > 0` (cache hit, reads from cache)

## Scientific Method
All examples follow evidence-based verification:
- **Hypothesis**: providerOptions.openrouter.cacheControl triggers caching
- **Experiment**: Make identical calls twice
- **Evidence**: Measure via providerMetadata.openrouter.usage
- **Analysis**: Compare cache miss vs cache hit
