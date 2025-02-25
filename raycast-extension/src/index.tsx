import { ActionPanel, List, Action } from "@raycast/api";
import Ask from "./ask";
import Conversation from "./conversation";

export default function Command() {
  return (
    <List>
      <List.Item
        title="Ask Question"
        subtitle="Ask OpenRouter AI a question"
        actions={
          <ActionPanel>
            <Action.Push title="Open" target={<Ask />} />
          </ActionPanel>
        }
      />
      <List.Item
        title="Conversation"
        subtitle="Have a conversation with OpenRouter AI"
        actions={
          <ActionPanel>
            <Action.Push title="Open" target={<Conversation />} />
          </ActionPanel>
        }
      />
    </List>
  );
}
