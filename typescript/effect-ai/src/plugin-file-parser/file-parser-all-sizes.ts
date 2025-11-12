/**
 * Example: OpenRouter FileParserPlugin with @effect/ai
 *
 * This example demonstrates how to use OpenRouter's FileParserPlugin with
 * Effect AI, combining idiomatic Effect patterns with PDF file processing:
 * - Effect.gen for generator-style effect composition
 * - Layer-based dependency injection
 * - Type-safe error handling with Effect
 * - File processing with the FileParserPlugin
 * - Uses shared fixtures module with absolute paths
 *
 * To run: bun run typescript/effect-ai/src/plugin-file-parser/file-parser-all-sizes.ts
 */

import * as OpenRouterClient from '@effect/ai-openrouter/OpenRouterClient';
import * as OpenRouterLanguageModel from '@effect/ai-openrouter/OpenRouterLanguageModel';
import * as LanguageModel from '@effect/ai/LanguageModel';
import * as Prompt from '@effect/ai/Prompt';
import { FetchHttpClient } from '@effect/platform';
import * as BunContext from '@effect/platform-bun/BunContext';
import {
  type PdfSize,
  PDF_SIZES,
  extractCode,
  formatSize,
  getPdfSize,
  readExpectedCode,
  readPdfAsDataUrl,
} from '@openrouter-examples/shared/fixtures';
import { Console, Effect, Layer, Redacted } from 'effect';

/**
 * OpenRouter FileParserPlugin configuration
 * This plugin enables server-side PDF parsing using OpenRouter's file parser
 * instead of including PDF content in the message text.
 */
const fileParserConfig: OpenRouterLanguageModel.Config.Service = {
  plugins: [
    {
      id: 'file-parser',
      pdf: {
        engine: 'mistral-ocr',
      },
    },
  ],
};

/**
 * Process a single PDF file with logging and error handling
 */
const processPdf = (size: PdfSize, expectedCode: string) =>
  Effect.gen(function* () {
    yield* Console.log(`\n=== ${size.toUpperCase()} PDF ===`);

    const sizeBytes = getPdfSize(size);
    yield* Console.log(`Size: ${formatSize(sizeBytes)}`);
    yield* Console.log(`Expected: ${expectedCode}`);

    const dataUrl = yield* Effect.promise(() => readPdfAsDataUrl(size));

    /**
     * Construct prompt with file attachment for file parser plugin
     *
     * IMPORTANT: The PDF is sent as a file attachment via Prompt.makePart("file", ...)
     * and will be processed by OpenRouter's file parser plugin server-side.
     * The PDF content is NOT included in the text content - only the user instruction
     * is sent as text. The file parser plugin extracts the PDF content automatically.
     */
    const prompt = Prompt.make([
      Prompt.makeMessage('user', {
        content: [
          // PDF file attachment - processed by file parser plugin
          Prompt.makePart('file', {
            mediaType: 'application/pdf',
            fileName: `${size}.pdf`,
            data: dataUrl,
          }),
          // Text instruction only - NO PDF content included here
          Prompt.makePart('text', {
            text: 'Extract the verification code. Reply with ONLY the code.',
          }),
        ],
      }),
    ]);

    // Generate text with file parser plugin enabled
    // The plugin processes the PDF file attachment server-side
    const response = yield* LanguageModel.generateText({
      prompt,
    }).pipe(OpenRouterLanguageModel.withConfigOverride(fileParserConfig));

    const extracted = extractCode(response.text);
    const success = extracted === expectedCode;

    yield* Console.log(`Extracted: ${extracted || '(none)'}`);
    yield* Console.log(`Status: ${success ? '✅ PASS' : '❌ FAIL'}`);

    return { success, extracted, expected: expectedCode };
  });

/**
 * Main program orchestrating all PDF runs
 */
const program = Effect.gen(function* () {
  yield* Console.log('╔════════════════════════════════════════════════════════════════════════════╗');
  yield* Console.log('║        OpenRouter FileParserPlugin - Effect AI                            ║');
  yield* Console.log('╚════════════════════════════════════════════════════════════════════════════╝');
  yield* Console.log();
  yield* Console.log('Testing PDF processing with verification code extraction');
  yield* Console.log();

  const logFailure =
    (label: string) =>
    (error: unknown) =>
      Effect.gen(function* () {
        yield* Console.error(`Error processing ${label}:`, error);
        return {
          success: false,
          extracted: null,
          expected: '',
        };
      });

  const results = yield* Effect.all(
    PDF_SIZES.map((size) =>
      Effect.gen(function* () {
        const expectedCode = yield* Effect.promise(() => readExpectedCode(size));
        return yield* processPdf(size, expectedCode).pipe(
          Effect.catchAll(logFailure(size)),
        );
      }),
    ),
    { concurrency: 'unbounded' },
  );

  yield* Console.log('\n' + '='.repeat(80));

  const passed = results.filter((r) => r.success).length;
  const total = results.length;

  yield* Console.log(`Results: ${passed}/${total} passed`);
  yield* Console.log('='.repeat(80));

  if (passed === total) {
    yield* Console.log('\n✅ All PDF sizes processed successfully!');
    return 0;
  }
  yield* Console.log('\n❌ Some PDF tests failed');
  return 1;
});

/**
 * Layer composition for dependency injection
 */
const OpenRouterClientLayer = OpenRouterClient.layer({
  apiKey: Redacted.make(process.env.OPENROUTER_API_KEY!),
}).pipe(Layer.provide(FetchHttpClient.layer));

const OpenRouterModelLayer = OpenRouterLanguageModel.layer({
  model: 'openai/gpt-4o-mini',
  config: {
    temperature: 0.7,
    max_tokens: 500,
  },
}).pipe(Layer.provide(OpenRouterClientLayer));

/**
 * Run the program with dependency injection
 */
const exitCode = await program.pipe(
  Effect.provide(OpenRouterModelLayer),
  Effect.provide(BunContext.layer),
  Effect.runPromise,
);

process.exit(exitCode);
