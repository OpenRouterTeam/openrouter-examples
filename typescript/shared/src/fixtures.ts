/**
 * Shared utilities for working with PDF fixtures
 *
 * This module provides helpers to read PDF fixtures and their metadata
 * using absolute paths so examples work regardless of where they're run from.
 */

import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Calculate absolute path to fixtures directory
// This works from any location by resolving relative to this file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FIXTURES_DIR = join(__dirname, '../../../fixtures/pdfs');

export const PDF_SIZES = ['small', 'medium', 'large', 'xlarge'] as const;
export type PdfSize = (typeof PDF_SIZES)[number];

export interface PdfMetadata {
  verificationCode: string;
  description: string;
  size: string;
  type: string;
  purpose: string;
  regression?: string;
}

/**
 * Get absolute path to a PDF fixture file
 */
export function getPdfPath(size: PdfSize): string {
  return join(FIXTURES_DIR, `${size}.pdf`);
}

/**
 * Get absolute path to a PDF metadata JSON file
 */
export function getMetadataPath(size: PdfSize): string {
  return join(FIXTURES_DIR, `${size}.json`);
}

/**
 * Read verification code from JSON metadata
 */
export async function readExpectedCode(size: PdfSize): Promise<string> {
  const metadataPath = getMetadataPath(size);
  const file = Bun.file(metadataPath);
  const metadata = (await file.json()) as PdfMetadata;
  return metadata.verificationCode;
}

/**
 * Read all expected codes for all PDF sizes
 */
export async function readAllExpectedCodes(): Promise<Record<PdfSize, string>> {
  const codes = await Promise.all(
    PDF_SIZES.map(async (size) => {
      const code = await readExpectedCode(size);
      return [size, code] as const;
    }),
  );
  return Object.fromEntries(codes) as Record<PdfSize, string>;
}

/**
 * Convert PDF file to base64 data URL
 */
export async function readPdfAsDataUrl(size: PdfSize): Promise<string> {
  const pdfPath = getPdfPath(size);
  const pdfFile = Bun.file(pdfPath);
  const pdfBuffer = await pdfFile.arrayBuffer();
  const base64PDF = Buffer.from(pdfBuffer).toString('base64');
  return `data:application/pdf;base64,${base64PDF}`;
}

/**
 * Get file size in bytes
 */
export function getPdfSize(size: PdfSize): number {
  const pdfPath = getPdfPath(size);
  return Bun.file(pdfPath).size;
}

/**
 * Format file size for display
 */
export function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Extract verification code from response text using regex
 */
export function extractCode(text: string): string | null {
  const match = text.match(/[A-Z]+-[A-Z0-9]{5}/);
  return match ? match[0] : null;
}
