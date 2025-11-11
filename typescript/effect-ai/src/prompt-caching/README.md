# Anthropic Prompt Caching Examples (Effect AI)

This directory contains examples demonstrating Anthropic's prompt caching feature via OpenRouter using @effect/ai and @effect/ai-openrouter.

## What is Prompt Caching?

Anthropic's prompt caching allows you to cache large portions of your prompts to:
- **Reduce costs** - Cached tokens cost significantly less
- **Improve latency** - Cached content is processed faster
- **Enable larger contexts** - Use more context without proportional cost increases

Cache TTL: 5 minutes for ephemeral caches

## Examples

### User Message Cache (`user-message-cache.ts`)
Cache large context in user messages using Effect AI:
```bash
bun run typescript/effect-ai/src/prompt-caching/user-message-cache.ts
```

**Pattern**: User message with `options.openrouter.cacheControl` using Effect.gen

## How to Use with Effect AI

```typescript
import * as OpenRouterClient from '@effect/ai-openrouter/OpenRouterClient';
import * as OpenRouterLanguageModel from '@effect/ai-openrouter/OpenRouterLanguageModel';
import * as LanguageModel from '@effect/ai/LanguageModel';
import * as Prompt from '@effect/ai/Prompt';
import { Effect, Layer, Redacted } from 'effect';

// Create OpenRouter client layer
const OpenRouterClientLayer = OpenRouterClient.layer({
  apiKey: Redacted.make(process.env.OPENROUTER_API_KEY!),
}).pipe(Layer.provide(FetchHttpClient.layer));

// Create language model layer with CRITICAL stream_options config
const OpenRouterModelLayer = OpenRouterLanguageModel.layer({
  model: 'anthropic/claude-3.5-sonnet',
  config: {
    stream_options: { include_usage: true }, // CRITICAL: Required!
  },
}).pipe(Layer.provide(OpenRouterClientLayer));

// Use in Effect.gen program
const program = Effect.gen(function* () {
  const response = yield* LanguageModel.generateText({
    prompt: Prompt.make([
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Large context here...',
            options: {
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
    ]),
  });

  // Check cache metrics
  const cachedTokens = response.usage.cachedInputTokens ?? 0;
});

// Run with dependencies
await program.pipe(
  Effect.provide(OpenRouterModelLayer),
  Effect.runPromise,
);
```

## Important Notes

### Critical Configuration
**MUST include `stream_options: { include_usage: true }` in model config**
- Without this, usage.cachedInputTokens will be undefined
- OpenRouterClient only sets this for streaming by default
- Must be set explicitly in the layer configuration

### Cache Metrics Location
Cache metrics are in `response.usage`:
```typescript
{
  inputTokens: number,
  outputTokens: number,
  cachedInputTokens: number  // Number of tokens read from cache
}
```

### Requirements
1. **stream_options.include_usage = true** - In model config layer
2. **Minimum 2048+ tokens** - Smaller content may not be cached
3. **options.openrouter.cacheControl** - On content items in Prompt
4. **Exact match** - Cache only hits on identical content

### Expected Behavior
- **First call**: `cachedInputTokens = 0` (cache miss, creates cache)
- **Second call**: `cachedInputTokens > 0` (cache hit, reads from cache)

### Effect-Specific Patterns
- Use `Effect.gen` for composable effect workflows
- Layer-based dependency injection for client and model
- Type-safe error handling via Effect type
- Structured concurrency with Effect.sleep for delays

## Scientific Method
All examples follow evidence-based verification:
- **Hypothesis**: options.openrouter.cacheControl triggers caching
- **Experiment**: Make identical calls twice
- **Evidence**: Measure via response.usage.cachedInputTokens
- **Analysis**: Compare cache miss vs cache hit
