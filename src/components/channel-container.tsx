"use client";

import { ADMIN_WORKSPACE_KINDS } from "@/config/constants";
import { useWorkspaceController } from "@/context/workspace-controller";
import { WorkspaceKind } from "@/types/workspace";
import type {
  LocalMessage,
  Message,
  SendMessageOptions,
  Channel as StreamChannel,
} from "stream-chat";
import {
  Channel,
  LoadingIndicator,
  MessageInput,
  SimpleReactionsList,
  Thread,
  ThreadHeader,
  useChatContext,
  VirtualizedMessageList,
  Window,
  type MessageContextValue,
} from "stream-chat-react";
import "stream-chat-react/dist/css/v2/index.css";
import { AdminPanel } from "./admin/panel";
import { TeamMessageInput } from "./custom-input";
import { EmptyChannel } from "./empty-channel";
import { TeamMessage } from "./message";
import { PinnedMessageList } from "./pinned-message-list";
import { TeamChannelHeader } from "./team-channel-header";

const FrozenChannelInput = () => (
  <div className="str-chat__input-flat str-chat__input-flat--send-button-active p-4 bg-gray-50 border-t border-gray-200">
    <div className="text-center text-sm text-gray-500">
      This channel is frozen. Messages cannot be sent.
    </div>
  </div>
);

interface IChannelContainer {
  showHeader?: boolean;
  showMessageInput?: boolean;
  submitHandler: (params: {
    cid: string;
    localMessage: LocalMessage;
    message: Message;
    sendOptions: SendMessageOptions;
  }) => Promise<void> | void;
  setActiveChannel?: (channel: StreamChannel | undefined) => void;
  type?: "messaging" | "announcement" | "team" | "survey";
  Message?: React.ComponentType<Partial<MessageContextValue>>;
  onBack?: () => void;
  threadOverlay?: boolean;
}

const isAdminWorkspace = (kind: WorkspaceKind): boolean => {
  return (ADMIN_WORKSPACE_KINDS as readonly string[]).includes(kind);
};

export function ChannelContainer({
  type,
  showHeader = true,
  showMessageInput = true,
  submitHandler,
  setActiveChannel,
  Message: CustomMessage,
  onBack,
  threadOverlay,
}: IChannelContainer) {
  const { channel } = useChatContext();
  const { activeWorkspace } = useWorkspaceController();

  if (isAdminWorkspace(activeWorkspace.kind)) {
    return <AdminPanel setActiveChannel={setActiveChannel} />;
  }

  const MessageComponent = CustomMessage || TeamMessage;

  return (
    <div
      className={`size-full flex-1 flex flex-col relative${threadOverlay ? " str-chat--thread-overlay" : ""}`}
    >
      <Channel
        channel={channel}
        EmptyStateIndicator={EmptyChannel}
        LoadingIndicator={LoadingIndicator}
        ReactionsList={SimpleReactionsList}
        ThreadHeader={ThreadHeader}
      >
        <Window>
          {showHeader && <TeamChannelHeader onBack={onBack} />}

          <div className="flex-1 overflow-hidden my-4 md:my-7">
            <VirtualizedMessageList Message={MessageComponent} />
          </div>

          {showMessageInput && (
            <div className="flex-shrink-0">
              <MessageInput
                minRows={1}
                maxRows={8}
                overrideSubmitHandler={submitHandler}
                Input={
                  !channel?.data?.frozen ? TeamMessageInput : FrozenChannelInput
                }
              />
            </div>
          )}
        </Window>
        <Thread
          Message={MessageComponent}
          additionalMessageInputProps={{ maxRows: 8, minRows: 1 }}
        />
        <PinnedMessageList />
      </Channel>
    </div>
  );
}

export default ChannelContainer;
