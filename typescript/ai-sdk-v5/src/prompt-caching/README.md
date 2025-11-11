# Prompt Caching Examples (AI SDK v5)

Examples demonstrating prompt caching with Vercel AI SDK v5.

## Documentation

For full prompt caching documentation including all providers, pricing, and configuration details, see:
- **[Prompt Caching Guide](../../../../docs/prompt-caching.md)**

## Examples in This Directory

- `user-message-cache.ts` - Cache large context in user messages
- `multi-message-cache.ts` - Cache system prompt across multi-turn conversations
- `no-cache-control.ts` - Control scenario (validates methodology)

## Quick Start

```bash
# Run an example
bun run typescript/ai-sdk-v5/src/prompt-caching/user-message-cache.ts
```

## AI SDK v5 Usage

```typescript
import { createOpenRouter } from '@openrouter/ai-sdk-provider';

const openrouter = createOpenRouter({
  extraBody: {
    stream_options: { include_usage: true }, // Required for cache metrics
  },
});

// Use providerOptions.openrouter.cacheControl on content items
const result = await generateText({
  model: openrouter('anthropic/claude-3.5-sonnet'),
  messages: [{
    role: 'user',
    content: [{
      type: 'text',
      text: 'Large context...',
      providerOptions: {
        openrouter: { cacheControl: { type: 'ephemeral' } }
      }
    }]
  }]
});

// Check cache metrics
const cached = result.providerMetadata?.openrouter?.usage?.promptTokensDetails?.cachedTokens ?? 0;
```
