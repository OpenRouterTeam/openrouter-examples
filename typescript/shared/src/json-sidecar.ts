/**
 * JSON Sidecar - Store large string values in separate files
 *
 * When stringifying, any string value over a threshold is replaced with a
 * reference and the value is written to a separate file.
 *
 * Special handling for data URLs: the prefix (e.g., "data:application/pdf;base64,")
 * is kept in the main file, only the base64 blob goes to the sidecar.
 *
 * Reference format:
 * - Plain string: `__SIDECAR__:{hash}`
 * - Data URL: `data:application/pdf;base64,__SIDECAR__:{hash}`
 *
 * This keeps the main JSON file small and readable while preserving large
 * blobs (like base64 PDFs) in sidecars.
 */

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const SIDECAR_MARKER = '__SIDECAR__:';
const DEFAULT_THRESHOLD = 1000; // Strings larger than this go to sidecar

// Pattern to match data URLs: data:<mediaType>;base64,<data>
const DATA_URL_REGEX = /^(data:[^;]+;base64,)(.+)$/;

interface SidecarOptions {
  /** Directory to store sidecar files (defaults to same dir as main file) */
  sidecarDir?: string;
  /** Threshold in chars - strings larger than this go to sidecar (default: 1000) */
  threshold?: number;
}

/**
 * Generate a short hash for a string value
 */
function hashValue(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 12);
}

/**
 * Check if a string contains a sidecar reference
 */
function hasSidecarRef(value: string): boolean {
  return value.includes(SIDECAR_MARKER);
}

/**
 * Create a sidecar reference string
 */
function makeSidecarRef(hash: string): string {
  return `${SIDECAR_MARKER}${hash}`;
}

/**
 * Extract sidecar hash from a reference
 */
function extractSidecarHash(ref: string): string | null {
  const idx = ref.indexOf(SIDECAR_MARKER);
  if (idx === -1) {
    return null;
  }
  return ref.slice(idx + SIDECAR_MARKER.length);
}

/**
 * Process a large string for storage - returns the reference string
 * and the content to store in the sidecar.
 */
function processLargeString(value: string): { ref: string; content: string } {
  const dataUrlMatch = value.match(DATA_URL_REGEX);

  if (dataUrlMatch) {
    // Data URL: keep prefix in main file, store base64 in sidecar
    const prefix = dataUrlMatch[1]; // e.g., "data:application/pdf;base64,"
    const base64Data = dataUrlMatch[2];
    const hash = hashValue(base64Data);
    return {
      ref: `${prefix}${makeSidecarRef(hash)}`,
      content: base64Data,
    };
  }

  // Plain large string: store entire value in sidecar
  const hash = hashValue(value);
  return {
    ref: makeSidecarRef(hash),
    content: value,
  };
}

/**
 * Restore a sidecar reference to its original value
 */
function restoreSidecarRef(value: string, sidecarDir: string): string {
  const hash = extractSidecarHash(value);
  if (!hash) {
    return value;
  }

  const sidecarPath = join(sidecarDir, `${hash}.sidecar`);
  if (!existsSync(sidecarPath)) {
    console.warn(`Sidecar file not found: ${sidecarPath}`);
    return value;
  }

  const content = readFileSync(sidecarPath, 'utf-8');

  // Check if this was a data URL (has prefix before the marker)
  const markerIdx = value.indexOf(SIDECAR_MARKER);
  if (markerIdx > 0) {
    // Restore data URL: prefix + content
    const prefix = value.slice(0, markerIdx);
    return prefix + content;
  }

  // Plain sidecar reference
  return content;
}

/**
 * Stringify JSON with large strings stored in sidecar files.
 *
 * @param value - The value to stringify
 * @param mainFilePath - Path where the main JSON file will be written
 * @param options - Sidecar options
 * @returns The JSON string (with sidecar references for large values)
 */
export function stringify(
  value: unknown,
  mainFilePath: string,
  options: SidecarOptions = {},
): string {
  const { threshold = DEFAULT_THRESHOLD } = options;
  const sidecarDir = options.sidecarDir ?? dirname(mainFilePath);
  const sidecars: Map<string, string> = new Map();

  // Ensure sidecar directory exists
  if (!existsSync(sidecarDir)) {
    mkdirSync(sidecarDir, { recursive: true });
  }

  // Replacer that extracts large strings
  const replacer = (_key: string, val: unknown): unknown => {
    if (typeof val === 'string' && val.length > threshold) {
      const { ref, content } = processLargeString(val);
      const hash = extractSidecarHash(ref);
      if (hash) {
        sidecars.set(`${hash}.sidecar`, content);
      }
      return ref;
    }
    return val;
  };

  const json = JSON.stringify(value, replacer, 2);

  // Write all sidecar files
  for (const [filename, content] of sidecars) {
    const sidecarPath = join(sidecarDir, filename);
    writeFileSync(sidecarPath, content);
  }

  return json;
}

/**
 * Parse JSON with sidecar references restored to original values.
 *
 * @param json - The JSON string to parse
 * @param mainFilePath - Path where the main JSON file is located
 * @param options - Sidecar options
 * @returns The parsed value with sidecars restored
 */
export function parse<T = unknown>(
  json: string,
  mainFilePath: string,
  options: SidecarOptions = {},
): T {
  const sidecarDir = options.sidecarDir ?? dirname(mainFilePath);

  // Reviver that restores sidecar references
  const reviver = (_key: string, val: unknown): unknown => {
    if (typeof val === 'string' && hasSidecarRef(val)) {
      return restoreSidecarRef(val, sidecarDir);
    }
    return val;
  };

  return JSON.parse(json, reviver) as T;
}

/**
 * Write a value to a JSON file with sidecars for large strings.
 */
export function writeFile(
  filePath: string,
  value: unknown,
  options: SidecarOptions = {},
): void {
  const json = stringify(value, filePath, options);
  writeFileSync(filePath, json);
}

/**
 * Read a JSON file and restore any sidecar references.
 */
export function readFile<T = unknown>(
  filePath: string,
  options: SidecarOptions = {},
): T {
  const json = readFileSync(filePath, 'utf-8');
  return parse<T>(json, filePath, options);
}

/**
 * Check if a parsed JSON object has any unresolved sidecar references
 * (useful for debugging missing sidecars)
 */
export function hasUnresolvedRefs(obj: unknown): boolean {
  if (typeof obj === 'string' && hasSidecarRef(obj)) {
    return true;
  }
  if (Array.isArray(obj)) {
    return obj.some(hasUnresolvedRefs);
  }
  if (obj && typeof obj === 'object') {
    return Object.values(obj).some(hasUnresolvedRefs);
  }
  return false;
}
