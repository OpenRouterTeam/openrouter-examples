# AgentsKit bounded tool-calling agent

This example uses OpenRouter as the model gateway and AgentsKit as the agent control layer. The model can change without rewriting the tool definitions, step ceiling, runtime, or application code.

The agent investigates a synthetic checkout incident with two local tools:

- `get_service_health`
- `list_recent_deployments`

It preserves tool-call IDs, returns structured results to the model, stops after at most four model steps, and prints an inspectable execution summary.

## Run

From `typescript/`:

```bash
bun install
export OPENROUTER_API_KEY='your-key-here'
bun --filter '@openrouter-examples/agentskit' examples
```

The default model is OpenRouter's free router:

```bash
export OPENROUTER_MODEL='openrouter/free'
```

To switch providers or models, change only `OPENROUTER_MODEL`:

```bash
export OPENROUTER_MODEL='openai/gpt-oss-20b:free'
bun --filter '@openrouter-examples/agentskit' examples
```

You can pass a different investigation request after `--`:

```bash
bun --filter '@openrouter-examples/agentskit' examples -- 'Check the catalog service.'
```

## Validate without credentials

```bash
bun --filter '@openrouter-examples/agentskit' typecheck
bun --filter '@openrouter-examples/agentskit' test
```

The tests use a scripted adapter and a mocked OpenRouter stream. They make no network requests and verify the step ceiling, structured tool results, selected model, and tool-call identity.

## Control boundary

`src/agent.ts` is the boundary between model access and application behavior:

```ts
const runtime = createRuntime({
  adapter: openrouter({ apiKey, model }),
  tools: incidentTools,
  maxSteps: 4,
});
```

OpenRouter owns model routing. AgentsKit owns the tool loop and execution contract. The synthetic tool bodies can be replaced with real metrics or deployment clients without changing the model gateway.
