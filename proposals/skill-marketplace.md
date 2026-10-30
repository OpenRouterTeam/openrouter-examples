# Feature Proposal: OpenRouter Agent Skill Marketplace

## Summary
Propose adding an agent skill marketplace to OpenRouter, allowing users to discover, install, and use pre-built agent skills across any model routed through OpenRouter.

## Problem
OpenRouter routes requests to many models but lacks a standardized way to add skills/capabilities. Users must reimplement tool-calling logic for each model.

## Proposed Solution
Add a `/v1/skills` marketplace to OpenRouter:

1. **Skill Registry**: Community-submitted skills with JSON schemas
2. **Skill Installation**: One-click skill installation per API key
3. **Cross-Model Compatibility**: Skills work with any model on OpenRouter
4. **Usage Tracking**: Track skill invocation metrics per model

## Example API Usage

```json
POST /v1/skills/install
{
  "skill_id": "bug-report-generator",
  "version": "1.0.0"
}

POST /v1/chat/completions
{
  "model": "anthropic/claude-3-opus",
  "messages": [{"role": "user", "content": "Create a bug report for this error"}],
  "skills": ["bug-report-generator"]
}
```

## Benefits
- Unified skill marketplace across all OpenRouter models
- Community skill sharing
- Reduced integration complexity
- Consistent skill behavior regardless of underlying model

## Submission
- **Platform**: OpenRouter
- **Repository**: https://github.com/openrouter-ai or https://openrouter.ai
- **Issue Type**: Feature Request
- **Labels**: enhancement, skills, marketplace, api
