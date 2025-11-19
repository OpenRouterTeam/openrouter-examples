# TypeScript Examples

A Bun monorepo containing OpenRouter examples across different TypeScript ecosystems.

## Structure

- **shared/** - Shared constants and utilities (LARGE_SYSTEM_PROMPT, types, etc.)
- **fetch/** - Raw fetch API examples
- **ai-sdk-v5/** - Vercel AI SDK v5 examples (using ai v4.x package)
- **effect-ai/** - Effect-TS AI examples
- **openrouter-sdk/** - OpenRouter TypeScript SDK examples (TODO)

## Prerequisites

- Bun runtime: `curl -fsSL https://bun.sh/install | bash`
- `OPENROUTER_API_KEY` environment variable

## Installation

```bash
# From repository root
make install

# Or from the typescript/ directory
cd typescript
bun install
```

## Running Examples

```bash
# From repository root
export OPENROUTER_API_KEY="your-key-here"
make typescript

# Or from the typescript/ directory
cd typescript
bun examples

# Or run individual workspaces
cd fetch && bun examples
cd ai-sdk-v5 && bun examples
cd effect-ai && bun examples
```

## Workspace Benefits

1. **Shared constants** - LARGE_SYSTEM_PROMPT defined once in `shared/`
2. **Consistent dependencies** - Managed at monorepo root with Bun workspaces
3. **Type sharing** - Common types available across workspaces
4. **Easy testing** - Run all examples from one location with `make typescript` or `bun examples`
