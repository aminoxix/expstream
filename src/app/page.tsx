"use client";

import Chat from "@/components/chat";
import { useStreamChat } from "@/context/stream-chat-provider";
import { getUserFromStorage } from "@/lib/utils";
import { createTokenProvider } from "@/utils/streamClient";
import { redirect } from "next/navigation";
import { useEffect, useState } from "react";
import { Channel } from "stream-chat";

export default function Dashboard() {
  const client = useStreamChat();
  const [chatExpanded, setChatExpanded] = useState(true);
  const [user, setUser] = useState<{
    userId: string;
    fullName?: string;
    token?: string;
  } | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<Channel | undefined>(
    undefined
  );
  const [clientError, setClientError] = useState<string | null>(null);

  // Load user and connect client
  useEffect(() => {
    const storedUser = getUserFromStorage();
    if (!storedUser) {
      redirect("/create");
    } else {
      setUser(storedUser);
    }

    if (!client || !storedUser) return;

    const connectClient = async () => {
      try {
        const token = await createTokenProvider(storedUser.userId)();

        await client.connectUser(
          {
            id: storedUser.userId,
            name: storedUser.fullName || storedUser.userId,
            image: storedUser.imageUrl || undefined,
          },
          token
        );

        // Initialize default channel after connection
        const channel = client.channel("team", `${storedUser.userId}-default`, {
          members: [storedUser.userId],
          name: `${storedUser.fullName || storedUser.userId}'s Channel`,
        });
        await channel.create();
        await channel.watch();
        setSelectedChannel(channel);
      } catch (err) {
        console.error(
          "[Dashboard] Failed to connect client or initialize channel:",
          err
        );
        setClientError("Failed to initialize chat client or channel.");
      }
    };

    connectClient();

    return () => {
      client.disconnectUser();
    };
  }, [client]);

  if (!user || !client) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        {clientError ? (
          <div className="text-red-500 text-center">{clientError}</div>
        ) : (
          <h1 className="text-gray-800 text-lg">Loading...</h1>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <section className="flex-1">
        <Chat
          userId={user.userId}
          userName={user.fullName || user.userId}
          isStreamer={true}
          setChatExpanded={setChatExpanded}
          selectedChannel={selectedChannel}
        />
      </section>
    </div>
  );
}
