# Prompt Caching

Reduce AI model costs by caching prompt messages across supported providers.

## Overview

Prompt caching allows you to save on inference costs by caching portions of your prompts. Most providers automatically enable caching, but some (like Anthropic and Google Gemini) require explicit `cache_control` breakpoints.

When using caching, OpenRouter makes a best-effort to route requests to the same provider to leverage the warm cache. If that provider is unavailable, OpenRouter routes to the next-best provider.

## Inspecting Cache Usage

You can verify cache savings through:

1. The [Activity page](/activity) detail view
2. The `/api/v1/generation` API ([docs](/api-reference/overview#querying-cost-and-stats))
3. `usage: {include: true}` in your request to see cache tokens in the response

The `cache_discount` field shows how much you saved. Some providers (like Anthropic) have negative discounts on cache writes but positive discounts on cache reads.

## Provider Support

### OpenAI

**Automatic caching** - no configuration needed.

- **Cache writes**: no cost
- **Cache reads**: 0.25x or 0.50x of input token price (model-dependent)
- **Minimum**: 1024 tokens

[OpenAI pricing](https://platform.openai.com/docs/pricing) | [Documentation](https://platform.openai.com/docs/guides/prompt-caching)

### Grok

**Automatic caching** - no configuration needed.

- **Cache writes**: no cost
- **Cache reads**: 0.10x of input token price

[Grok pricing](https://docs.x.ai/docs/models#models-and-pricing)

### Moonshot AI

**Automatic caching** - no configuration needed.

- **Cache writes**: no cost
- **Cache reads**: 0.10x of input token price

[Moonshot documentation](https://platform.moonshot.ai/docs/api/caching)

### Groq

**Automatic caching** - no configuration needed (Kimi K2 models only).

- **Cache writes**: no cost
- **Cache reads**: 0.00x of input token price (free)

[Groq documentation](https://console.groq.com/docs/prompt-caching)

### DeepSeek

**Automatic caching** - no configuration needed.

- **Cache writes**: same as input token price
- **Cache reads**: 0.10x of input token price

### Anthropic Claude

**Manual caching** - requires `cache_control` breakpoints.

- **Cache writes**: 1.25x of input token price
- **Cache reads**: 0.10x of input token price
- **Limit**: 4 breakpoints per request
- **TTL**: 5 minutes
- **Best for**: Large bodies of text (character cards, CSV data, RAG data, book chapters)

[Anthropic documentation](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching)

**System message example:**

```json
{
  "messages": [
    {
      "role": "system",
      "content": [
        {
          "type": "text",
          "text": "You are a historian studying the fall of the Roman Empire. You know this book well:"
        },
        {
          "type": "text",
          "text": "HUGE TEXT BODY",
          "cache_control": {"type": "ephemeral"}
        }
      ]
    },
    {
      "role": "user",
      "content": [{"type": "text", "text": "What triggered the collapse?"}]
    }
  ]
}
```

**User message example:**

```json
{
  "messages": [
    {
      "role": "user",
      "content": [
        {"type": "text", "text": "Given the book below:"},
        {
          "type": "text",
          "text": "HUGE TEXT BODY",
          "cache_control": {"type": "ephemeral"}
        },
        {"type": "text", "text": "Name all the characters"}
      ]
    }
  ]
}
```

### Google Gemini

**Two caching modes**: Implicit (automatic) and explicit (manual).

#### Implicit Caching (Gemini 2.5 Pro & Flash)

**Automatic caching** - no configuration needed.

- **Cache writes**: no storage cost
- **Cache reads**: 0.25x of input token price
- **TTL**: 3-5 minutes (variable)
- **Minimum**: 2000 tokens (2.5 Flash), 32000 tokens (2.5 Pro)

**Tip**: Keep the initial portion of message arrays consistent between requests. Push variations (user questions, dynamic context) toward the end.

[Google announcement](https://developers.googleblog.com/en/gemini-2-5-models-now-support-implicit-caching/)

#### Explicit Caching (Legacy)

**Manual caching** - requires `cache_control` breakpoints (similar to Anthropic).

- **Cache writes**: Input token price + 5 minutes storage
- **Cache reads**: 0.25x of input token price
- **TTL**: 5 minutes (fixed, does not refresh)
- **Minimum**: 4096 tokens (most models), 2000 tokens (2.5 Flash), 32000 tokens (2.5 Pro)

**Note**: OpenRouter manages cache lifecycle - you don't create/update/delete caches manually.

**Tip**: You can include multiple `cache_control` breakpoints for Anthropic compatibility. OpenRouter uses only the last breakpoint for Gemini.

[Google pricing docs](https://ai.google.dev/gemini-api/docs/pricing)

**System message example:**

```json
{
  "messages": [
    {
      "role": "system",
      "content": [
        {
          "type": "text",
          "text": "You are a historian studying the fall of the Roman Empire. Below is an extensive reference book:"
        },
        {
          "type": "text",
          "text": "HUGE TEXT BODY HERE",
          "cache_control": {"type": "ephemeral"}
        }
      ]
    },
    {
      "role": "user",
      "content": [{"type": "text", "text": "What triggered the collapse?"}]
    }
  ]
}
```

## Examples

See ecosystem-specific examples:

- **TypeScript + fetch**: [typescript/fetch/src/prompt-caching/](../typescript/fetch/src/prompt-caching/)
  - [user-message-cache.ts](../typescript/fetch/src/prompt-caching/user-message-cache.ts)
  - [multi-message-cache.ts](../typescript/fetch/src/prompt-caching/multi-message-cache.ts)
  - [no-cache-control.ts](../typescript/fetch/src/prompt-caching/no-cache-control.ts) (control)

- **AI SDK v5** (Vercel): [typescript/ai-sdk-v5/src/prompt-caching/](../typescript/ai-sdk-v5/src/prompt-caching/)
  - [user-message-cache.ts](../typescript/ai-sdk-v5/src/prompt-caching/user-message-cache.ts)
  - [multi-message-cache.ts](../typescript/ai-sdk-v5/src/prompt-caching/multi-message-cache.ts)
  - [no-cache-control.ts](../typescript/ai-sdk-v5/src/prompt-caching/no-cache-control.ts) (control)
