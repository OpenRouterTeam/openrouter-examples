/**
 * Example: OpenRouter FileParserPlugin - PDF URL (AI SDK)
 *
 * This example demonstrates sending PDFs via publicly accessible URLs using AI SDK.
 * This is more efficient than base64 encoding as you don't need to download
 * and encode the file.
 *
 * Key Points:
 * - Send PDFs directly via URL without downloading
 * - Works with AI SDK's file attachment format
 * - Reduces payload size compared to base64
 * - Ideal for publicly accessible documents
 *
 * To run: bun run typescript/ai-sdk-v5/src/plugin-file-parser/file-parser-pdf-url.ts
 */

import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText } from 'ai';

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

const MODEL = 'anthropic/claude-3.5-sonnet';

/**
 * Example using the Bitcoin whitepaper (publicly accessible PDF)
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║        OpenRouter FileParserPlugin - PDF URL Example (AI SDK)             ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝');
  console.log();
  console.log('Sending PDF via public URL (Bitcoin whitepaper)');
  console.log('URL: https://bitcoin.org/bitcoin.pdf');
  console.log();

  try {
    const model = openrouter(MODEL, { usage: { include: true } });

    const result = await generateText({
      model,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'What are the main points of this document? Provide a brief 2-3 sentence summary.',
            },
            {
              type: 'file',
              // Send PDF via public URL - AI SDK supports this directly
              data: 'https://bitcoin.org/bitcoin.pdf',
              mediaType: 'application/pdf',
            },
          ],
        },
      ],
    });

    console.log('✅ Request successful!');
    console.log('\nSummary:');
    console.log(result.text);
    console.log('\nToken usage:');
    // FIXME: result.usage should have proper type with promptTokens, completionTokens
    // @ts-expect-error - usage is typed as LanguageModelV2Usage but should have token properties
    console.log(`- Prompt tokens: ${result.usage.promptTokens}`);
    // @ts-expect-error - usage is typed as LanguageModelV2Usage but should have token properties
    console.log(`- Completion tokens: ${result.usage.completionTokens}`);
    console.log(`- Total tokens: ${result.usage.totalTokens}`);

    const usage = result.providerMetadata?.openrouter?.usage;
    if (usage && typeof usage === 'object' && 'cost' in usage) {
      const cost = usage.cost as number;
      console.log(`\nCost: $${cost.toFixed(6)}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
