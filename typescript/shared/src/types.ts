/**
 * Shared TypeScript types for OpenRouter examples
 */

/**
 * Cache control configuration for Anthropic caching
 */
export interface CacheControl {
  type: 'ephemeral';
}

/**
 * Text content block with optional cache control
 */
export interface TextContent {
  type: 'text';
  text: string;
  cache_control?: CacheControl;
}

/**
 * Message roles in chat completions
 */
export type MessageRole = 'system' | 'user' | 'assistant';

/**
 * Chat message with content
 */
export interface Message {
  role: MessageRole;
  content: string | TextContent[];
}

/**
 * OpenAI-compatible usage metrics
 * (OpenRouter transforms Anthropic's native format to this)
 */
export interface Usage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  prompt_tokens_details?: {
    cached_tokens?: number; // Also called cached_input_tokens
    cache_creation_input_tokens?: number;
    audio_tokens?: number;
  };
  completion_tokens_details?: {
    reasoning_tokens?: number;
  };
}

/**
 * Chat completion response (OpenAI-compatible format)
 */
export interface ChatCompletionResponse {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: Usage;
}

/**
 * Stream options for usage tracking
 */
export interface StreamOptions {
  include_usage: boolean;
}
