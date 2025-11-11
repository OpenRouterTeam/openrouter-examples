# TypeScript + fetch Examples

Raw HTTP examples using TypeScript and the native `fetch` API.

## Prerequisites

- Bun runtime: `curl -fsSL https://bun.sh/install | bash`
- `OPENROUTER_API_KEY` environment variable

## Running Examples

```bash
# From monorepo root (typescript/)
bun examples

# Or from this workspace
cd fetch
bun examples
```

## Features

- [prompt-caching.ts](./src/prompt-caching.ts) - Anthropic caching with TypeScript types

## Dependencies

- `@openrouter-examples/shared` - Shared constants (LARGE_SYSTEM_PROMPT) and types
