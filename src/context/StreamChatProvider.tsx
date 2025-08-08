"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { StreamChat } from "stream-chat";

const StreamChatContext = createContext<StreamChat | null>(null);

export function StreamChatProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [client, setClient] = useState<StreamChat | null>(null);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY;
    if (!apiKey) {
      console.error("[StreamChatProvider] Stream API key is not set");
      return;
    }
    const chatClient = new StreamChat(apiKey);
    setClient(chatClient);
    return () => {
      chatClient.disconnectUser();
    };
  }, []);

  return (
    <StreamChatContext.Provider value={client}>
      {children}
    </StreamChatContext.Provider>
  );
}

export const useStreamChat = () => {
  const client = useContext(StreamChatContext);
  if (!client) {
    console.warn("[useStreamChat] Client not initialized");
  }
  return client;
};
