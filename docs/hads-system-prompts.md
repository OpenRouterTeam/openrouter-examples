# HADS: Portable System Prompts Across Models

OpenRouter's core value is model-agnostic access — switching between GPT-4, Claude, Llama, and Mistral without changing your app. System prompts written without structure often break when switching models because smaller models handle verbose or ambiguous docs differently than larger ones.

**[HADS](https://github.com/catcam/hads)** (Human-AI Document Standard) is a lightweight Markdown tagging convention that produces consistent behavior from GPT-4 down to Llama 3 8B.

## Example

```markdown
## API Authentication

**[SPEC]**
- Method: Bearer token
- Header: `Authorization: Bearer <token>`
- Expiry: 3600s

**[NOTE]**
Switched from cookie auth in v2. Legacy docs mentioning cookies are outdated.

**[BUG] Token silently rejected after password change**
Symptom: 401 identical to expired token
Cause: All tokens invalidated on password change
Fix: Re-authenticate after any account operation
```

The explicit tags (`[SPEC]`, `[NOTE]`, `[BUG]`) tell any model what each block means and how to weight it — replacing structural inference with direct instruction, which is especially effective for smaller models.

## Why This Matters for OpenRouter Users

- System prompts written in HADS work consistently across model tiers
- Context documents in HADS format reduce hallucination when switching to smaller or cheaper models
- Zero overhead — pure Markdown, no tooling required

## Reference

- [HADS specification](https://github.com/catcam/hads)
