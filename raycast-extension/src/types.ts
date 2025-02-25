import { Dispatch, SetStateAction } from "react";

export type SetState<T> = Dispatch<SetStateAction<T>>;

export interface Message {
  role: string;
  content: string;
  name?: string;
}

export interface Question {
  id: string;
  question: string;
  created_at: string;
}

export interface Chat extends Question {
  answer: string;
}

export interface SavedChat extends Chat {
  saved_at?: string;
}

export interface Conversation {
  id: string;
  model: Model;
  chats: Chat[];
  updated_at: string;
  created_at: string;
  pinned: boolean;
}

export interface Model {
  id: string;
  updated_at: string;
  created_at: string;
  name: string;
}

export interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  context_length?: number;
  pricing?: {
    prompt?: string;
    completion?: string;
  };
}

export interface OpenRouterResponse {
  id: string;
  choices: {
    message: {
      content: string;
      role: string;
      function_call?: unknown;
      tool_calls?: unknown;
    };
    finish_reason: string;
    index: number;
  }[];
  created: number;
  model: string;
  object: string;
  usage: {
    completion_tokens: number;
    prompt_tokens: number;
    total_tokens: number;
  };
}

export interface StructuredOutput<T> {
  format: "json";
  schema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
  response: T;
}
