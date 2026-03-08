"use client";

import type { ChannelType } from "@/types/channels";
import { analyzeChatError } from "@/utils/chat-error-handler";
import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  ChannelFilters,
  ChannelOptions,
  ChannelSort,
  StreamChat,
} from "stream-chat";

export interface UseChannelListManagerConfig {
  client: StreamChat;
  userId: string | undefined;
  channelType: ChannelType;
  options?: ChannelOptions;
  sort?: ChannelSort;
  autoRefresh?: boolean;
}

export interface UseChannelListManagerReturn {
  filters: ChannelFilters;
  refreshChannels: () => Promise<void>;
  isRefreshing: boolean;
}

const DEFAULT_OPTIONS: ChannelOptions = {
  state: true,
  watch: true,
  presence: true,
  limit: 10,
};

const DEFAULT_SORT: ChannelSort = {
  last_message_at: -1,
  updated_at: -1,
};

const createChannelFilters = (
  userId: string | undefined,
  channelType: ChannelType,
): ChannelFilters => {
  const filters: ChannelFilters = {
    type: channelType === "announcement" ? "team" : channelType,
  };

  filters.members = { $in: userId ? [userId] : [] };

  return filters;
};

export function useChannelListManager({
  client,
  userId,
  channelType,
  options = DEFAULT_OPTIONS,
  sort = DEFAULT_SORT,
  autoRefresh = true,
}: UseChannelListManagerConfig): UseChannelListManagerReturn {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filters = useMemo(
    () => createChannelFilters(userId, channelType),
    [userId, channelType],
  );

  const refreshChannels = useCallback(async () => {
    if (!userId || !client.user) return;

    setIsRefreshing(true);
    try {
      await client.queryChannels(filters, sort, options);
    } catch (error: unknown) {
      const errorInfo = analyzeChatError(error);

      // Silently handle connection errors during client initialization
      if (
        error instanceof Error &&
        error.message?.includes("Call connectUser or connectAnonymousUser")
      ) {
        return;
      }

      if (!errorInfo.isRecoverable) {
        return;
      }

      throw new Error(
        `Failed to refresh ${channelType} channels: ${errorInfo.message}`,
      );
    } finally {
      setIsRefreshing(false);
    }
  }, [client, filters, sort, options, userId, channelType]);

  useEffect(() => {
    if (!autoRefresh || !userId || !client.user) return;

    refreshChannels().catch(() => {});
  }, [refreshChannels, autoRefresh, userId, client.user]);

  return {
    filters,
    refreshChannels,
    isRefreshing,
  };
}
