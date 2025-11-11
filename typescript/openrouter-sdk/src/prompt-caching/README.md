# Prompt Caching Examples (OpenRouter SDK)

Examples demonstrating prompt caching with @openrouter/sdk.

## Documentation

For full prompt caching documentation including all providers, pricing, and configuration details, see:
- **[Prompt Caching Guide](../../../../docs/prompt-caching.md)**

## Status

**TODO**: Examples coming soon. This directory will contain:
- `user-message-cache.ts` - Cache large context in user messages
- `multi-message-cache.ts` - Cache system prompt across multi-turn conversations
- `no-cache-control.ts` - Control scenario (validates methodology)

## Expected Usage

```typescript
import OpenRouter from '@openrouter/sdk';

const openrouter = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

// Configuration and cache_control usage pattern will be documented
// when examples are implemented
```
