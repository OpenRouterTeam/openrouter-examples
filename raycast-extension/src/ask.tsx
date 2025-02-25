import { useState, useEffect } from "react";
import {
  Action,
  ActionPanel,
  Form,
  Toast,
  showToast,
  useNavigation,
  Icon,
  getPreferenceValues,
} from "@raycast/api";
import { useOpenRouter } from "./hooks/useOpenRouter";
import { Model } from "./types";
import { useModels } from "./hooks/useModels";

interface FormValues {
  question: string;
  model: string;
}

interface Preferences {
  defaultModel: string;
}

export default function Ask() {
  const { ask, isLoading } = useOpenRouter();
  const { models, isLoading: isLoadingModels, error: modelsError } = useModels();
  const [selectedModel, setSelectedModel] = useState<string>("");
  const { pop } = useNavigation();
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
    if (models.length > 0 && !selectedModel) {
      // Try to find the default model from preferences
      const defaultModel = models.find((model: Model) => model.name === preferences.defaultModel);
      if (defaultModel) {
        setSelectedModel(defaultModel.name);
      } else {
        // Otherwise use the first model
        setSelectedModel(models[0].name);
      }
    }
  }, [models, selectedModel, preferences.defaultModel]);

  async function handleSubmit(values: FormValues) {
    if (!values.question.trim()) {
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
      await ask(values.question, values.model || selectedModel);

      toast.style = Toast.Style.Success;
      toast.title = "Got your answer!";

      // Here you could navigate to a detail view showing the answer
      // For now, we'll just pop back to the previous screen
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to get answer";
      toast.message = error instanceof Error ? error.message : "Unknown error";
    }
  }

  return (
    <Form
      isLoading={isLoading || isLoadingModels}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Ask" icon={Icon.Bubble} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="question"
        title="Question"
        placeholder="What would you like to ask?"
        enableMarkdown
        autoFocus
      />

      <Form.Dropdown id="model" title="Model" defaultValue={selectedModel}>
        {models.map((model: Model) => (
          <Form.Dropdown.Item key={model.id} value={model.name} title={model.name} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
