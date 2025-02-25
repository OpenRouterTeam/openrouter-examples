import { useState, useEffect } from "react";
import {
  Action,
  ActionPanel,
  List,
  Toast,
  showToast,
  Icon,
  Detail,
  useNavigation,
  getPreferenceValues,
} from "@raycast/api";
import { useConversation } from "./hooks/useConversation";
import { useModels } from "./hooks/useModels";
import { Chat, Model } from "./types";

interface Preferences {
  defaultModel: string;
}

export default function Conversation() {
  const { conversation, addChat, clearConversation, updateModel, isLoading } = useConversation();
  const { models, isLoading: isLoadingModels, error: modelsError } = useModels();
  const [question, setQuestion] = useState<string>("");
  const [, setSelectedChat] = useState<Chat | null>(null);
  const { push } = useNavigation();
  const preferences = getPreferenceValues<Preferences>();

  useEffect(() => {
    if (modelsError) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load models",
        message: modelsError.message,
      });
    }
  }, [modelsError]);

  useEffect(() => {
    if (models.length > 0 && conversation.model.name === "Default") {
      // Try to find the default model from preferences
      const defaultModel = models.find((model: Model) => model.name === preferences.defaultModel);
      if (defaultModel) {
        updateModel({
          id: defaultModel.id,
          name: defaultModel.name,
          created_at: defaultModel.created_at,
          updated_at: defaultModel.updated_at,
        });
      } else {
        // Otherwise use the first model
        updateModel({
          id: models[0].id,
          name: models[0].name,
          created_at: models[0].created_at,
          updated_at: models[0].updated_at,
        });
      }
    }
  }, [models, conversation.model.name, preferences.defaultModel, updateModel]);

  async function handleSubmit() {
    if (!question.trim()) {
      showToast({
        style: Toast.Style.Failure,
        title: "Question is required",
      });
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Getting your answer...",
    });

    try {
      await addChat(question);
      setQuestion("");

      toast.style = Toast.Style.Success;
      toast.title = "Got your answer!";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to get answer";
      toast.message = error instanceof Error ? error.message : "Unknown error";
    }
  }

  function handleChatSelect(chat: Chat) {
    setSelectedChat(chat);

    // Navigate to detail view
    push(
      <Detail
        markdown={`# ${chat.question}\n\n${chat.answer}`}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard
              title="Copy Answer"
              content={chat.answer}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action
              title="Back to Conversation"
              icon={Icon.ArrowLeft}
              onAction={() => push(<Conversation />)}
              shortcut={{ modifiers: ["cmd"], key: "b" }}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading || isLoadingModels}
      searchBarPlaceholder="Ask a question..."
      searchText={question}
      onSearchTextChange={setQuestion}
      actions={
        <ActionPanel>
          <Action title="Ask" icon={Icon.Bubble} onAction={handleSubmit} />
          <Action
            title="Clear Conversation"
            icon={Icon.Trash}
            onAction={() => {
              clearConversation();
              showToast({
                style: Toast.Style.Success,
                title: "Conversation cleared",
              });
            }}
          />
          <ActionPanel.Submenu title="Change Model" icon={Icon.Gear}>
            {models.map((model: Model) => (
              <Action
                key={model.id}
                title={model.name}
                onAction={() => {
                  updateModel(model);
                  showToast({
                    style: Toast.Style.Success,
                    title: `Model changed to ${model.name}`,
                  });
                }}
              />
            ))}
          </ActionPanel.Submenu>
        </ActionPanel>
      }
    >
      <List.Section title="Current Model" subtitle={conversation.model.name}>
        {conversation.chats.map((chat: Chat) => (
          <List.Item
            key={chat.id}
            title={chat.question}
            subtitle={chat.answer.substring(0, 60) + (chat.answer.length > 60 ? "..." : "")}
            actions={
              <ActionPanel>
                <Action title="View" onAction={() => handleChatSelect(chat)} />
                <Action.CopyToClipboard title="Copy Answer" content={chat.answer} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
