# LangChain.js / OpenRouter demo

Use this example repo to run [LangChain.js](https://github.com/hwchase17/langchainjs) scripts using [OpenRouter](https://openrouter.ai).

## Changing models

Change the model you want to use by configuring `modelName` in `index.ts`. You can use models from OpenAI, Anthropic, Google, and more. See the [OpenRouter docs](https://openrouter.ai/docs) for all the options.

## OAuth

You can let users use [OpenRouter OAuth](https://openrouter.ai/docs#oauth) to authenticate and pay for models instead of using your own key. This example doesn't include that code yet (PRs welcome), but you can find an example in Python + Streamlit [here](https://github.com/alexanderatallah/openrouter-streamlit).
