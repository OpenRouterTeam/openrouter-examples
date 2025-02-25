import { getPreferenceValues } from "@raycast/api";
import { useState, useCallback } from "react";
import { Chat, Message, OpenRouterResponse, StructuredOutput } from "../types";
import { v4 as uuidv4 } from "uuid";

interface OpenRouterPreferences {
  apiKey: string;
  defaultModel: string;
}

export function useOpenRouter() {
  const { apiKey, defaultModel } = getPreferenceValues<OpenRouterPreferences>();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchModels = useCallback(async () => {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/models", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Error fetching models: ${response.statusText}`);
      }

      const data = (await response.json()) as { data: unknown };
      return data.data;
    } catch (error) {
      console.error("Error fetching models:", error);
      throw error;
    }
  }, [apiKey]);

  const ask = useCallback(
    async (
      question: string,
      model: string = defaultModel,
      structuredOutputSchema?: Record<string, unknown>
    ): Promise<Chat> => {
      setIsLoading(true);

      try {
        const messages: Message[] = [
          {
            role: "user",
            content: question,
          },
        ];

        const requestBody: Record<string, unknown> = {
          model,
          messages,
        };

        // Add structured output if schema is provided
        if (structuredOutputSchema) {
          requestBody.response_format = {
            type: "json_object",
            schema: structuredOutputSchema,
          };
        }

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            "HTTP-Referer": "https://raycast.com",
            "X-Title": "OpenRouter Raycast Extension",
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          throw new Error(`Error: ${response.statusText}`);
        }

        const data = (await response.json()) as OpenRouterResponse;
        const answer = data.choices[0].message.content;

        return {
          id: uuidv4(),
          question,
          answer,
          created_at: new Date().toISOString(),
        };
      } catch (error) {
        console.error("Error asking question:", error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [apiKey, defaultModel]
  );

  const askWithStructuredOutput = useCallback(
    async <T>(
      question: string,
      schema: Record<string, unknown>,
      model: string = defaultModel
    ): Promise<StructuredOutput<T>> => {
      setIsLoading(true);

      try {
        const messages: Message[] = [
          {
            role: "user",
            content: question,
          },
        ];

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            "HTTP-Referer": "https://raycast.com",
            "X-Title": "OpenRouter Raycast Extension",
          },
          body: JSON.stringify({
            model,
            messages,
            response_format: {
              type: "json_object",
              schema,
            },
          }),
        });

        if (!response.ok) {
          throw new Error(`Error: ${response.statusText}`);
        }

        const data = (await response.json()) as OpenRouterResponse;
        const content = data.choices[0].message.content;

        // Parse the JSON response
        const parsedResponse = JSON.parse(content) as T;

        return {
          format: "json",
          schema: {
            type: "object",
            properties: schema,
          },
          response: parsedResponse,
        };
      } catch (error) {
        console.error("Error asking question with structured output:", error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [apiKey, defaultModel]
  );

  return {
    ask,
    askWithStructuredOutput,
    fetchModels,
    isLoading,
  };
}
