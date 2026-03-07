"use client";

import { useCallback, useState } from "react";
import type { Channel as StreamChannel } from "stream-chat";

export interface ChannelState {
  channel: StreamChannel | undefined;
  selectedChannel: StreamChannel | null | undefined;
  loading: boolean;
  error: string | null;
}

export interface ChannelActions {
  setChannel: (channel: StreamChannel | undefined) => void;
  setSelectedChannel: (channel: StreamChannel | null | undefined) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  reset: () => void;
}

export interface UseChannelStateReturn extends ChannelState, ChannelActions {}

const initialState: ChannelState = {
  channel: undefined,
  selectedChannel: undefined,
  loading: false,
  error: null,
};

export function useChannelState(): UseChannelStateReturn {
  const [state, setState] = useState<ChannelState>(initialState);

  const setChannel = useCallback((channel: StreamChannel | undefined) => {
    setState((prev) => ({ ...prev, channel }));
  }, []);

  const setSelectedChannel = useCallback(
    (selectedChannel: StreamChannel | null | undefined) => {
      setState((prev) => ({ ...prev, selectedChannel }));
    },
    [],
  );

  const setLoading = useCallback((loading: boolean) => {
    setState((prev) => ({ ...prev, loading }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, error }));
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  return {
    ...state,
    setChannel,
    setSelectedChannel,
    setLoading,
    setError,
    clearError,
    reset,
  };
}
