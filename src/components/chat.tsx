"use client";

import { useStreamChat } from "@/context/stream-chat-provider";
import { WorkspaceController } from "@/context/workspace-controller";
import { useCallback, useEffect, useState } from "react";
import type {
  LocalMessage,
  Message,
  SendMessageOptions,
  Channel as StreamChannel,
} from "stream-chat";
import {
  Chat,
  MessageInputProps,
  Channel as StreamChannelComponent,
  useChatContext,
} from "stream-chat-react";
import "stream-chat-react/dist/css/v2/index.css";
import ChannelContainer from "./channel-container";
import { Sidebar } from "./sidebar";
import { ResizablePanel, ResizablePanelGroup } from "./ui/resizable";

export default function MyChat({
  userId,
  userName,
  isStreamer,
  setChatExpanded,
  selectedChannel,
}: {
  userId: string;
  userName: string;
  isStreamer: boolean;
  setChatExpanded?: (expanded: boolean) => void;
  selectedChannel?: StreamChannel | null;
}) {
  const client = useStreamChat();
  const { channel: activeChannel } = useChatContext();
  const [channel, setChannel] = useState<StreamChannel | undefined>(undefined);
  const [customColor, setCustomColor] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);

  // Sync channel state with selectedChannel and activeChannel
  useEffect(() => {
    if (selectedChannel) {
      setChannel(selectedChannel);
    } else if (activeChannel) {
      setChannel(activeChannel);
    }
  }, [selectedChannel, activeChannel]);

  // Set custom color
  useEffect(() => {
    const storedColor = localStorage.getItem(`color_${userId}`);
    const newColor = storedColor || createCustomColor();
    setCustomColor(newColor);
    localStorage.setItem(`color_${userId}`, newColor);
  }, [userId]);

  const submitHandler: MessageInputProps["overrideSubmitHandler"] = useCallback(
    async (params: {
      cid: string;
      localMessage: LocalMessage;
      message: Message;
      sendOptions: SendMessageOptions;
    }) => {
      try {
        const targetChannel = activeChannel || channel;
        if (!targetChannel) {
          throw new Error("No active channel selected");
        }
        await targetChannel.sendMessage(
          {
            text: params.localMessage.text,
            user_id: params.localMessage.user_id,
          },
          params.sendOptions
        );
      } catch (err) {
        console.error("[MyChat] Failed to send message:", err);
        setError(
          "Failed to send message: " +
            (err instanceof Error ? err.message : "Unknown error")
        );
      }
    },
    [channel, activeChannel]
  );

  if (error) return <div>Error: {error}</div>;
  if (!client || !channel) return <div>Setting up client & connection...</div>;

  return (
    <div className="h-screen w-screen overflow-hidden bg-gray-50 text-black">
      <Chat client={client}>
        <WorkspaceController>
          <ResizablePanelGroup direction="horizontal" className="flex h-full">
            <ResizablePanel
              defaultSize={25}
              minSize={15}
              maxSize={35}
              className="border-r bg-white"
            >
              <div className="h-full overflow-y-auto p-4">
                <Sidebar setActiveChannel={setChannel} />
              </div>
            </ResizablePanel>
            <ResizablePanel className="flex-1 min-w-0">
              <StreamChannelComponent channel={channel}>
                <ChannelContainer
                  setChatExpanded={setChatExpanded}
                  submitHandler={submitHandler}
                  setActiveChannel={setChannel}
                />
              </StreamChannelComponent>
            </ResizablePanel>
          </ResizablePanelGroup>
        </WorkspaceController>
      </Chat>
    </div>
  );
}

function createCustomColor(): string {
  const colors = [
    "red",
    "blue",
    "green",
    "yellow",
    "purple",
    "orange",
    "pink",
    "brown",
    "gray",
    "black",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}
