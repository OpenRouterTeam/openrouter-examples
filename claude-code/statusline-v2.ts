#!/usr/bin/env npx tsx

/**
 * OpenRouter cost tracking statusline for Claude Code (v2)
 *
 * Displays compact statusline with NerdFont glyphs:
 *   󱚥 Provider/Model │ 󰇁 $session_cost │ 󰃨 $cache_discount │ 󰖄 $key_balance │ 󱂗 $account_credits │  (API status)
 *
 * Features:
 *   - Pretty model names (e.g., "Sonnet 4.5" instead of "claude-4.5-sonnet")
 *   - Configurable color thresholds for costs and balances
 *   - Support for both API key balance and account credits
 *   - Per-session cost tracking with cache discount visibility
 *   - Automatic balance refresh (throttled to 1 minute)
 *   - API status indicator: green  = all requests successful, red  = fetch errors
 *
 * Configuration:
 *   - MODEL_CONFIG: customize model name display and colors
 *   - THRESHOLDS: set warning/critical thresholds and colors
 *   - API_FETCH_CONFIG: optional retry and throttling for API requests
 *       retry: repeat failed requests with exponential backoff (maxAttempts, delayMs)
 *       throttle: add delay between consecutive requests to avoid rate limits (delayMs)
 *
 * Setup: Add to your ~/.claude/settings.json:
 * {
 *   "statusLine": {
 *     "type": "command",
 *     "command": "/path/to/statusline-v2.ts"
 *   }
 * }
 *
 * Environment variables:
 *   - ANTHROPIC_AUTH_TOKEN or ANTHROPIC_API_KEY: OpenRouter API key (required)
 *   - OPENROUTER_MANAGMENT_KEY: OpenRouter management key for account credits (optional)
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';

// ANSI colors
const C = {
  reset:  '\x1b[0m',
  dim:    '\x1b[2m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  red:    '\x1b[31m',
  cyan:   '\x1b[36m',
  blue:   '\x1b[34m',
  white:  '\x1b[97m',
};

// NerdFont glyphs
const G = {
  model:   '󱚥',  // nf-md-robot_love
  cost:    '󰇁',  // nf-md-currency_usd
  cache:   '󰃨',  // nf-md-cached (cache/discount)
  balance: '󰖄',  // nf-md-wallet
  account: '󱂗',  // nf-md-account_cash (account credits)
  ok:      '',   // nf-fa-circle_check
  warn:    '',   // nf-fa-circle_exclamation
  sep:     '│',
};

// Thresholds and colors configuration
const THRESHOLDS = {
  sessionCost: {
    warning: 5,        // show yellow if cost > this value
    color: {
      normal: C.green,
      warning: C.yellow,
    },
  },
  keyBalance: {
    critical: 5,       // show red if remaining < this value
    warning: 10,        // show yellow if remaining < this value
    color: {
      normal: C.green,
      warning: C.yellow,
      critical: C.red,
    },
  },
  accountCredits: {
    critical: 10,       // show red if credits < this value
    warning: 20,        // show yellow if credits < this value
    color: {
      normal: C.green,
      warning: C.yellow,
      critical: C.red,
    },
  },
};

// API fetch configuration
const API_FETCH_CONFIG = {
  retry: {
    enabled: true,      // enable retry on failed requests
    maxAttempts: 2,      // total attempts (1 initial + 1 retry)
    delayMs: 100,        // base delay in ms, uses exponential backoff (100ms, 200ms, etc.)
  },
  throttle: {
    enabled: false,      // enable throttling between requests to avoid rate limits
    delayMs: 50,         // delay in ms between consecutive requests
  },
};

// Model display configuration
const MODEL_CONFIG = {
  prettify: true,      // enable pretty model names (e.g., "Sonnet 4.5" instead of "claude-4.5-sonnet")
  color: {
    name: C.cyan,     // color for model name
    provider: C.dim,   // color for provider prefix
  },
  // Pretty name mappings (regex pattern → replacement)
  prettyNames: [
    { pattern: /^claude-([0-9.]+)-sonnet$/i,    replacement: 'Sonnet $1' },
    { pattern: /^claude-([0-9.]+)-opus$/i,      replacement: 'Opus $1' },
    { pattern: /^claude-([0-9.]+)-haiku$/i,     replacement: 'Haiku $1' },
    { pattern: /^gpt-4o$/i,                     replacement: 'GPT-4o' },
    { pattern: /^gpt-4o-mini$/i,                replacement: 'GPT-4o mini' },
    { pattern: /^gpt-4-turbo$/i,                replacement: 'GPT-4 Turbo' },
    { pattern: /^gpt-3\.5-turbo$/i,             replacement: 'GPT-3.5 Turbo' },
    { pattern: /^gemini-([0-9.]+)-pro$/i,       replacement: 'Gemini $1 Pro' },
    { pattern: /^gemini-([0-9.]+)-flash$/i,     replacement: 'Gemini $1 Flash' },
  ],
};

interface GenerationData {
  total_cost: number;
  cache_discount: number | null;
  provider_name: string;
  model: string;
}

interface KeyData {
  label: string;
  usage: number;
  limit: number | null;
  is_free_tier: boolean;
}

interface CreditsData {
  total_credits: number;
  total_usage: number;
}

interface State {
  seen_ids: string[];
  total_cost: number;
  total_cache_discount: number;
  last_provider: string;
  last_model: string;
  // cached balance (refreshed once per session run)
  key_usage: number | null;
  key_limit: number | null;
  balance_fetched_at: number;
  // cached account credits
  account_credits: number | null;
  account_credits_fetched_at: number;
}

const BALANCE_TTL_MS = 60_000; // refresh balance at most once per minute

async function fetchGeneration(id: string, apiKey: string): Promise<GenerationData | null> {
  try {
    const res = await fetch(`https://openrouter.ai/api/v1/generation?id=${id}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) return null;
    const json = await res.json() as { data?: GenerationData };
    const data = json?.data;
    if (!data || typeof data.total_cost !== 'number') return null;
    return data;
  } catch {
    return null;
  }
}

async function fetchAccountCredits(mgmtKey: string): Promise<CreditsData | null> {
  try {
    const res = await fetch('https://openrouter.ai/api/v1/credits', {
      headers: { Authorization: `Bearer ${mgmtKey}` },
    });
    if (!res.ok) return null;
    const json = await res.json() as { data?: CreditsData };
    return json?.data ?? null;
  } catch {
    return null;
  }
}

async function fetchKeyInfo(apiKey: string): Promise<KeyData | null> {
  try {
    const res = await fetch('https://openrouter.ai/api/v1/auth/key', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) return null;
    const json = await res.json() as { data?: KeyData };
    return json?.data ?? null;
  } catch {
    return null;
  }
}

function extractGenerationIds(transcriptPath: string): string[] {
  try {
    const content = readFileSync(transcriptPath, 'utf-8');
    const ids: string[] = [];
    for (const line of content.split('\n')) {
      if (!line.trim()) continue;
      try {
        const entry = JSON.parse(line) as { message?: { id?: string } };
        const messageId = entry?.message?.id;
        if (typeof messageId === 'string' && messageId.startsWith('gen-')) {
          ids.push(messageId);
        }
      } catch { /* skip malformed */ }
    }
    return [...new Set(ids)];
  } catch {
    return [];
  }
}

