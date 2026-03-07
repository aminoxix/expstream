"use client";

import { HashStraightIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import type { Channel } from "stream-chat";
import { useChatContext } from "stream-chat-react";

interface TeamChannelPreviewProps {
  name: string;
  channel?: Channel;
}

function getChannelUnread(channel: Channel, userId?: string): number {
  if (userId && channel.state.read[userId]) {
    return channel.state.read[userId].unread_messages ?? 0;
  }
  return channel.countUnread?.() ?? 0;
}

export const TeamChannelPreview = ({
  name,
  channel,
}: TeamChannelPreviewProps) => {
  const { client } = useChatContext();
  const userId = client.userID;

  const [unreadCount, setUnreadCount] = useState(() =>
    channel ? getChannelUnread(channel, userId) : 0,
  );

  useEffect(() => {
    if (!channel) return;

    const updateCount = () => setUnreadCount(getChannelUnread(channel, userId));
    updateCount();

    const subs = [
      channel.on("message.new", updateCount),
      channel.on("message.read", updateCount),
      channel.on("notification.mark_unread", updateCount),
      channel.on("notification.mark_read", updateCount),
    ];

    return () => subs.forEach((s) => s.unsubscribe());
  }, [channel, userId]);

  return (
    <div
      className="flex items-center gap-x-2 text-sm min-w-0 w-full"
      title={name}
    >
      <HashStraightIcon className="shrink-0" />
      <p className="truncate">{name}</p>
      {unreadCount > 0 && (
        <span className="ml-auto inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-[10px] font-semibold text-white bg-orange-600 rounded-full shrink-0">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </div>
  );
};
