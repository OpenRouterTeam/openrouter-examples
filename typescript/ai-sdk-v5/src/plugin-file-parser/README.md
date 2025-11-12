# OpenRouter FileParserPlugin Examples (AI SDK)

Examples demonstrating OpenRouter's FileParserPlugin with AI SDK v5.

## Overview

The FileParserPlugin is automatically enabled when using file attachments with the AI SDK provider. It:

- Processes PDFs sent via data URIs
- Extracts text using server-side parsing
- Integrates seamlessly with AI SDK's message format

## Examples

- `file-parser-all-sizes.ts` - Tests PDF processing across multiple file sizes

## Running

```bash
bun run typescript/ai-sdk-v5/src/plugin-file-parser/file-parser-all-sizes.ts
```
