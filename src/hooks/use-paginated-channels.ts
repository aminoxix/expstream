import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  APIErrorResponse,
  Channel,
  ChannelFilters,
  ChannelOptions,
  ChannelSort,
  ErrorFromResponse,
  StreamChat,
} from "stream-chat";

import { analyzeChatError } from "@/utils/chat-error-handler";
import { useChatContext } from "stream-chat-react";

const MAX_QUERY_CHANNELS_LIMIT = 30;
const DEFAULT_INITIAL_CHANNEL_PAGE_SIZE = 20;
const RECOVER_LOADED_CHANNELS_THROTTLE_INTERVAL_IN_MS = 5000;
const MIN_RECOVER_LOADED_CHANNELS_THROTTLE_INTERVAL_IN_MS = 2000;

type AllowedQueryType = "reload" | "load-more";

export type CustomQueryChannelParams = {
  currentChannels: Array<Channel>;
  queryType: AllowedQueryType;
  setChannels: React.Dispatch<React.SetStateAction<Array<Channel>>>;
  setHasNextPage: React.Dispatch<React.SetStateAction<boolean>>;
};

export type CustomQueryChannelsFn = (
  params: CustomQueryChannelParams,
) => Promise<void>;

export const usePaginatedChannels = (
  client: StreamChat,
  filters: ChannelFilters,
  sort: ChannelSort,
  options: ChannelOptions,
  activeChannelHandler?: (
    channels: Array<Channel>,
    setChannels: React.Dispatch<React.SetStateAction<Array<Channel>>>,
  ) => void,
  recoveryThrottleIntervalMs: number = RECOVER_LOADED_CHANNELS_THROTTLE_INTERVAL_IN_MS,
  customQueryChannels?: CustomQueryChannelsFn,
) => {
  const { client: contextClient } = useChatContext("usePaginatedChannels");
  const [channels, setChannels] = useState<Array<Channel>>([]);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [error, setError] =
    useState<ErrorFromResponse<APIErrorResponse> | null>(null);
  const [queryInProgress, setQueryInProgress] =
    useState<AllowedQueryType | null>(null);
  const lastRecoveryTimestamp = useRef<number | undefined>(undefined);

  // Use a ref to avoid stale closures when channels are read inside queryChannels
  const channelsRef = useRef(channels);
  channelsRef.current = channels;

  const actualClient = client || contextClient;

  const recoveryThrottleInterval =
    recoveryThrottleIntervalMs <
    MIN_RECOVER_LOADED_CHANNELS_THROTTLE_INTERVAL_IN_MS
      ? MIN_RECOVER_LOADED_CHANNELS_THROTTLE_INTERVAL_IN_MS
      : (recoveryThrottleIntervalMs ??
        RECOVER_LOADED_CHANNELS_THROTTLE_INTERVAL_IN_MS);

  // memoize props
  const filterString = useMemo(() => JSON.stringify(filters), [filters]);
  const sortString = useMemo(() => JSON.stringify(sort), [sort]);

  const queryChannels = useCallback(
    async (queryType: AllowedQueryType = "load-more") => {
      setError(null);

      if (queryType === "reload") {
        setChannels([]);
      }
      setQueryInProgress(queryType);

      try {
        if (customQueryChannels) {
          await customQueryChannels({
            currentChannels: channelsRef.current,
            queryType,
            setChannels,
            setHasNextPage,
          });
        } else {
          const offset =
            queryType === "reload" ? 0 : channelsRef.current.length;

          const newOptions = {
            limit: options?.limit ?? MAX_QUERY_CHANNELS_LIMIT,
            message_limit:
              options?.message_limit ?? DEFAULT_INITIAL_CHANNEL_PAGE_SIZE,
            offset,
            ...options,
          };

          const channelQueryResponse = await actualClient.queryChannels(
            filters,
            sort || {},
            newOptions,
          );

          // Simple unique by cid implementation
          const uniqueChannels = (list: Channel[]) => {
            const seen = new Set<string>();
            return list.filter((ch) => {
              if (seen.has(ch.cid)) return false;
              seen.add(ch.cid);
              return true;
            });
          };

          const newChannels =
            queryType === "reload"
              ? channelQueryResponse
              : uniqueChannels([
                  ...channelsRef.current,
                  ...channelQueryResponse,
                ]);

          setChannels(newChannels);
          setHasNextPage(channelQueryResponse.length >= newOptions.limit);

          // Set active channel only on load of first page
          if (!offset && activeChannelHandler) {
            activeChannelHandler(newChannels, setChannels);
          }
        }
      } catch (err) {
        // Analyze error to prevent retry loops for non-recoverable errors
        const errorInfo = analyzeChatError(err);

        if (!errorInfo.isRecoverable) {
          if (process.env.NODE_ENV === "development") {
            console.error(
              "[usePaginatedChannels] Non-recoverable error:",
              errorInfo.message,
            );
          }
        }

        setError(err as ErrorFromResponse<APIErrorResponse>);
      }

      setQueryInProgress(null);
    },
    // channels removed from deps — read via channelsRef to prevent cascading re-creation
    [
      actualClient,
      customQueryChannels,
      filters,
      sort,
      options,
      activeChannelHandler,
    ],
  );

  const throttleRecover = useCallback(() => {
    const now = Date.now();
    const isFirstRecovery = !lastRecoveryTimestamp.current;
    const timeElapsedSinceLastRecoveryMs = lastRecoveryTimestamp.current
      ? now - lastRecoveryTimestamp.current
      : 0;

    if (
      !isFirstRecovery &&
      timeElapsedSinceLastRecoveryMs < recoveryThrottleInterval &&
      !error
    ) {
      return;
    }

    lastRecoveryTimestamp.current = now;
    queryChannels("reload");
  }, [error, queryChannels, recoveryThrottleInterval]);

  const loadNextPage = useCallback(
    () => queryChannels("load-more"),
    [queryChannels],
  );

  useEffect(() => {
    if (actualClient.recoverStateOnReconnect) return;
    const { unsubscribe } = actualClient.on(
      "connection.recovered",
      throttleRecover,
    );

    return () => {
      unsubscribe();
    };
  }, [actualClient, throttleRecover]);

  // Listen for channel creation and updates.
  // Use a ref for queryChannels so the event listeners are stable
  // and don't tear down / re-attach on every queryChannels recreation.
  const queryChannelsRef = useRef(queryChannels);
  queryChannelsRef.current = queryChannels;

  useEffect(() => {
    const handleReload = () => {
      setTimeout(() => {
        queryChannelsRef.current("reload");
      }, 1000);
    };

    actualClient.on("channel.created", handleReload);
    actualClient.on("channel.updated", handleReload);
    actualClient.on("notification.added_to_channel", handleReload);

    return () => {
      actualClient.off("channel.created", handleReload);
      actualClient.off("channel.updated", handleReload);
      actualClient.off("notification.added_to_channel", handleReload);
    };
  }, [actualClient]);

  useEffect(() => {
    queryChannels("reload");
  }, [filterString, sortString]);

  return {
    channels,
    hasNextPage,
    loadNextPage,
    setChannels,
    error,
    loading: queryInProgress !== null,
    queryInProgress,
  };
};
