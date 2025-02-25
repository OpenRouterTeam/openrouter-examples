import { useState, useCallback } from "react";
import { Conversation, Model } from "../types";
import { v4 as uuidv4 } from "uuid";
import { useOpenRouter } from "./useOpenRouter";

export function useConversation(initialConversation?: Conversation) {
  const [conversation, setConversation] = useState<Conversation>(
    initialConversation || {
      id: uuidv4(),
      model: {
        id: uuidv4(),
        name: "Default",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      chats: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      pinned: false,
    }
  );

  const { ask, isLoading } = useOpenRouter();

  const addChat = useCallback(
    async (question: string, model?: Model) => {
      try {
        const modelToUse = model || conversation.model;
        const chat = await ask(question, modelToUse.name);

        setConversation((prev) => {
          const updatedChats = [...prev.chats, chat];
          return {
            ...prev,
            chats: updatedChats,
            updated_at: new Date().toISOString(),
          };
        });

        return chat;
      } catch (error) {
        console.error("Error adding chat:", error);
        throw error;
      }
    },
    [ask, conversation.model]
  );

  const clearConversation = useCallback(() => {
    setConversation((prev) => ({
      ...prev,
      chats: [],
      updated_at: new Date().toISOString(),
    }));
  }, []);

  const updateModel = useCallback((model: Model) => {
    setConversation((prev) => ({
      ...prev,
      model,
      updated_at: new Date().toISOString(),
    }));
  }, []);

  const togglePin = useCallback(() => {
    setConversation((prev) => ({
      ...prev,
      pinned: !prev.pinned,
      updated_at: new Date().toISOString(),
    }));
  }, []);

  return {
    conversation,
    addChat,
    clearConversation,
    updateModel,
    togglePin,
    isLoading,
  };
}
