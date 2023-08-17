# OpenRouter Examples

Use the `examples` folder in this repo to integrate different SDKs with OpenRouter.

OpenRouter is an API that can be used with most AI SDKs, and has a very similar format to OpenAI's own API.

Below, you can find different SDKs adapted to use OpenRouter.

### npm openai

Use [this example repo](/examples/openai/) to run the npm [openai](https://www.npmjs.com/package/openai) package using [OpenRouter](https://openrouter.ai).

### LangChain.js

Use [this example repo](/examples/langchain/) to run [LangChain.js](https://github.com/hwchase17/langchainjs) scripts using [OpenRouter](https://openrouter.ai).

## Changing models

Change the model you want to use by configuring `modelName` in `index.ts`. You can use models from OpenAI, Anthropic, Google, and more. See the [OpenRouter docs](https://openrouter.ai/docs) for all the options.

## OAuth

You can let users use [OpenRouter OAuth](https://openrouter.ai/docs#oauth) to authenticate and pay for models instead of using your own key. This example doesn't include that code yet (PRs welcome), but you can find an example in Python + Streamlit [here](https://github.com/alexanderatallah/openrouter-streamlit).
