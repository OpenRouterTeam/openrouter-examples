/**
 * Request/Response caching for OpenRouter API calls
 *
 * This module provides caching to avoid hitting the API repeatedly during development.
 * Cache is keyed by a hash of the request body (excluding volatile fields).
 *
 * Cache structure (folder per request):
 * .cache/requests/{key}/
 *   - meta.json     - Small metadata: url, model, status, timestamp, summary, stack trace
 *   - request.json  - Request body (large base64 strings in sidecars)
 *   - response.json - Response body
 *   - *.sidecar     - Large string values (base64 blobs)
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as JsonSidecar from './json-sidecar.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CACHE_DIR = join(__dirname, '../../../.cache/requests');
const SIDECAR_DIR = join(__dirname, '../../../.cache/sidecars'); // Shared sidecars to avoid duplication

/** Metadata file - safe to read, contains no large blobs */
export interface CacheMeta {
  key: string;
  url: string;
  method: string;
  model: string | null;
  /** Provider routing config if specified */
  provider?: unknown;
  status: number;
  statusText: string;
  timestamp: number;
  /** ISO timestamp for human readability */
  timestampISO: string;
  /** First 500 chars of response text for quick inspection */
  responseSummary: string;
  /** Whether the request succeeded (2xx status) */
  success: boolean;
  /** Error message if failed */
  errorMessage?: string;
  /** Stack trace showing where the request originated */
  stackTrace: string[];
  /** Caller file (first non-library frame) */
  callerFile?: string;
}

export interface CachedResponseBody {
  /** Parsed JSON if body was valid JSON */
  json?: unknown;
  /** Raw text if body was not valid JSON */
  text?: string;
}

export interface CachedResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: CachedResponseBody;
  timestamp: number;
}

/**
 * Extract the relevant parts of a stack trace for debugging
 */
function getStackTrace(): { frames: string[]; callerFile?: string } {
  const stack = new Error().stack ?? '';
  const lines = stack.split('\n').slice(1); // Remove "Error" line

  const frames: string[] = [];
  let callerFile: string | undefined;

  for (const line of lines) {
    const trimmed = line.trim();
    // Skip internal frames
    if (
      trimmed.includes('request-cache.ts') ||
      trimmed.includes('node:internal') ||
      trimmed.includes('node_modules')
    ) {
      continue;
    }

    // Extract file:line from the frame
    const match = trimmed.match(/at\s+(?:.*?\s+)?\(?(.+?):(\d+):(\d+)\)?$/);
    if (match) {
      const [, filePath, line, col] = match;
      // Make path relative to workspace
      const relPath = filePath.startsWith('/')
        ? relative(join(__dirname, '../../../../..'), filePath)
        : filePath;
      const frame = `${relPath}:${line}:${col}`;
      frames.push(frame);

      // First frame is the caller
      if (!callerFile) {
        callerFile = frame;
      }
    }
  }

  return { frames: frames.slice(0, 5), callerFile }; // Keep top 5 frames
}

/**
 * Generate a cache key from request details.
 * Normalizes the body to improve cache hits (removes volatile fields).
 */
function getCacheKey(url: string, body: unknown): string {
  const hash = createHash('sha256');
  hash.update(url);

  // Normalize body for better cache hits
  const normalized = normalizeRequestBody(body);
  hash.update(JSON.stringify(normalized));

  return hash.digest('hex').slice(0, 16);
}

/**
 * Normalize request body to improve cache hits.
 * Removes/normalizes volatile fields that don't affect the semantic request.
 */
function normalizeRequestBody(body: unknown): unknown {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const obj = body as Record<string, unknown>;
  const normalized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    // Keep most fields as-is
    normalized[key] = value;
  }

  return normalized;
}

/**
 * Get the cache folder path for a given key
 */
function getCacheFolder(key: string): string {
  return join(CACHE_DIR, key);
}

/**
 * Get file paths for cache entry (inside a folder)
 */
function getCachePaths(key: string) {
  const folder = getCacheFolder(key);
  return {
    folder,
    meta: join(folder, 'meta.json'),
    request: join(folder, 'request.json'),
    response: join(folder, 'response.json'),
  };
}

/**
 * Extract model from request body
 */
function extractModel(body: unknown): string | null {
  if (body && typeof body === 'object' && 'model' in body) {
    return String((body as { model: unknown }).model);
  }
  return null;
}

/**
 * Extract provider config from request body
 */
function extractProvider(body: unknown): unknown | undefined {
  if (body && typeof body === 'object' && 'provider' in body) {
    return (body as { provider: unknown }).provider;
  }
  return undefined;
}

/**
 * Extract error message from response
 */
function extractErrorMessage(body: CachedResponseBody): string | undefined {
  if (body.json && typeof body.json === 'object') {
    const json = body.json as Record<string, unknown>;
    if (json.error && typeof json.error === 'object') {
      const error = json.error as Record<string, unknown>;
      if (typeof error.message === 'string') {
        return error.message;
      }
    }
  }
  return undefined;
}

/**
 * Get response summary for quick inspection
 */
function getResponseSummary(body: CachedResponseBody, maxLen = 500): string {
  if (body.json) {
    const str = JSON.stringify(body.json);
    return str.length > maxLen ? str.slice(0, maxLen) + '...' : str;
  }
  if (body.text) {
    return body.text.length > maxLen ? body.text.slice(0, maxLen) + '...' : body.text;
  }
  return '';
}

