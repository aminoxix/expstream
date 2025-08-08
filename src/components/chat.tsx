"use client";

import { useStreamChat } from "@/context/stream-chat-provider";
import { WorkspaceController } from "@/context/workspace-controller";
import { createTokenProvider } from "@/utils/streamClient";
import { useCallback, useEffect, useState } from "react";
import type {
  LocalMessage,
  Message,
  SendMessageOptions,
  Channel as StreamChannel,
} from "stream-chat";
import { Chat, MessageInputProps } from "stream-chat-react";
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
  selectedChannel?: StreamChannel; // Optional channel passed from parent
}) {
  const client = useStreamChat();

  const [channel, setChannel] = useState<StreamChannel | undefined>(
    selectedChannel
  );
  const [customColor, setCustomColor] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  // const [isModalOpen, setIsModalOpen] = useState(false);
  // const [channelName, setChannelName] = useState("");
  // const [users, setUsers] = useState<UserResponse[]>([]);

  // Initialize chat if no selected channel is provided
  useEffect(() => {
    if (!client) {
      setError("Chat client not initialized");
      return;
    }

    if (selectedChannel) {
      // Use the selected channel from parent
      setChannel(selectedChannel);
      const storedColor = localStorage.getItem(`color_${userId}`);
      const newColor = storedColor || createCustomColor();
      setCustomColor(newColor);
      localStorage.setItem(`color_${userId}`, newColor);
      return;
    }

    const initializeChat = async () => {
      try {
        const token = createTokenProvider(userId);
        await client.connectUser({ id: userId, name: userName }, token);

        // Create default channel
        const chatChannel = client.channel("team", userName.toLowerCase(), {
          members: [userId],
        });
        await chatChannel.create();
        await chatChannel.watch();

        const storedColor = localStorage.getItem(`color_${userId}`);
        const newColor = storedColor || createCustomColor();
        setCustomColor(newColor);
        localStorage.setItem(`color_${userId}`, newColor);
        setChannel(chatChannel);
      } catch (err) {
        console.error("[MyChat] Initialization error:", err);
        setError(
          "Failed to initialize chat: " +
            (err instanceof Error ? err.message : "Unknown error")
        );
      }
    };

    initializeChat();

    return () => {
      client.disconnectUser();
    };
  }, [client, userId, userName, selectedChannel]);

  // Handle channel creation
  // const handleCreateChannel = async (e: React.FormEvent) => {
  //   e.preventDefault();
  //   if (!client || !channelName) {
  //     setError("Channel name is required");
  //     return;
  //   }

  //   try {
  //     const newChannel = client.channel("team", channelName.toLowerCase(), {
  //       members: [userId],
  //     });
  //     await newChannel.create();
  //     await newChannel.watch();
  //     setChannel(newChannel);
  //     setIsModalOpen(false);
  //     setChannelName("");
  //   } catch (err) {
  //     console.error("[MyChat] Failed to create channel:", err);
  //     setError(
  //       "Failed to create channel: " +
  //         (err instanceof Error ? err.message : "Unknown error")
  //     );
  //   }
  // };

  const submitHandler: MessageInputProps["overrideSubmitHandler"] = useCallback(
    async (params: {
      cid: string;
      localMessage: LocalMessage;
      message: Message;
      sendOptions: SendMessageOptions;
    }) => {
      try {
        await channel?.sendMessage(
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
    [channel, customColor, isStreamer]
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
                {/* Sidebar content */}
                <Sidebar />
              </div>
            </ResizablePanel>

            <ResizablePanel className="flex-1 min-w-0">
              <ChannelContainer
                // channel={channel}
                setChatExpanded={setChatExpanded}
                submitHandler={submitHandler}
              />
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
