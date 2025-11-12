# OpenRouter FileParserPlugin Examples (AI SDK)

Examples demonstrating OpenRouter's FileParserPlugin with AI SDK v5.

## Overview

The FileParserPlugin is automatically enabled when using file attachments with the AI SDK provider. It:

- Processes PDFs sent via data URIs
- Extracts text using server-side parsing
- Integrates seamlessly with AI SDK's message format

## Examples

- `file-parser-pdf-url.ts` - Demonstrates sending PDFs via public URLs without downloading
- `file-parser-all-sizes.ts` - Tests PDF processing across multiple file sizes

## Running

```bash
# Test all PDF sizes
bun run typescript/ai-sdk-v5/src/plugin-file-parser/file-parser-all-sizes.ts

# Demo PDF URL processing
bun run typescript/ai-sdk-v5/src/plugin-file-parser/file-parser-pdf-url.ts
```
