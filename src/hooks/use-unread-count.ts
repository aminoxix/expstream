"use client";

import { StreamChatManager } from "@/utils/stream-chat-manager";
import { useCallback, useEffect, useState } from "react";
import type { OwnUserResponse } from "stream-chat";
import { useStreamChat } from "./use-stream-chat";

export interface UseUnreadCountReturn {
  /** Total number of unread messages across all channels */
  totalUnread: number;
  /** Number of channels with unread messages */
  unreadChannels: number;
  /** Whether there are any unread messages */
  hasUnread: boolean;
}

function isOwnUser(user: unknown): user is OwnUserResponse {
  return (
    typeof user === "object" && user !== null && "total_unread_count" in user
  );
}

/**
 * Hook to track unread message counts from the Stream Chat singleton.
 * Works without the Chat provider — uses the singleton client directly.
 * Returns zero counts when the client is not connected.
 */
export function useUnreadCount(): UseUnreadCountReturn {
  const { isConnected } = useStreamChat();
  const manager = StreamChatManager.getInstance();
  const client = manager.getClient();

  const getUnreadState = useCallback(() => {
    if (!isConnected || !client.user || !isOwnUser(client.user)) {
      return { totalUnread: 0, unreadChannels: 0, hasUnread: false };
    }

    const totalUnread = client.user.total_unread_count ?? 0;
    const unreadChannels = client.user.unread_channels ?? 0;

    return {
      totalUnread,
      unreadChannels,
      hasUnread: totalUnread > 0,
    };
  }, [isConnected, client]);

  const [state, setState] = useState<UseUnreadCountReturn>(getUnreadState);

  // Sync state when connection status changes
  useEffect(() => {
    setState(getUnreadState());
  }, [getUnreadState]);

  // Subscribe to events that affect unread counts
  useEffect(() => {
    if (!isConnected) return;

    const handleUnreadUpdate = () => {
      setState(getUnreadState());
    };

    const subscriptions = [
      client.on("message.new", handleUnreadUpdate),
      client.on("message.read", handleUnreadUpdate),
      client.on("notification.message_new", handleUnreadUpdate),
      client.on("notification.mark_read", handleUnreadUpdate),
    ];

    return () => {
      subscriptions.forEach((sub) => sub.unsubscribe());
    };
  }, [client, isConnected, getUnreadState]);

  return state;
}
