"use client";

import { AvatarSimple } from "@/components/ui/avatar-simple";
import { getFileUrl, getInitials } from "@/lib/utils";
import { getDisplayName } from "@/utils/helpers";
import { useEffect, useState } from "react";
import type { Channel } from "stream-chat";
import {
  ChannelPreviewUIComponentProps,
  useChatContext,
} from "stream-chat-react";

type DirectMessagingChannelPreviewProps = Pick<
  ChannelPreviewUIComponentProps,
  "channel"
>;

function getChannelUnread(channel: Channel, userId?: string): number {
  if (userId && channel.state.read[userId]) {
    return channel.state.read[userId].unread_messages ?? 0;
  }
  return channel.countUnread?.() ?? 0;
}

const UnreadBadge = ({ count }: { count: number }) =>
  count > 0 ? (
    <span className="ml-auto inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-[10px] font-semibold text-white bg-orange-600 rounded-full shrink-0">
      {count > 99 ? "99+" : count}
    </span>
  ) : null;

export const DirectMessagingChannelPreview = ({
  channel,
}: DirectMessagingChannelPreviewProps) => {
  const { client } = useChatContext();
  const userId = client.userID;

  const [unreadCount, setUnreadCount] = useState(() =>
    getChannelUnread(channel, userId),
  );

  useEffect(() => {
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

  const members = Object.values(channel.state.members).filter(
    ({ user }) => user?.id !== client.user?.id,
  );
  const defaultName = "Chat User";
  let displayText;

  if (!members.length || members.length === 1) {
    const member = members[0]!;
    displayText = getDisplayName(member.user);
    const fallbackText = displayText?.[0] || member.user?.id?.[0] || "U";

    return (
      <div
        className="flex items-center gap-x-2 text-sm min-w-0 w-full"
        title={displayText}
      >
        <AvatarSimple
          className="size-8 rounded-lg shrink-0"
          src={getFileUrl(member?.user?.image || "")}
          fallback={getInitials(displayText || fallbackText)}
        />
        <p className="text-sm truncate">{displayText}</p>
        <UnreadBadge count={unreadCount} />
      </div>
    );
  }

  displayText = [
    members[0]?.user?.name || members[0]?.user?.id || defaultName,
    members[1]?.user?.name || members[1]?.user?.id || defaultName,
  ].join(" ");

  const member1Fallback =
    members[0]?.user?.name?.[0] || members[0]?.user?.id?.[0] || "U";
  const member2Fallback =
    members[1]?.user?.name?.[0] || members[1]?.user?.id?.[0] || "U";

  return (
    <div
      className="flex items-center gap-x-2 text-sm min-w-0 w-full"
      title={displayText}
    >
      <div className="flex -space-x-1 shrink-0">
        <AvatarSimple
          fallback={member1Fallback}
          src={getFileUrl(members[0]?.user?.image || "")}
          className="size-6 rounded-lg border-2 border-white"
        />

        <AvatarSimple
          fallback={member2Fallback}
          src={getFileUrl(members[1]?.user?.image || "")}
          className="size-6 rounded-lg border-2 border-white"
        />
      </div>
      <p className="text-sm truncate">{displayText}</p>
      <UnreadBadge count={unreadCount} />
    </div>
  );
};
