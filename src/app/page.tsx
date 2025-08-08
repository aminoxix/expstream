"use client";

import MyChat from "@/components/MyChat";
import { useStreamChat } from "@/context/StreamChatProvider";
import { redirect } from "next/navigation";
import { BaseSyntheticEvent, useEffect, useState } from "react";
import { Channel, ChannelFilters, ChannelSort } from "stream-chat";

export default function Dashboard() {
  const client = useStreamChat();
  const [chatExpanded, setChatExpanded] = useState(true);
  const [user, setUser] = useState<{
    userId: string;
    fullName?: string;
  } | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);

  // Sidebar filters and options
  const filters: ChannelFilters[] = [
    { type: "channel" }, // Only team channels
  ];

  const options = { state: true, watch: true, presence: true, limit: 10 };
  const sort: ChannelSort = { last_message_at: -1, updated_at: -1 };

  // Mock WorkspaceController for channel creation
  const displayWorkspace = (workspace: string) => {
    console.log(`[Dashboard] Displaying workspace: ${workspace}`);
    // In a real app, this would trigger the channel creation modal
  };

  // Adapt setSelectedChannel to match ChannelPreviewProps
  const handleSetActiveChannel = (
    newChannel?: Channel,
    _watchers?: { limit?: number; offset?: number },
    _event?: BaseSyntheticEvent
  ) => {
    setSelectedChannel(newChannel || null);
  };

  // Check for user in localStorage
  const getUserFromStorage = () => {
    if (typeof window === "undefined") return null;
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        return JSON.parse(storedUser);
      } catch (err) {
        console.error("Failed to parse stored user:", err);
        localStorage.removeItem("user");
      }
    }
    return null;
  };

  // Load user on mount
  useEffect(() => {
    const storedUser = getUserFromStorage();
    if (!storedUser) {
      redirect("/create"); // Redirect to form if no user
    } else {
      setUser(storedUser);
    }
  }, []);

  // Log client initialization issues
  useEffect(() => {
    if (!client) {
      console.warn("[Dashboard] StreamChat client is not initialized");
      setClientError(
        "Failed to initialize chat client. Please check your Stream API key."
      );
    } else {
      setClientError(null);
    }
  }, [client]);

  // Show loading or error while checking user or client
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
        <MyChat
          userId={user.userId}
          userName={user.fullName || user.userId}
          isStreamer={true}
          // setChatExpanded={setChatExpanded}
          // selectedChannel={selectedChannel}
        />
      </section>
    </div>
  );
}
