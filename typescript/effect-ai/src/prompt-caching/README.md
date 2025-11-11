# Prompt Caching Examples (Effect AI)

Examples demonstrating prompt caching with @effect/ai and @effect/ai-openrouter.

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
bun run typescript/effect-ai/src/prompt-caching/user-message-cache.ts
```

## Effect AI Usage

```typescript
import * as OpenRouterLanguageModel from '@effect/ai-openrouter/OpenRouterLanguageModel';

const OpenRouterModelLayer = OpenRouterLanguageModel.layer({
  model: 'anthropic/claude-3.5-sonnet',
  config: {
    stream_options: { include_usage: true }, // Required for cache metrics
  },
});

const program = Effect.gen(function* () {
  const response = yield* LanguageModel.generateText({
    prompt: Prompt.make([{
      role: 'user',
      content: [{
        type: 'text',
        text: 'Large context...',
        options: {
          openrouter: { cacheControl: { type: 'ephemeral' } }
        }
      }]
    }])
  });

  // Check cache metrics
  const cached = response.usage.cachedInputTokens ?? 0;
});
```

## Effect-Specific Notes

- Use layer-based dependency injection for client and model configuration
- `stream_options.include_usage` must be set in the model layer config
- Cache metrics appear in `response.usage.cachedInputTokens`
