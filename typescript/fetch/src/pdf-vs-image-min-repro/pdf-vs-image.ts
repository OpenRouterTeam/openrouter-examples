/**
 * Example 13: PDF vs Image Minimal Reproduction
 *
 * This test proves whether PDFs fail while images succeed for OpenAI models via OpenRouter.
 * Uses raw fetch (NOT AI SDK) to isolate the issue.
 *
 * Expected results:
 * - Test A (Image via image_url): SUCCESS - OpenAI supports images natively
 * - Test B (PDF via image_url): FAIL - OpenAI rejects PDFs in image_url format
 * - Test C (PDF via file + plugin): SUCCESS - FileParserPlugin converts PDF to text
 *
 * This demonstrates that AI SDK's current approach of sending PDFs as image_url is wrong.
 * PDFs need to be sent using the "file" content type with FileParserPlugin enabled.
 *
 * To run: cd typescript/fetch && bun run src/pdf-vs-image-min-repro/pdf-vs-image.ts
 */

import { readPdfAsDataUrl } from '@openrouter-examples/shared/fixtures';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'openai/gpt-4o-mini';
const PROMPT = 'What file type was attached? Describe what you see briefly.';

// 1x1 red PNG pixel as base64 data URL (smallest valid PNG)
const TINY_RED_PNG_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';

function truncate(str: string, maxLen = 200): string {
  if (str.length <= maxLen) {
    return str;
  }
  return str.slice(0, maxLen) + '... [truncated]';
}

interface TestResult {
  name: string;
  success: boolean;
  httpStatus: number;
  content: string;
  error?: string;
}

async function makeRequest(
  name: string,
  contentParts: Array<{ type: string; [key: string]: unknown }>,
  withPlugin = false,
): Promise<TestResult> {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY environment variable is not set');
  }

  const requestBody: Record<string, unknown> = {
    model: MODEL,
    messages: [
      {
        role: 'user',
        content: contentParts,
      },
    ],
    max_tokens: 150,
  };

  // Add FileParserPlugin if requested
  if (withPlugin) {
    requestBody.plugins = [
      {
        id: 'file-parser',
        pdf: {
          engine: 'mistral-ocr',
        },
      },
    ];
  }

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/openrouter/examples',
        'X-Title': 'PDF vs Image Min Repro',
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();

    if (!response.ok) {
      return {
        name,
        success: false,
        httpStatus: response.status,
        content: '',
        error: truncate(responseText),
      };
    }

    const data = JSON.parse(responseText);
    const content = data.choices?.[0]?.message?.content || '[No content]';

    return {
      name,
      success: true,
      httpStatus: response.status,
      content: truncate(content),
    };
  } catch (err) {
    return {
      name,
      success: false,
      httpStatus: 0,
      content: '',
      error: err instanceof Error ? truncate(err.message) : 'Unknown error',
    };
  }
}

function printResult(result: TestResult) {
  const status = result.success ? '✅ SUCCESS' : '❌ FAILED';
  console.log(`\n${result.name}: ${status}`);
  console.log(`  HTTP Status: ${result.httpStatus}`);
  if (result.success) {
    console.log(`  Response: ${result.content}`);
  } else {
    console.log(`  Error: ${result.error}`);
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║       Example 13: PDF vs Image Minimal Reproduction Test                  ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝');
  console.log();
  console.log(`Model: ${MODEL}`);
  console.log(`Prompt: "${PROMPT}"`);
  console.log();

  // Prepare PDF data
  const pdfDataUrl = await readPdfAsDataUrl('small');

  console.log('Running 3 tests in parallel...');
  console.log('  A) Image via image_url (should work - native OpenAI support)');
  console.log('  B) PDF via image_url (should FAIL - OpenAI rejects PDFs here)');
  console.log('  C) PDF via file + plugin (should work - FileParserPlugin)');

  // Test A: Image (using image_url format - OpenAI native)
  const imagePromise = makeRequest('A) Image (image_url)', [
    {
      type: 'image_url',
      image_url: {
        url: TINY_RED_PNG_DATA_URL,
      },
    },
    {
      type: 'text',
      text: PROMPT,
    },
  ]);

  // Test B: PDF (using image_url format - WRONG approach, what broken AI SDK does)
  const pdfViaImageUrlPromise = makeRequest('B) PDF (image_url) - WRONG', [
    {
      type: 'image_url',
      image_url: {
        url: pdfDataUrl,
      },
    },
    {
      type: 'text',
      text: PROMPT,
    },
  ]);

  // Test C: PDF (using file format with plugin - CORRECT approach)
  const pdfViaFilePromise = makeRequest(
    'C) PDF (file + plugin) - CORRECT',
    [
      {
        type: 'file',
        file: {
          filename: 'small.pdf',
          file_data: pdfDataUrl,
        },
      },
      {
        type: 'text',
        text: PROMPT,
      },
    ],
    true, // withPlugin
  );

  const [imageResult, pdfViaImageUrlResult, pdfViaFileResult] = await Promise.all([
    imagePromise,
    pdfViaImageUrlPromise,
    pdfViaFilePromise,
  ]);

  // Print results
  console.log('\n════════════════════════════════════════════════════════════════════════════');
  console.log('RESULTS:');
  printResult(imageResult);
  printResult(pdfViaImageUrlResult);
  printResult(pdfViaFileResult);

  // Summary
  console.log('\n════════════════════════════════════════════════════════════════════════════');
  console.log('SUMMARY:');

  const expectedPattern =
    imageResult.success && !pdfViaImageUrlResult.success && pdfViaFileResult.success;

  if (expectedPattern) {
    console.log('');
    console.log('🔍 CONFIRMED: The issue is reproduced!');
    console.log('');
    console.log('   - Images work via image_url (OpenAI native support)');
    console.log('   - PDFs FAIL via image_url (OpenAI rejects non-image data URLs)');
    console.log('   - PDFs WORK via file + FileParserPlugin');
    console.log('');
    console.log('   CONCLUSION: AI SDK must NOT send PDFs as image_url.');
    console.log('   PDFs need the "file" content type with FileParserPlugin enabled.');
  } else {
    console.log('');
    console.log('Results differ from expected pattern:');
    console.log('  Expected: A=success, B=fail, C=success');
    console.log(
      `  Actual:   A=${imageResult.success ? 'success' : 'fail'}, B=${pdfViaImageUrlResult.success ? 'success' : 'fail'}, C=${pdfViaFileResult.success ? 'success' : 'fail'}`,
    );
  }
}

main().catch((err) => {
  console.error('Fatal error:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
