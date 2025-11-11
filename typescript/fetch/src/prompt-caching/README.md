# Anthropic Prompt Caching Examples

This directory contains examples demonstrating Anthropic's prompt caching feature via OpenRouter using the raw fetch API.

## What is Prompt Caching?

Anthropic's prompt caching allows you to cache large portions of your prompts (like system messages or context documents) to:
- **Reduce costs** - Cached tokens cost significantly less than regular tokens
- **Improve latency** - Cached content is processed faster on subsequent requests
- **Enable larger contexts** - Use more context without proportional cost increases

Cache TTL: 5 minutes for ephemeral caches

## Examples

### 1. System Message Cache (`system-message-cache.ts`)
The most common pattern - cache a large system prompt:
```bash
bun run typescript/fetch/src/prompt-caching/system-message-cache.ts
```

**Pattern**: System message with content-level `cache_control`

### 2. User Message Cache (`user-message-cache.ts`)
Cache large context in user messages (e.g., uploading documents):
```bash
bun run typescript/fetch/src/prompt-caching/user-message-cache.ts
```

**Pattern**: User message with content-level `cache_control` on context block

### 3. Multi-Message Cache (`multi-message-cache.ts`)
Cache system prompt across multi-turn conversations:
```bash
bun run typescript/fetch/src/prompt-caching/multi-message-cache.ts
```

**Pattern**: System message cache persists through conversation history

### 4. No Cache Control (`no-cache-control.ts`)
Control scenario - no caching should occur:
```bash
bun run typescript/fetch/src/prompt-caching/no-cache-control.ts
```

**Pattern**: Same structure but NO `cache_control` markers (validates methodology)

## How to Use Cache Control

```typescript
const requestBody = {
  model: 'anthropic/claude-3.5-sonnet',
  stream_options: {
    include_usage: true, // CRITICAL: Required for cache metrics
  },
  messages: [
    {
      role: 'system',
      content: [
        {
          type: 'text',
          text: 'Your large system prompt here...',
          cache_control: { type: 'ephemeral' }, // Cache this block
        },
      ],
    },
    {
      role: 'user',
      content: 'Your question here',
    },
  ],
};
```

## Important Notes

### OpenRouter Format Transformation
OpenRouter transforms Anthropic's native response format to OpenAI-compatible format:
- **Anthropic native**: `usage.cache_read_input_tokens`, `usage.cache_creation_input_tokens`
- **OpenRouter returns**: `usage.prompt_tokens_details.cached_tokens` (OpenAI-compatible)

### Requirements for Caching
1. **stream_options.include_usage = true** - CRITICAL, otherwise no usage details
2. **Minimum 2048+ tokens** - Smaller content may not be cached reliably
3. **cache_control on content blocks** - Not on message level
4. **Exact match** - Cache only hits on identical content

### Expected Behavior
- **First call**: `cached_tokens = 0` (cache miss, creates cache)
- **Second call**: `cached_tokens > 0` (cache hit, reads from cache)
- **Control**: `cached_tokens = 0` on both calls (no cache_control)

## Scientific Method
All examples follow scientific method principles:
- **Hypothesis**: cache_control triggers Anthropic caching
- **Experiment**: Make identical calls twice
- **Evidence**: Measure via `usage.prompt_tokens_details.cached_tokens`
- **Analysis**: Compare first call (miss) vs second call (hit)
