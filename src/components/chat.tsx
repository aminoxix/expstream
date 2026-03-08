"use client";

import { WorkspaceController } from "@/context/workspace-controller";
import { useStreamChat } from "@/hooks/use-stream-chat";
import { useCallback, useState } from "react";
import type {
  LocalMessage,
  Message,
  SendMessageOptions,
  Channel as StreamChannel,
} from "stream-chat";
import { Chat, type MessageInputProps } from "stream-chat-react";
import "stream-chat-react/dist/css/v2/index.css";
import ChannelContainer from "./channel-container";
import { ChatEmptyState } from "./chat-empty-state";
import { ResponsiveChatLayout } from "./responsive-chat-layout";
import { EnhancedSidebar } from "./sidebar";

export default function MyChat({ userId }: { userId: string }) {
  const { client } = useStreamChat();
  const [channel, setChannel] = useState<StreamChannel | undefined>(undefined);

  const submitHandler: MessageInputProps["overrideSubmitHandler"] = useCallback(
    async (params: {
      cid: string;
      localMessage: LocalMessage;
      message: Message;
      sendOptions: SendMessageOptions;
    }) => {
      try {
        if (!channel) {
          throw new Error("No active channel selected");
        }
        await channel.sendMessage(
          {
            text: params.localMessage.text,
            user_id: params.localMessage.user_id,
          },
          params.sendOptions,
        );
      } catch (err: unknown) {
        console.error("[MyChat] Failed to send message:", err);
      }
    },
    [channel],
  );

  if (!client) return <div>Setting up client & connection...</div>;

  return (
    <div className="h-screen w-screen overflow-hidden bg-gray-50 text-black">
      <Chat client={client}>
        <WorkspaceController>
          <ResponsiveChatLayout
            selectedChannel={channel}
            setActiveChannel={setChannel}
            renderSidebar={() => (
              <EnhancedSidebar
                setActiveChannel={setChannel}
                currentUserId={userId}
              />
            )}
            renderChat={() => (
              <ChannelContainer
                submitHandler={submitHandler}
                setActiveChannel={setChannel}
                onBack={() => setChannel(undefined)}
              />
            )}
            renderEmptyState={() => <ChatEmptyState />}
          />
        </WorkspaceController>
      </Chat>
    </div>
  );
}
