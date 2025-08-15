// src/components/ChannelContainer.tsx
"use client";

import { useWorkspaceController } from "@/context/workspace-controller";
import { WorkspaceKind } from "@/types/workspace";
import {
  LocalMessage,
  Message,
  SendMessageOptions,
  Channel as StreamChannel,
} from "stream-chat";
import {
  Channel,
  LoadingIndicator,
  MessageInput,
  MessageList,
  SimpleReactionsList,
  Thread,
  ThreadHeader,
  useChatContext,
  Window,
} from "stream-chat-react";
import "stream-chat-react/dist/css/v2/index.css";
import { AdminPanel } from "./admin/panel";
import { TeamMessageInput } from "./custom-input";
import { EmptyChannel } from "./empty-channel";
import { TeamMessage } from "./message";
import { PinnedMessageList } from "./pinned-message-list";
import { TeamChannelHeader } from "./team-channel-header";

interface IChannelContainer {
  setChatExpanded?: (expanded: boolean) => void;
  submitHandler: (params: {
    cid: string;
    localMessage: LocalMessage;
    message: Message;
    sendOptions: SendMessageOptions;
  }) => Promise<void> | void;
  setActiveChannel?: (channel: StreamChannel | undefined) => void;
}

// Define admin workspace kinds as a constant array
const ADMIN_WORKSPACE_KINDS: WorkspaceKind[] = [
  WorkspaceKind.AdminChannelEdit,
  WorkspaceKind.AdminChannelCreateTeam,
  WorkspaceKind.AdminChannelCreateMessaging,
];

// Helper function to check if a workspace is admin-related
const isAdminWorkspace = (kind: WorkspaceKind): boolean => {
  return ADMIN_WORKSPACE_KINDS.includes(kind);
};

function ChannelContainer({
  submitHandler,
  setActiveChannel,
}: IChannelContainer) {
  const { channel } = useChatContext();
  const { activeWorkspace } = useWorkspaceController();

  if (isAdminWorkspace(activeWorkspace.kind)) {
    return <AdminPanel setActiveChannel={setActiveChannel} />;
  }

  return (
    <div className="p-4 w-full">
      <Channel
        channel={channel}
        EmptyStateIndicator={EmptyChannel}
        LoadingIndicator={LoadingIndicator}
        ReactionsList={SimpleReactionsList}
        ThreadHeader={ThreadHeader}
      >
        <Window>
          <TeamChannelHeader />
          <MessageList disableQuotedMessages={true} Message={TeamMessage} />
          <MessageInput
            minRows={1}
            maxRows={8}
            Input={TeamMessageInput}
            overrideSubmitHandler={submitHandler}
          />
        </Window>
        <Thread additionalMessageInputProps={{ maxRows: 8, minRows: 1 }} />
        <PinnedMessageList />
      </Channel>
    </div>
  );
}

export default ChannelContainer;
