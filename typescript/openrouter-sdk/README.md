# OpenRouter SDK Examples

Examples using the OpenRouter TypeScript SDK (`@openrouter/sdk`).

## Prerequisites

- Bun runtime: `curl -fsSL https://bun.sh/install | bash`
- `OPENROUTER_API_KEY` environment variable

## Running Examples

```bash
# From monorepo root (typescript/)
bun examples

# Or from this workspace
cd openrouter-sdk
bun examples
```

## Features

- [basic](./src/basic/) - Quickstart chat completion using `openRouter.chat.send`

## Dependencies

- `@openrouter/sdk` - Official OpenRouter SDK (beta)
- `@openrouter-examples/shared` - Shared constants and utility modules
