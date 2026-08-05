import { DEFAULT_MODEL, createOpenRouterIncidentRuntime } from './agent.js';

const apiKey = process.env.OPENROUTER_API_KEY;

if (!apiKey) {
  throw new Error('OPENROUTER_API_KEY is required. Export it before running this example.');
}

const model = process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL;
const task =
  process.argv.slice(2).join(' ') ||
  [
    'Checkout errors rose at 14:07 UTC.',
    'Investigate the checkout service, identify the likely cause,',
    'state your confidence, and recommend the safest next action.',
  ].join(' ');

const result = await createOpenRouterIncidentRuntime(apiKey, model).run(task);

console.log(result.content);
console.log('\nRun summary');
console.log(
  JSON.stringify(
    {
      model,
      steps: result.steps,
      toolCalls: result.toolCalls.map(({ id, name, status }) => ({ id, name, status })),
      durationMs: result.durationMs,
    },
    null,
    2,
  ),
);