function loadState(statePath: string): State {
  const def: State = {
    seen_ids: [],
    total_cost: 0,
    total_cache_discount: 0,
    last_provider: '',
    last_model: '',
    key_usage: null,
    key_limit: null,
    balance_fetched_at: 0,
    account_credits: null,
    account_credits_fetched_at: 0,
  };
  if (!existsSync(statePath)) return def;
  try {
    const parsed = JSON.parse(readFileSync(statePath, 'utf-8')) as Partial<State>;
    if (!Array.isArray(parsed.seen_ids)) return def;
    return {
      seen_ids:                  parsed.seen_ids,
      total_cost:                typeof parsed.total_cost === 'number'                ? parsed.total_cost                : 0,
      total_cache_discount:      typeof parsed.total_cache_discount === 'number'      ? parsed.total_cache_discount      : 0,
      last_provider:             typeof parsed.last_provider === 'string'             ? parsed.last_provider             : '',
      last_model:                typeof parsed.last_model === 'string'                ? parsed.last_model                : '',
      key_usage:                 typeof parsed.key_usage === 'number'                 ? parsed.key_usage                 : null,
      key_limit:                 typeof parsed.key_limit === 'number'                 ? parsed.key_limit                 : null,
      balance_fetched_at:        typeof parsed.balance_fetched_at === 'number'        ? parsed.balance_fetched_at        : 0,
      account_credits:           typeof parsed.account_credits === 'number'           ? parsed.account_credits           : null,
      account_credits_fetched_at: typeof parsed.account_credits_fetched_at === 'number' ? parsed.account_credits_fetched_at : 0,
    };
  } catch {
    return def;
  }
}

