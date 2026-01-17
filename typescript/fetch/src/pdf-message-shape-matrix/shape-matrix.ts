/**
 * Example 14: PDF Message Shape Matrix Test
 *
 * Tests whether PDF failures correlate with message shape and format.
 * Tests multiple content type formats:
 * - Format 1: `file` type with data/mimeType (AI SDK v5 style)
 * - Format 2: `file` type with filename/file_data (OpenRouter style)
 * - Format 3: `image_url` type with data URL
 * - Format 4: `input_file` type (OpenAI Responses API style)
 *
 * For each format, tests both:
 * - Shape A: File only (no text part)
 * - Shape B: Text + File (text part before file)
 *
 * Uses raw fetch to isolate from SDK behavior.
 */

import { readPdfAsDataUrl } from '@openrouter-examples/shared/fixtures';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'openai/gpt-4o-mini';
const EXPECTED_CODE = 'SMALL-7X9Q2';

// Helper to truncate strings for display
function truncate(str: string, max = 200): string {
  if (str.length <= max) {
    return str;
  }
  return str.slice(0, max) + '...';
}

interface TestResult {
  format: string;
  shape: string;
  httpOk: boolean;
  codeFound: boolean;
  response?: string;
  error?: string;
}

interface TestConfig {
  format: string;
  shape: string;
  messages: unknown[];
  plugins?: unknown[];
}

async function testShape(config: TestConfig): Promise<TestResult> {
  const { format, shape: shapeName, messages, plugins } = config;
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return {
      format,
      shape: shapeName,
      httpOk: false,
      codeFound: false,
      error: 'OPENROUTER_API_KEY not set',
    };
  }

  try {
    const body: Record<string, unknown> = {
      model: MODEL,
      messages,
    };
    if (plugins) {
      body.plugins = plugins;
    }

    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/openrouter/examples',
        'X-Title': 'PDF Shape Matrix Test',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        format,
        shape: shapeName,
        httpOk: false,
        codeFound: false,
        error: truncate(`HTTP ${response.status}: ${errorText}`),
      };
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content ?? '';

    // Check if verification code is in response
    const codeFound = content.includes(EXPECTED_CODE);

    return {
      format,
      shape: shapeName,
      httpOk: true,
      codeFound,
      response: truncate(content),
    };
  } catch (err) {
    return {
      format,
      shape: shapeName,
      httpOk: false,
      codeFound: false,
      error: truncate(err instanceof Error ? err.message : String(err)),
    };
  }
}

