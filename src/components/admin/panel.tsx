// src/components/admin-panel.tsx
"use client";

import { useWorkspaceController } from "@/context/workspace-controller";
import { WorkspaceFactory, WorkspaceKind } from "@/types";
import { getChannelDisplayName } from "@/utils/helpers";
import { useCallback } from "react";
import { Channel as StreamChannel } from "stream-chat";
import { useChatContext } from "stream-chat-react";
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
    [displayWorkspace, setActiveChannel],
  );

  let defaultFormValues: FormValues = { name: "", members: [] };
  let Form: React.ComponentType | null = null;

  switch (activeWorkspace.kind) {
    case WorkspaceKind.AdminChannelCreateTeam:
    case WorkspaceKind.AdminChannelCreateMessaging:
      defaultFormValues = {
        members: client.user?.id ? [client.user?.id] : [],
        name: "",
      };
      Form = CreateChannel;
      break;
    case WorkspaceKind.AdminChannelEdit:
      defaultFormValues = {
        members: channel?.state?.members
          ? Object.keys(channel.state.members).filter(
              (id) => id !== client.user?.id,
            )
          : [],
        name: getChannelDisplayName(channel!) || "random",
      };
      Form = EditChannel;
      break;
    case WorkspaceKind.Chat:
    default:
      return null;
  }

  return (
    <AdminPanelForm
      workspace={activeWorkspace}
      onSubmit={onSubmit}
      defaultValues={defaultFormValues}
    >
      <div className="w-full h-full p-4">{Form ? <Form /> : null}</div>
    </AdminPanelForm>
  );
};
