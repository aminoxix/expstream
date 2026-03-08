"use client";

import { generateDMChannelId } from "@/utils/channel-id-generator";
import { analyzeChatError } from "@/utils/chat-error-handler";
import { useCallback, useEffect, useState } from "react";
import type { Channel, StreamChat, User } from "stream-chat";

export interface UseDMChannelConfig {
  client: StreamChat | null;

  // DM channel ID prefix
  prefix?: string;

  currentUserId: string;
  targetUserId: string;
  currentUserData?: Partial<User>;
  targetUserData?: Partial<User>;
}

export interface UseDMChannelReturn {
  channel: Channel | null;
  isLoading: boolean;
  error: string | null;
  createOrGetChannel: () => Promise<Channel | null>;
  retryConnection: () => void;
}

export function useDMChannel({
  client,
  prefix,
  currentUserId,
  targetUserId,
  currentUserData = {},
  targetUserData = {},
}: UseDMChannelConfig): UseDMChannelReturn {
  const [channel, setChannel] = useState<Channel | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUnrecoverableError, setIsUnrecoverableError] = useState(false);

  const createOrGetChannel = useCallback(async (): Promise<Channel | null> => {
    if (!client || !currentUserId || !targetUserId) {
      const error = "Missing required dependencies for DM channel creation";
      setError(error);
      return null;
    }

    if (isUnrecoverableError) {
      return null;
    }

    if (currentUserId === targetUserId) {
      setError("Cannot create DM channel with yourself");
      return null;
    }

    if (!client.userID) {
      const error = "Stream Chat client is not connected";
      setError(error);
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const channelId = generateDMChannelId(
        [currentUserId, targetUserId],
        prefix,
      );

      const dmChannel = client.channel("messaging", channelId, {
        members: [currentUserId, targetUserId],
        name: `DM: ${currentUserData.name || currentUserId} & ${targetUserData.name || targetUserId}`,
        created_by: { id: currentUserId },
      });

      try {
        await dmChannel.watch();
      } catch (e: unknown) {
        const err = e as { code?: number; message?: string };
        if (err.code === 16 || /not found/i.test(err.message ?? "")) {
          await dmChannel.create();
          await dmChannel.watch();
          await new Promise((resolve) => setTimeout(resolve, 500));
        } else {
          throw e;
        }
      }

      setChannel(dmChannel);
      return dmChannel;
    } catch (err) {
      const errorInfo = analyzeChatError(err);

      setError(errorInfo.message || "Failed to create DM channel");

      if (!errorInfo.isRecoverable || errorInfo.action === "contact_support") {
        setIsUnrecoverableError(true);
      }

      return null;
    } finally {
      setIsLoading(false);
    }
  }, [
    client,
    currentUserId,
    targetUserId,
    currentUserData,
    targetUserData,
    isUnrecoverableError,
    prefix,
  ]);

  const retryConnection = useCallback(() => {
    setError(null);
    setIsUnrecoverableError(false);
    createOrGetChannel();
  }, [createOrGetChannel]);

  useEffect(() => {
    if (
      client &&
      client.userID &&
      currentUserId &&
      targetUserId &&
      !channel &&
      !isLoading &&
      !isUnrecoverableError
    ) {
      const timer = setTimeout(createOrGetChannel, 100);
      return () => clearTimeout(timer);
    }
  }, [
    client,
    currentUserId,
    targetUserId,
    channel,
    isLoading,
    isUnrecoverableError,
    createOrGetChannel,
  ]);

  useEffect(() => {
    return () => {
      if (channel) {
        channel.stopWatching().catch(() => {});
      }
    };
  }, [channel]);

  return {
    channel,
    isLoading,
    error,
    createOrGetChannel,
    retryConnection,
  };
}
