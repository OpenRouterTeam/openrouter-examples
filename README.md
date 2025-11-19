# OpenRouter Examples

Comprehensive, tested, executable examples demonstrating OpenRouter features across multiple ecosystems.

## Quick Start

```bash
# Set your API key
export OPENROUTER_API_KEY="your-key-here"

# Run all examples
make examples

# Or run specific ecosystems
make curl          # Run curl examples
make typescript    # Run TypeScript monorepo examples
```

## Repository Structure

```
.
├── curl/              - Shell script examples
├── typescript/        - TypeScript monorepo (Bun workspaces)
│   ├── shared/        - Shared constants and types
│   ├── fetch/         - Raw fetch API examples
│   ├── ai-sdk-v5/     - Vercel AI SDK v5 examples
│   ├── effect-ai/     - Effect-TS examples
│   └── openrouter-sdk/ - OpenRouter SDK examples (TODO)
├── docs/              - Feature documentation
└── Makefile           - Unified command interface
```

## Features

### Prompt Caching
- **Documentation**: [docs/prompt-caching.md](docs/prompt-caching.md)
- **Examples**:
  - [curl/prompt-caching.sh](curl/prompt-caching.sh)
  - [typescript/fetch/src/prompt-caching/](typescript/fetch/src/prompt-caching/)
  - [typescript/ai-sdk-v5/src/prompt-caching/](typescript/ai-sdk-v5/src/prompt-caching/)
  - [typescript/effect-ai/src/prompt-caching/](typescript/effect-ai/src/prompt-caching/)

## Prerequisites

- Bun runtime: `curl -fsSL https://bun.sh/install | bash`
- OpenRouter API key: [https://openrouter.ai/keys](https://openrouter.ai/keys)
- For curl examples: `jq` (JSON processor)

## Installation

```bash
# Install TypeScript dependencies
make install

# Or manually
cd typescript && bun install
```

## Running Examples

### All Examples
```bash
make examples
```

### By Ecosystem
```bash
make curl          # Shell scripts with curl + jq
make typescript    # All TypeScript examples (fetch, AI SDK, Effect)
```

### Individual Examples
```bash
# curl
bash curl/prompt-caching.sh

# TypeScript
cd typescript/fetch && bun examples
cd typescript/ai-sdk-v5 && bun examples
cd typescript/effect-ai && bun examples
```

## Benefits

### For Users
1. **Copy-paste ready** - All examples are runnable as-is
2. **Tested and proven** - Every example has been verified to work
3. **Evidence-based** - Examples show expected outputs and verification
4. **Multiple ecosystems** - Choose the one that matches your stack

### For Developers
1. **Single source of truth** - Constants defined once in `typescript/shared/`
2. **Type safety** - Shared types across all TypeScript examples
3. **Consistent patterns** - Each ecosystem follows its own idioms
4. **Easy maintenance** - Bun monorepo for TypeScript workspaces

## Contributing

See individual ecosystem READMEs:
- [curl/README.md](curl/README.md)
- [typescript/README.md](typescript/README.md)

## License

See [LICENSE.md](LICENSE.md)