/**
 * Check if a cached response exists and is valid
 */
export function getCachedResponse(
  url: string,
  body: unknown,
): { meta: CacheMeta; response: CachedResponse } | null {
  const key = getCacheKey(url, body);
  const paths = getCachePaths(key);

  if (!existsSync(paths.meta) || !existsSync(paths.response)) {
    return null;
  }

  try {
    const meta = JSON.parse(readFileSync(paths.meta, 'utf-8')) as CacheMeta;
    const response = JSON.parse(readFileSync(paths.response, 'utf-8')) as CachedResponse;
    return { meta, response };
  } catch {
    return null;
  }
}

/**
 * Save a response to the cache (in a folder)
 */
export function cacheResponse(
  url: string,
  requestBody: unknown,
  response: CachedResponse,
  stackInfo?: { frames: string[]; callerFile?: string },
): void {
  const key = getCacheKey(url, requestBody);
  const paths = getCachePaths(key);

  // Ensure cache folder exists
  if (!existsSync(paths.folder)) {
    mkdirSync(paths.folder, { recursive: true });
  }

  const model = extractModel(requestBody);
  const provider = extractProvider(requestBody);
  const success = response.status >= 200 && response.status < 300;
  const errorMessage = success ? undefined : extractErrorMessage(response.body);
  const { frames, callerFile } = stackInfo ?? getStackTrace();

  // Write metadata (small, safe to read)
  const meta: CacheMeta = {
    key,
    url,
    method: 'POST',
    model,
    provider,
    status: response.status,
    statusText: response.statusText,
    timestamp: response.timestamp,
    timestampISO: new Date(response.timestamp).toISOString(),
    responseSummary: getResponseSummary(response.body),
    success,
    errorMessage,
    stackTrace: frames,
    callerFile,
  };
  writeFileSync(paths.meta, JSON.stringify(meta, null, 2));

  // Ensure shared sidecar directory exists
  if (!existsSync(SIDECAR_DIR)) {
    mkdirSync(SIDECAR_DIR, { recursive: true });
  }

  // Write full request body using SHARED sidecar dir to avoid duplicating large blobs
  JsonSidecar.writeFile(paths.request, requestBody, { sidecarDir: SIDECAR_DIR });

  // Write full response (typically small, but use sidecar just in case)
  JsonSidecar.writeFile(paths.response, response, { sidecarDir: SIDECAR_DIR });
}

/**
 * Create a cached fetch function for OpenRouter API calls
 *
 * @param options.enabled - Whether caching is enabled (default: true)
 * @param options.ttlMs - Cache TTL in milliseconds (default: 1 hour)
 * @returns A fetch function that caches responses
 */
export function createCachedFetch(
  options: { enabled?: boolean; ttlMs?: number } = {},
): typeof fetch {
  const { enabled = true, ttlMs = 60 * 60 * 1000 } = options;

  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input.toString();

    // Capture stack trace early (before async operations)
    const stackInfo = getStackTrace();

    // Only cache POST requests with JSON body
    if (!enabled || init?.method !== 'POST' || !init.body) {
      return fetch(input, init);
    }

    let requestBody: unknown;
    try {
      requestBody = JSON.parse(init.body as string);
    } catch {
      return fetch(input, init);
    }

    // Check cache
    const cached = getCachedResponse(url, requestBody);
    if (cached) {
      const age = Date.now() - cached.response.timestamp;
      if (age < ttlMs) {
        const model = cached.meta.model ?? 'unknown';
        console.log(`[CACHE HIT] ${model} (age: ${Math.round(age / 1000)}s)`);
        // Reconstruct body from cached format
        const bodyText =
          cached.response.body.json !== undefined
            ? JSON.stringify(cached.response.body.json)
            : (cached.response.body.text ?? '');
        return new Response(bodyText, {
          status: cached.response.status,
          statusText: cached.response.statusText,
          headers: cached.response.headers,
        });
      }
      console.log(`[CACHE EXPIRED] ${cached.meta.model ?? url}`);
    }

    // Make actual request
    const model = extractModel(requestBody);
    const provider = extractProvider(requestBody);
    const providerInfo = provider ? ` via ${JSON.stringify(provider)}` : '';
    console.log(`[CACHE MISS] ${model ?? url}${providerInfo}`);

    const response = await fetch(input, init);

    // Clone response to read body without consuming it
    const clone = response.clone();
    const bodyText = await clone.text();

    // Try to parse as JSON, fall back to text
    let body: CachedResponseBody;
    try {
      body = { json: JSON.parse(bodyText) };
    } catch {
      body = { text: bodyText };
    }

    // Cache the response
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    cacheResponse(
      url,
      requestBody,
      {
        status: response.status,
        statusText: response.statusText,
        headers,
        body,
        timestamp: Date.now(),
      },
      stackInfo,
    );

    // Return a new response with the same body
    return new Response(bodyText, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  };
}

/**
 * Truncate base64 data in objects for logging
 */
export function truncateForLog(obj: unknown, maxLen = 100): unknown {
  if (typeof obj === 'string') {
    return obj.length > maxLen ? obj.slice(0, maxLen) + `... [${obj.length} chars]` : obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => truncateForLog(item, maxLen));
  }
  if (obj && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = truncateForLog(value, maxLen);
    }
    return result;
  }
  return obj;
}