function saveState(statePath: string, state: State): void {
  writeFileSync(statePath, JSON.stringify(state, null, 2));
}

function shortModelName(model: string): string {
  return model
    .replace(/^[^/]+\//, '')   // remove provider prefix
    .replace(/-\d{8}$/, '');   // remove date suffix
}

function prettifyModelName(model: string): string {
  const shortName = shortModelName(model);

  if (!MODEL_CONFIG.prettify) {
    return shortName;
  }

  // Try to match against pretty name patterns
  for (const { pattern, replacement } of MODEL_CONFIG.prettyNames) {
    if (pattern.test(shortName)) {
      return shortName.replace(pattern, replacement);
    }
  }

  // No match found, return short name as-is
  return shortName;
}

function fmt(n: number, decimals = 4): string {
  return n.toFixed(decimals);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchGenerationWithRetry(id: string, apiKey: string): Promise<GenerationData | null> {
  const maxAttempts = API_FETCH_CONFIG.retry.enabled ? API_FETCH_CONFIG.retry.maxAttempts : 1;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = await fetchGeneration(id, apiKey);
    if (result) return result;

    // If not the last attempt and retry is enabled, wait before retrying with exponential backoff
    if (attempt < maxAttempts - 1 && API_FETCH_CONFIG.retry.enabled) {
      await sleep(API_FETCH_CONFIG.retry.delayMs * (attempt + 1));
    }
  }

  return null;
}

async function main(): Promise<void> {
  const apiKey = process.env.ANTHROPIC_AUTH_TOKEN ?? process.env.ANTHROPIC_API_KEY ?? '';

  if (!apiKey) {
    process.stdout.write(`${G.warn} Set ANTHROPIC_AUTH_TOKEN to use OpenRouter statusline`);
    return;
  }

  let inputData = '';
  for await (const chunk of process.stdin) {
    inputData += chunk as string;
  }

  const input = JSON.parse(inputData) as { session_id?: string; transcript_path?: string };
  const { session_id, transcript_path } = input;

  if (typeof session_id !== 'string' || typeof transcript_path !== 'string') {
    process.stdout.write('Invalid statusline input');
    return;
  }

  const statePath = `/tmp/claude-openrouter-cost-${session_id}.json`;
  const state = loadState(statePath);

  // --- fetch new generation costs ---
  const allIds = extractGenerationIds(transcript_path);
  const seenSet = new Set(state.seen_ids);
  const newIds = allIds.filter((id) => !seenSet.has(id));

  let fetchSucceeded = 0;
  let fetchFailed = 0;

  for (let i = 0; i < newIds.length; i++) {
    // Throttle if enabled and not the first request
    if (i > 0 && API_FETCH_CONFIG.throttle.enabled) {
      await sleep(API_FETCH_CONFIG.throttle.delayMs);
    }

    const id = newIds[i];
    const gen = await fetchGenerationWithRetry(id, apiKey);

    if (!gen) {
      fetchFailed++;
      continue;
    }

    fetchSucceeded++;
    state.total_cost           += gen.total_cost ?? 0;
    state.total_cache_discount += gen.cache_discount ?? 0;
    if (gen.provider_name) state.last_provider = gen.provider_name;
    if (gen.model)         state.last_model     = gen.model;
    state.seen_ids.push(id);
  }

  // --- fetch key balance (throttled) ---
  const now = Date.now();
  if (now - state.balance_fetched_at > BALANCE_TTL_MS) {
    const keyInfo = await fetchKeyInfo(apiKey);
    if (keyInfo) {
      state.key_usage           = keyInfo.usage;
      state.key_limit           = keyInfo.limit;
      state.balance_fetched_at  = now;
    }
  }

  // --- fetch account credits (throttled, only if OPENROUTER_MANAGMENT_KEY set) ---
  const mgmtKey = process.env.OPENROUTER_MANAGMENT_KEY ?? '';
  if (mgmtKey && now - state.account_credits_fetched_at > BALANCE_TTL_MS) {
    const credits = await fetchAccountCredits(mgmtKey);
    if (credits) {
      state.account_credits             = credits.total_credits - credits.total_usage;
      state.account_credits_fetched_at  = now;
    }
  }

  saveState(statePath, state);

  // --- build output ---
  const parts: string[] = [];

  // model + provider
  const modelStr = state.last_model ? prettifyModelName(state.last_model) : '?';
  const provStr  = state.last_provider ? `${MODEL_CONFIG.color.provider}${state.last_provider}${C.reset}/` : '';
  parts.push(`${C.cyan}${G.model}${C.reset} ${provStr}${MODEL_CONFIG.color.name}${modelStr}${C.reset}`);

  // session cost
  const costColor = state.total_cost > THRESHOLDS.sessionCost.warning
    ? THRESHOLDS.sessionCost.color.warning
    : THRESHOLDS.sessionCost.color.normal;
  parts.push(`${costColor}${G.cost} ${fmt(state.total_cost, 2)}${C.reset}`);

  // cache discount (only show if non-zero)
  if (state.total_cache_discount !== 0) {
    parts.push(`${C.dim}${G.cache} $${fmt(Math.abs(state.total_cache_discount), 2)}${C.reset}`);
  }

  // key balance
  if (state.key_usage !== null) {
    if (state.key_limit !== null) {
      const remaining = state.key_limit - state.key_usage;
      const balColor  = remaining < THRESHOLDS.keyBalance.critical
        ? THRESHOLDS.keyBalance.color.critical
        : remaining < THRESHOLDS.keyBalance.warning
        ? THRESHOLDS.keyBalance.color.warning
        : THRESHOLDS.keyBalance.color.normal;
      parts.push(`${balColor}${G.balance} $${fmt(remaining, 2)}${C.reset}`);
    } else {
      // unlimited key — show usage only
      parts.push(`${C.dim}${G.balance} used $${fmt(state.key_usage, 2)}${C.reset}`);
    }
  }

  // account credits (only if OPENROUTER_MANAGMENT_KEY was set)
  if (state.account_credits !== null) {
    const credColor = state.account_credits < THRESHOLDS.accountCredits.critical
      ? THRESHOLDS.accountCredits.color.critical
      : state.account_credits < THRESHOLDS.accountCredits.warning
      ? THRESHOLDS.accountCredits.color.warning
      : THRESHOLDS.accountCredits.color.normal;
    parts.push(`${credColor}${G.account} $${fmt(state.account_credits, 2)}${C.reset}`);
  }

  // tracking freshness indicator
  if (newIds.length > 0) {
    const indicator = fetchFailed === 0
      ? `${C.green}${G.ok}${C.reset}`
      : `${C.red}${G.warn}${C.reset}`;
    parts.push(indicator);
  }

  const sep = ` ${C.dim}${G.sep}${C.reset} `;
  process.stdout.write(parts.join(sep));
}

main().catch((err: Error) => {
  process.stdout.write(`${G.warn} ${err.message}`);
});
