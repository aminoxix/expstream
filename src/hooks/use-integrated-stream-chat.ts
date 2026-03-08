"use client";

import type { TokenProvider } from "@/utils/stream-chat-manager";
import {
  formatStreamChatUser,
  type StreamChatUserInfo,
} from "@/utils/token-helper";
import { useCallback, useEffect, useRef, useState } from "react";
import { useStreamChat } from "./use-stream-chat";

export interface AuthContextLike {
  user: StreamChatUserInfo | null;
  logout: () => void;
}

export interface UseIntegratedStreamChatConfig {
  auth: AuthContextLike | null;
  /** Token provider resolver — returns a TokenProvider for Stream Chat authentication */
  resolveTokenProvider: () => TokenProvider;
  autoConnect?: boolean;
}

export interface UseIntegratedStreamChatReturn {
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  isTokenExpired: boolean;
  retry: () => void;
}

export function useIntegratedStreamChat({
  auth,
  resolveTokenProvider,
  autoConnect = true,
}: UseIntegratedStreamChatConfig): UseIntegratedStreamChatReturn {
  const streamChat = useStreamChat();
  const [setupError, setSetupError] = useState<string | null>(null);
  const [isSetupComplete, setIsSetupComplete] = useState(false);

  // Use a ref for resolveTokenProvider to avoid triggering reconnections
  // when the consumer creates a new function reference each render.
  const resolveTokenProviderRef = useRef(resolveTokenProvider);
  resolveTokenProviderRef.current = resolveTokenProvider;

  useEffect(() => {
    const connectUser = async () => {
      try {
        if (!autoConnect || !auth?.user) {
          setIsSetupComplete(false);
          return;
        }

        if (
          streamChat.currentUser?.id === auth.user.user_id &&
          streamChat.isConnected
        ) {
          setIsSetupComplete(true);
          return;
        }

        const tokenProvider = resolveTokenProviderRef.current();
        const streamUser = formatStreamChatUser(auth.user);

        await streamChat.connect(streamUser, tokenProvider);

        setSetupError(null);
        setIsSetupComplete(true);
      } catch (error) {
        console.error("[useIntegratedStreamChat] Setup failed:", error);
        setSetupError(error instanceof Error ? error.message : "Setup failed");
        setIsSetupComplete(false);
      }
    };

    connectUser();
  }, [autoConnect, auth?.user?.user_id, streamChat]);

  useEffect(() => {
    if (streamChat.isTokenExpired && auth?.logout) {
      auth.logout();
    }
  }, [streamChat.isTokenExpired, auth?.logout]);

  useEffect(() => {
    if (!auth?.user && streamChat.isConnected) {
      streamChat.disconnect().catch(console.error);
      setIsSetupComplete(false);
    }
  }, [auth?.user, streamChat]);

  const retry = useCallback(async () => {
    if (!auth?.user) return;

    try {
      setSetupError(null);

      const tokenProvider = resolveTokenProviderRef.current();
      const streamUser = formatStreamChatUser(auth.user);

      await streamChat.retry(streamUser, tokenProvider);
      setIsSetupComplete(true);
    } catch (error) {
      console.error("[useIntegratedStreamChat] Retry failed:", error);
      setSetupError(error instanceof Error ? error.message : "Retry failed");
    }
  }, [auth, streamChat]);

  return {
    isConnected: streamChat.isConnected && isSetupComplete,
    isConnecting:
      streamChat.isConnecting ||
      (autoConnect && !isSetupComplete && !!auth?.user),
    connectionError: setupError || streamChat.error,
    isTokenExpired: streamChat.isTokenExpired,
    retry,
  };
}
