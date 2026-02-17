import { OpenRouter } from '@openrouter/sdk';

async function main() {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY environment variable is not set');
  }

  const openRouter = new OpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
    httpReferer: 'https://github.com/openrouter/examples',
    xTitle: 'OpenRouter SDK Example',
  });

  console.log('=== OpenRouter SDK Quickstart Example ===\n');

  const completion = await openRouter.chat.send({
    chatGenerationParams: {
      model: 'openai/gpt-5.2',
      messages: [
        {
          role: 'user',
          content: 'Write a haiku about TypeScript.',
        },
      ],
      stream: false,
    },
  });

  const firstChoice = completion.choices?.[0]?.message?.content;
  console.log('Response:');
  if (typeof firstChoice === 'string') {
    console.log(firstChoice);
  } else {
    console.log(JSON.stringify(firstChoice, null, 2));
  }
}

main().catch((error) => {
  console.error('Error running OpenRouter SDK example:', error);
  process.exit(1);
});
