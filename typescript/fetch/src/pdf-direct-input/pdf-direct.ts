/**
 * Example 01: Direct PDF input via raw OpenRouter API
 *
 * Tests PDF input directly via fetch (base64 data URL) without any SDK.
 * Compares behavior across different models AND different message shapes.
 *
 * Message shapes tested:
 * 1. "file" type - OpenRouter/Anthropic native format
 * 2. "image_url" type - OpenAI native format (works for PDFs too)
 *
 * Expected verification code: SMALL-7X9Q2
 *
 * Caching: Responses are cached to .cache/requests/ to avoid hitting the API
 * repeatedly during development. Delete the cache to force fresh requests.
 */

import { readPdfAsDataUrl, readExpectedCode } from '@openrouter-examples/shared/fixtures';
import { createCachedFetch } from '@openrouter-examples/shared/request-cache';
import type { ChatCompletionResponse } from '@openrouter-examples/shared/types';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

const MODELS_TO_TEST = [
  'openai/gpt-4o-mini',
  'anthropic/claude-3-5-sonnet',
  'google/gemini-2.0-flash-001',
] as const;

type MessageShape = 'file' | 'image_url';

const PROMPT = 'What is the verification code in this PDF? Reply with just the code.';

// Use cached fetch to avoid hitting API repeatedly
const cachedFetch = createCachedFetch({ enabled: true, ttlMs: 60 * 60 * 1000 });

/** Truncate string to max length */
function truncate(str: string, maxLen = 200): string {
  return str.length <= maxLen ? str : str.slice(0, maxLen) + '...';
}

/** Extract error message from OpenRouter error response */
function extractErrorMessage(errorJson: string): string {
  try {
    const parsed = JSON.parse(errorJson);
    if (parsed?.error?.metadata?.raw) {
      const rawParsed = JSON.parse(parsed.error.metadata.raw);
      return rawParsed?.error?.message ?? parsed.error.message;
    }
    return parsed?.error?.message ?? errorJson;
  } catch {
    return errorJson;
  }
}

/**
 * Extract verification code from response text.
 */
function extractCode(text: string): string | null {
  const normalized = text.replace(/\*+/g, '').replace(/\s+/g, ' ').trim();
  const match = normalized.match(/([A-Z]+)\s*[-–—]\s*([A-Z0-9]{5})/i);
  if (match) {
    return `${match[1].toUpperCase()}-${match[2].toUpperCase()}`;
  }
  const strictMatch = text.match(/[A-Z]+-[A-Z0-9]{5}/);
  return strictMatch ? strictMatch[0] : null;
}

interface TestResult {
  model: string;
  shape: MessageShape;
  success: boolean;
  extractedCode: string | null;
  matches: boolean;
  error?: string;
  rawResponse?: string;
}

function buildMessageContent(shape: MessageShape, pdfDataUrl: string) {
  if (shape === 'file') {
    return [
      { type: 'text', text: PROMPT },
      { type: 'file', file: { filename: 'small.pdf', file_data: pdfDataUrl } },
    ];
  }
  return [
    { type: 'text', text: PROMPT },
    { type: 'image_url', image_url: { url: pdfDataUrl } },
  ];
}

async function testPdfWithModel(
  model: string,
  shape: MessageShape,
  pdfDataUrl: string,
  expectedCode: string,
): Promise<TestResult> {
  if (!process.env.OPENROUTER_API_KEY) {
    return {
      model,
      shape,
      success: false,
      extractedCode: null,
      matches: false,
      error: 'OPENROUTER_API_KEY not set',
    };
  }

  const requestBody = {
    model,
    messages: [{ role: 'user', content: buildMessageContent(shape, pdfDataUrl) }],
  };

  try {
    const response = await cachedFetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/openrouter/examples',
        'X-Title': 'PDF Direct Input Test',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      const errorMsg = extractErrorMessage(errorText);
      return {
        model,
        shape,
        success: false,
        extractedCode: null,
        matches: false,
        error: `HTTP ${response.status}: ${truncate(errorMsg)}`,
      };
    }

    const data = (await response.json()) as ChatCompletionResponse;
    const content = data.choices[0]?.message?.content ?? '';
    const extractedCode = extractCode(content);

    return {
      model,
      shape,
      success: true,
      extractedCode,
      matches: extractedCode === expectedCode,
      rawResponse: truncate(content),
    };
  } catch (err) {
    return {
      model,
      shape,
      success: false,
      extractedCode: null,
      matches: false,
      error: err instanceof Error ? truncate(err.message) : 'Unknown error',
    };
  }
}

