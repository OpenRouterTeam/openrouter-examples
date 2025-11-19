# Known Issue: Schema Validation Failure

## Problem

The Effect AI example for Gemini 3 reasoning currently fails with a schema validation error:

```
Expected "unknown" | "openai-responses-v1" | "anthropic-claude-v1"
Actual: "google-gemini-v1"
```

## Root Cause

The `@effect/ai-openrouter` package uses strict schema validation for API responses. The `reasoning_details[].format` field in the response schema only includes:
- `"unknown"`
- `"openai-responses-v1"`  
- `"anthropic-claude-v1"`

However, Gemini 3 returns `"google-gemini-v1"` as the format, which is not yet in the allowed enum.

## Evidence

Error occurs at:
```
packages/router/adapters/google-gemini/schemas.ts
ReasoningDetailText (Encoded side)
└─ ["format"]
   └─ Expected "unknown" | "openai-responses-v1" | "anthropic-claude-v1"
      Actual: "google-gemini-v1"
```

## Solution

The schema in `@effect/ai-openrouter` needs to be updated to include `"google-gemini-v1"` as a valid format option for reasoning details.

## Workaround

Until the schema is updated, use:
1. ✅ **Fetch example** - Works correctly (no schema validation)
2. ✅ **AI SDK v5 example** - Works correctly (looser schema validation)
3. ❌ **Effect AI example** - Fails due to strict schema enforcement

## Impact

This is a schema definition issue, not a functionality issue. The API is working correctly and returning valid data. The Effect AI provider just needs its schema updated to accept the new format.

## Related Files

- `refs/ai-sdk-provider/packages/ai-openrouter/src/OpenRouterClient.ts` - Schema definitions
- Needs update to include `"google-gemini-v1"` in reasoning detail format enum
