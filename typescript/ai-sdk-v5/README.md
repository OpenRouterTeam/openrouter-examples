# AI SDK v5 Examples

Examples using Vercel AI SDK v5 with @openrouter/ai-sdk-provider.

## Prerequisites

- Bun runtime: `curl -fsSL https://bun.sh/install | bash`
- `OPENROUTER_API_KEY` environment variable

## Running Examples

```bash
# From monorepo root (typescript/)
bun examples

# Or from this workspace
cd ai-sdk-v5
bun examples
```

## Features

- [prompt-caching.ts](./src/prompt-caching.ts) - Anthropic caching with AI SDK v5

### Key Configuration

**CRITICAL**: The AI SDK example requires:
```typescript
extraBody: {
  stream_options: { include_usage: true }
}
```

Without this, usage details (including cached_tokens) are not populated in the response.

## Dependencies

- `@openrouter-examples/shared` - Shared constants (LARGE_SYSTEM_PROMPT) and types
- `@openrouter/ai-sdk-provider` - OpenRouter provider for AI SDK
- `ai` v5.x - Vercel AI SDK