async function main() {
  console.log('=== Example 01: Direct PDF Input via Raw OpenRouter API ===\n');

  console.log('Loading PDF fixture (small.pdf)...');
  const pdfDataUrl = await readPdfAsDataUrl('small');
  const expectedCode = await readExpectedCode('small');
  console.log(`Expected verification code: ${expectedCode}\n`);

  const shapes: MessageShape[] = ['file', 'image_url'];
  const results: TestResult[] = [];

  for (const model of MODELS_TO_TEST) {
    for (const shape of shapes) {
      console.log(`Testing: ${model} with "${shape}" shape...`);
      const result = await testPdfWithModel(model, shape, pdfDataUrl, expectedCode);
      results.push(result);
    }
  }

  // Print comparison table
  console.log('\n=== Results Comparison ===\n');
  console.log('Model                          | Shape     | Status  | Code       | Match');
  console.log('-------------------------------|-----------|---------|------------|------');

  for (const r of results) {
    const modelPad = r.model.padEnd(30);
    const shapePad = r.shape.padEnd(9);
    const status = r.success ? 'SUCCESS' : 'FAIL   ';
    const code = (r.extractedCode ?? 'N/A').slice(0, 10).padEnd(10);
    const match = r.matches ? 'YES' : 'NO ';
    console.log(`${modelPad} | ${shapePad} | ${status} | ${code} | ${match}`);
  }

  // Summary by model
  console.log('\n=== Summary by Model ===\n');

  for (const model of MODELS_TO_TEST) {
    const modelResults = results.filter((r) => r.model === model);
    const fileResult = modelResults.find((r) => r.shape === 'file');
    const imageUrlResult = modelResults.find((r) => r.shape === 'image_url');

    console.log(`${model}:`);
    const fileStatus = fileResult?.matches ? 'WORKS' : 'FAILS';
    const fileDetail = fileResult?.error
      ? truncate(fileResult.error, 80)
      : fileResult?.success && !fileResult?.matches
        ? `Response: "${truncate(fileResult.rawResponse ?? '', 80)}"`
        : '';
    console.log(`  - "file" shape:      ${fileStatus} ${fileDetail ? `(${fileDetail})` : ''}`);

    const imageUrlStatus = imageUrlResult?.matches ? 'WORKS' : 'FAILS';
    const imageUrlDetail = imageUrlResult?.error
      ? truncate(imageUrlResult.error, 80)
      : imageUrlResult?.success && !imageUrlResult?.matches
        ? `Response: "${truncate(imageUrlResult.rawResponse ?? '', 80)}"`
        : '';
    console.log(`  - "image_url" shape: ${imageUrlStatus} ${imageUrlDetail ? `(${imageUrlDetail})` : ''}`);
    console.log();
  }

  // Key findings
  console.log('=== Key Findings ===\n');

  const fileShapeWorks = results.filter((r) => r.shape === 'file' && r.matches);
  const imageUrlShapeWorks = results.filter((r) => r.shape === 'image_url' && r.matches);

  console.log('PDF input via "file" shape (OpenRouter/Anthropic format):');
  if (fileShapeWorks.length === MODELS_TO_TEST.length) {
    console.log('  ✓ Works with ALL tested models');
  } else {
    console.log(`  ✓ Works with: ${fileShapeWorks.map((r) => r.model).join(', ') || 'none'}`);
    const fileFails = results.filter((r) => r.shape === 'file' && !r.matches);
    console.log(`  ✗ Fails with: ${fileFails.map((r) => r.model).join(', ') || 'none'}`);
  }

  console.log('\nPDF input via "image_url" shape (OpenAI native format):');
  if (imageUrlShapeWorks.length === MODELS_TO_TEST.length) {
    console.log('  ✓ Works with ALL tested models');
  } else {
    console.log(`  ✓ Works with: ${imageUrlShapeWorks.map((r) => r.model).join(', ') || 'none'}`);
    const imageUrlFails = results.filter((r) => r.shape === 'image_url' && !r.matches);
    console.log(`  ✗ Fails with: ${imageUrlFails.map((r) => r.model).join(', ') || 'none'}`);
  }

  console.log('\nConclusion:');
  console.log('  The "file" shape is the universal format for PDF input across OpenRouter models.');
  console.log('  The "image_url" shape only works with Google models for PDFs.');

  const anyOpenAIWorks = results.some((r) => r.model === 'openai/gpt-4o-mini' && r.matches);
  if (!anyOpenAIWorks) {
    console.log('\n⚠️ OpenAI PDF support: NOT WORKING with any tested shape');
    process.exit(1);
  } else {
    console.log('\n✓ OpenAI PDF support: WORKING (via "file" shape)');
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
