# Effect-TS AI Examples

Examples using Effect-TS with @effect/ai and @effect/ai-openrouter for type-safe, composable AI operations.

## Prerequisites

- Bun runtime: `curl -fsSL https://bun.sh/install | bash`
- `OPENROUTER_API_KEY` environment variable

## Running Examples

```bash
# From monorepo root (typescript/)
bun examples

# Or from this workspace
cd effect-ai
bun examples
```

## Features

- [prompt-caching.ts](./src/prompt-caching.ts) - Anthropic caching with Effect patterns

### Key Configuration

**CRITICAL**: The Effect AI example requires:
```typescript
config: {
  stream_options: { include_usage: true }
}
```

Without this, `usage.cachedInputTokens` will be undefined in the response.

### Effect Patterns Demonstrated

- `Effect.gen` for generator-based composition
- Layer-based dependency injection
- Type-safe error handling
- Evidence-based validation

## Dependencies

- `@openrouter-examples/shared` - Shared constants (LARGE_SYSTEM_PROMPT) and types
- `@effect/ai` - Effect AI abstractions
- `@effect/ai-openrouter` - OpenRouter provider for Effect AI
- `effect` - Effect-TS core library
