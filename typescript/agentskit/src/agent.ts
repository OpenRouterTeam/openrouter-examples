import { openrouter } from '@agentskit/adapters';
import type { AdapterFactory } from '@agentskit/core';
import { createRuntime } from '@agentskit/runtime';
import { incidentTools } from './tools.js';

export const DEFAULT_MODEL = 'openrouter/free';
export const MAX_STEPS = 4;

export const SYSTEM_PROMPT = `You are an incident-triage assistant working from synthetic data.
Use tools before making claims about service health or deployments.
Correlate timestamps, distinguish evidence from inference, and recommend one safe next action.
Do not invent systems, logs, metrics, or deployment details that the tools did not return.
Finish with: evidence, likely cause, confidence, and next action.`;

export function createIncidentRuntime(adapter: AdapterFactory) {
  return createRuntime({
    adapter,
    tools: incidentTools,
    systemPrompt: SYSTEM_PROMPT,
    maxSteps: MAX_STEPS,
    temperature: 0.1,
  });
}

export function createOpenRouterIncidentRuntime(apiKey: string, model = DEFAULT_MODEL) {
  return createIncidentRuntime(openrouter({ apiKey, model }));
}