async function main() {
  console.log('=== PDF Message Shape Matrix Test ===\n');
  console.log(`Model: ${MODEL}`);
  console.log('PDF: small.pdf (33KB, code: SMALL-7X9Q2)\n');

  // Read PDF as base64
  const pdfDataUrl = await readPdfAsDataUrl('small');
  const base64Data = pdfDataUrl.replace(/^data:application\/pdf;base64,/, '');

  const promptText = 'Please extract the verification code from this PDF.';

  // Define content parts for different formats
  // Format 1: AI SDK v5 style (data + mimeType)
  const filePartAiSdk = {
    type: 'file',
    file: { data: base64Data, mimeType: 'application/pdf' },
  };

  // Format 2: OpenRouter style (filename + file_data as data URL)
  const filePartOpenRouter = {
    type: 'file',
    file: { filename: 'small.pdf', file_data: pdfDataUrl },
  };

  // Format 3: image_url with data URL
  const imageUrlPart = {
    type: 'image_url',
    image_url: { url: pdfDataUrl },
  };

  // Format 4: input_file (OpenAI Responses API style)
  const inputFilePart = {
    type: 'input_file',
    filename: 'small.pdf',
    file_data: pdfDataUrl,
  };

  const textPart = { type: 'text', text: promptText };

  // File-parser plugin config
  const fileParserPlugin = [{ id: 'file-parser', pdf: { engine: 'mistral-ocr' } }];

  // Build test matrix
  const tests: TestConfig[] = [
    // Format 1: file type with data/mimeType (AI SDK v5 style) - NO plugin
    {
      format: 'file(data)',
      shape: 'A: file only',
      messages: [{ role: 'user', content: [filePartAiSdk] }],
    },
    {
      format: 'file(data)',
      shape: 'B: text+file',
      messages: [{ role: 'user', content: [textPart, filePartAiSdk] }],
    },
    // Format 2: file type with filename/file_data (OpenRouter style) - WITH plugin
    {
      format: 'file(OR)',
      shape: 'A: file only',
      messages: [{ role: 'user', content: [filePartOpenRouter] }],
      plugins: fileParserPlugin,
    },
    {
      format: 'file(OR)',
      shape: 'B: text+file',
      messages: [{ role: 'user', content: [filePartOpenRouter, textPart] }],
      plugins: fileParserPlugin,
    },
    // Format 3: image_url type
    {
      format: 'image_url',
      shape: 'A: file only',
      messages: [{ role: 'user', content: [imageUrlPart] }],
    },
    {
      format: 'image_url',
      shape: 'B: text+file',
      messages: [{ role: 'user', content: [textPart, imageUrlPart] }],
    },
    // Format 4: input_file type (OpenAI Responses API style)
    {
      format: 'input_file',
      shape: 'A: file only',
      messages: [{ role: 'user', content: [inputFilePart] }],
    },
    {
      format: 'input_file',
      shape: 'B: text+file',
      messages: [{ role: 'user', content: [textPart, inputFilePart] }],
    },
  ];

  console.log(`Testing ${tests.length} combinations...\n`);

  // Run tests sequentially to avoid rate limits
  const results: TestResult[] = [];
  for (const test of tests) {
    console.log(`  Testing ${test.format} / ${test.shape}...`);
    const result = await testShape(test);
    results.push(result);
  }

  console.log('\n');

  // Print results table
  console.log(
    '┌────────────┬─────────────┬─────────┬────────────┬────────────────────────────────────────┐',
  );
  console.log(
    '│ Format     │ Shape       │ HTTP OK │ Code Found │ Response/Error                         │',
  );
  console.log(
    '├────────────┼─────────────┼─────────┼────────────┼────────────────────────────────────────┤',
  );

  for (const r of results) {
    const format = r.format.padEnd(10);
    const shape = r.shape.padEnd(11);
    const httpOk = r.httpOk ? '✓' : '✗';
    const code = r.codeFound ? '✓' : '✗';
    const detail = truncate(r.response ?? r.error ?? '', 38).padEnd(38);
    console.log(
      `│ ${format} │ ${shape} │ ${httpOk.padEnd(7)} │ ${code.padEnd(10)} │ ${detail} │`,
    );
  }

  console.log(
    '└────────────┴─────────────┴─────────┴────────────┴────────────────────────────────────────┘',
  );

  // Summary analysis
  console.log('\n=== Summary by Format ===');

  const formats = ['file(data)', 'file(OR)', 'image_url', 'input_file'];
  for (const format of formats) {
    const formatResults = results.filter((r) => r.format === format);
    const httpOk = formatResults.filter((r) => r.httpOk).length;
    const codeOk = formatResults.filter((r) => r.codeFound).length;
    console.log(`${format.padEnd(12)}: HTTP OK: ${httpOk}/2, Code Found: ${codeOk}/2`);
  }

  console.log('\n=== Summary by Shape ===');
  const shapes = ['A: file only', 'B: text+file'];
  for (const shape of shapes) {
    const shapeResults = results.filter((r) => r.shape === shape);
    const httpOk = shapeResults.filter((r) => r.httpOk).length;
    const codeOk = shapeResults.filter((r) => r.codeFound).length;
    console.log(`${shape.padEnd(12)}: HTTP OK: ${httpOk}/4, Code Found: ${codeOk}/4`);
  }

  // Determine if any format/shape works
  const anyCodeFound = results.some((r) => r.codeFound);
  const anyHttpOk = results.some((r) => r.httpOk);

  console.log('\n=== Conclusions ===');
  if (anyCodeFound) {
    const working = results.filter((r) => r.codeFound);
    console.log('Working combinations:');
    for (const w of working) {
      console.log(`  - ${w.format} / ${w.shape}`);
    }
  } else if (anyHttpOk) {
    console.log('Some formats return HTTP 200 but model cannot read PDF content.');
    console.log('This suggests the PDF is not being properly passed to the model.');
  } else {
    console.log('All formats fail with HTTP errors.');
    console.log('OpenRouter may not support inline PDF uploads for this model.');
  }

  // Exit code based on whether any test found the code
  process.exit(anyCodeFound ? 0 : 1);
}

main().catch(console.error);
