"use client";

import { useEffect, useMemo, useRef } from "react";
import type { Event, StreamChat } from "stream-chat";

export type ChannelEventType =
  | "channel.created"
  | "channel.updated"
  | "channel.deleted"
  | "member.added"
  | "member.removed";

export interface UseChannelEventsConfig {
  client: StreamChat;
  events: ChannelEventType[];
  onEvent?: (eventType: ChannelEventType, data: Event) => void;
  enabled?: boolean;
}

export function useChannelEvents({
  client,
  events,
  onEvent,
  enabled = true,
}: UseChannelEventsConfig): void {
  // Stabilize the events array by serializing — prevents re-subscribing
  // when the consumer passes a new array literal with the same values.
  const eventsKey = useMemo(() => events.slice().sort().join(","), [events]);

  // Use a ref for the callback so the effect doesn't re-run on callback changes
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!enabled || !client || events.length === 0) return;

    const eventHandlers: Array<() => void> = [];

    events.forEach((eventType) => {
      const handler = (eventData: Event) => {
        onEventRef.current?.(eventType, eventData);
      };

      client.on(eventType, handler);
      eventHandlers.push(() => client.off(eventType, handler));
    });

    return () => {
      eventHandlers.forEach((cleanup) => cleanup());
    };
  }, [client, eventsKey, enabled]);
}
