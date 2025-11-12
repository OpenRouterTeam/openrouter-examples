# OpenRouter FileParserPlugin Examples (Fetch)

Examples demonstrating OpenRouter's FileParserPlugin with raw fetch API.

## Overview

The FileParserPlugin enables PDF processing for models that don't natively support file inputs. The plugin:

- Accepts PDFs via base64-encoded data URLs
- Extracts text using configurable engines (mistral-ocr, pdf-text, native)
- Returns parsed content to the model for processing

## Examples

- `file-parser-all-sizes.ts` - Tests PDF processing across multiple file sizes

## Running

```bash
bun run typescript/fetch/src/plugin-file-parser/file-parser-all-sizes.ts
```
