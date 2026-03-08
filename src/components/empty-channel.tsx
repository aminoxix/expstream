import { useChatContext } from "stream-chat-react";

import { AvatarSimple } from "@/components/ui/avatar-simple";
import { cn, getFileUrl } from "@/lib/utils";
import { StreamUser } from "@/types";
import { getChannelDisplayName, getDisplayName } from "@/utils/helpers";
import { HashStraightIcon } from "@phosphor-icons/react";

export const EmptyChannel = () => {
  const { channel, client } = useChatContext();

  const members = Object.values(channel?.state?.members || {}).filter(
    ({ user }) => user?.id !== client.user?.id,
  );

  const getAvatarGroup = () => {
    if (!members.length) return <AvatarSimple fallback="U" />;

    return (
      <div className="flex items-center -space-x-2">
        {members.slice(0, 2).map((member, i) => {
          const user = member.user as StreamUser | undefined;
          const displayName = getDisplayName(user) || "U";

          return (
            <AvatarSimple
              key={i}
              src={getFileUrl(user?.image || "")}
              fallback={displayName[0]?.toUpperCase()}
              className={cn(
                "border-2 border-white ring-2 ring-background",
                i === 0 && "z-20",
                i === 1 && "z-10",
              )}
              size={32}
            />
          );
        })}
      </div>
    );
  };

  const getUserText = () => {
    if (members.length === 1) {
      const user = members[0]?.user as StreamUser | undefined;

      return <span className="font-bold">@{getDisplayName(user)}</span>;
    }

    if (members.length === 2) {
      const user1 = members[0]?.user as StreamUser | undefined;
      const user2 = members[1]?.user as StreamUser | undefined;

      return (
        <span className="font-bold">
          @{getDisplayName(user1)} and @{getDisplayName(user2)}
        </span>
      );
    }

    const memberString = members
      .map((member) => {
        const user = member.user as StreamUser | undefined;
        return `@${getDisplayName(user)}`;
      })
      .join(", ")
      .replace(/, ([^,]*)$/, " and $1");

    return <span className="font-bold">{memberString || "the Universe"}</span>;
  };

  return (
    <div className="flex shrink-0 gap-2 items-center justify-start">
      {channel?.type === "team" ? <HashStraightIcon /> : getAvatarGroup()}
      <div className="mt-4">
        <p className="text-sm font-semibold">
          This is the beginning of your chat history
          {channel?.type === "team" ? " in " : " with "}
          {channel?.type === "team"
            ? `#${getChannelDisplayName(channel)}`
            : getUserText()}
          .
        </p>
        <p className="text-xs font-semibold text-gray-500">
          Send messages, attachments, links, emojis, and more.
        </p>
      </div>
    </div>
  );
};
