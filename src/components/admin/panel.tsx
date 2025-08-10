// src/components/admin-panel.tsx
"use client";

import { WorkspaceFactory, WorkspaceKind } from "@/types";
import { useCallback } from "react";
import { Channel as StreamChannel } from "stream-chat";
import { useChatContext } from "stream-chat-react";
import { useWorkspaceController } from "../../context/workspace-controller";
import { AdminPanelForm, FormValues } from "./context/form";
import { CreateChannel } from "./create-channel";
import { EditChannel } from "./edit-channel";

interface AdminPanelProps {
  setActiveChannel?: (channel: StreamChannel | undefined) => void;
}

export const AdminPanel = ({ setActiveChannel }: AdminPanelProps) => {
  const { client, channel } = useChatContext();
  const { displayWorkspace, activeWorkspace } = useWorkspaceController();

  const onSubmit = useCallback(
    (newChannel?: StreamChannel) => {
      displayWorkspace(WorkspaceFactory.createChat());
      if (newChannel && setActiveChannel) {
        setActiveChannel(newChannel);
      }
    },
    [displayWorkspace, setActiveChannel]
  );

  let defaultFormValues: FormValues = { name: "", members: [] };
  let Form: React.ComponentType | null = null;

  switch (activeWorkspace.kind) {
    case WorkspaceKind.AdminChannelCreateTeam:
    case WorkspaceKind.AdminChannelCreateMessaging:
      defaultFormValues = {
        members: client.userID ? [client.userID] : [],
        name: "",
      };
      Form = CreateChannel;
      break;
    case WorkspaceKind.AdminChannelEdit:
      defaultFormValues = {
        members: [],
        name: channel?.data?.name || channel?.id || "",
      };
      Form = EditChannel;
      break;
    case WorkspaceKind.Chat:
    default:
      // For Chat or unknown workspaces, don't render a form
      return null;
  }

  return (
    <AdminPanelForm
      workspace={activeWorkspace}
      onSubmit={onSubmit}
      defaultValues={defaultFormValues}
    >
      <div className="w-full h-full p-4">{Form && <Form />}</div>
    </AdminPanelForm>
  );
};
