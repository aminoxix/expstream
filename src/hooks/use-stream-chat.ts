"use client";

import {
  StreamChatManager,
  type StreamChatState,
  type StreamChatUser,
  type TokenProvider,
} from "@/utils/stream-chat-manager";
import { useCallback, useEffect, useState } from "react";
import type { StreamChat } from "stream-chat";

export interface UseStreamChatReturn {
  /** Stream Chat client instance */
  client: StreamChat;
  /** Current connection state */
  isConnected: boolean;
  /** Whether currently connecting */
  isConnecting: boolean;
  /** Connection error if any */
  error: string | null;
  /** Whether token has expired */
  isTokenExpired: boolean;
  /** Current connected user */
  currentUser: StreamChatUser | null;
  /** Connect user to Stream Chat */
  connect: (
    user: StreamChatUser,
    tokenProvider: TokenProvider,
  ) => Promise<void>;
  /** Disconnect current user */
  disconnect: () => Promise<void>;
  /** Switch to different user */
  switchUser: (
    user: StreamChatUser,
    tokenProvider: TokenProvider,
  ) => Promise<void>;
  /** Retry connection */
  retry: (user: StreamChatUser, tokenProvider: TokenProvider) => Promise<void>;
}

export function useStreamChat(): UseStreamChatReturn {
  const manager = StreamChatManager.getInstance();
  const [state, setState] = useState<StreamChatState>(manager.getState());

  useEffect(() => {
    const unsubscribe = manager.subscribe(setState);
    return unsubscribe;
  }, [manager]);

  const connect = useCallback(
    async (user: StreamChatUser, tokenProvider: TokenProvider) => {
      try {
        await manager.connect(user, tokenProvider);
      } catch (error) {
        console.error("[useStreamChat] Connect error:", error);
        throw error;
      }
    },
    [manager],
  );

  const disconnect = useCallback(async () => {
    await manager.disconnect();
  }, [manager]);

  const switchUser = useCallback(
    async (user: StreamChatUser, tokenProvider: TokenProvider) => {
      await manager.switchUser(user, tokenProvider);
    },
    [manager],
  );

  const retry = useCallback(
    async (user: StreamChatUser, tokenProvider: TokenProvider) => {
      await manager.retry(user, tokenProvider);
    },
    [manager],
  );

  return {
    client: manager.getClient(),
    isConnected: state.connectionState === "connected",
    isConnecting: state.connectionState === "connecting",
    error: state.error,
    isTokenExpired: state.isTokenExpired,
    currentUser: state.currentUser,
    connect,
    disconnect,
    switchUser,
    retry,
  };
}

export function useStreamChatStatus() {
  const manager = StreamChatManager.getInstance();
  const [state, setState] = useState<StreamChatState>(manager.getState());

  useEffect(() => {
    const unsubscribe = manager.subscribe(setState);
    return unsubscribe;
  }, [manager]);

  return {
    isConnected: state.connectionState === "connected",
    isConnecting: state.connectionState === "connecting",
    error: state.error,
    isTokenExpired: state.isTokenExpired,
  };
}

export function useStreamChatClient(): StreamChat {
  const manager = StreamChatManager.getInstance();
  return manager.getClient();
}
