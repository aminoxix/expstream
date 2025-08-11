import { Avatar, useChatContext } from "stream-chat-react";

import { HashStraightIcon } from "@phosphor-icons/react";

export const EmptyChannel = () => {
  const { channel, client } = useChatContext();

  const members = Object.values(channel?.state?.members || {}).filter(
    ({ user }) => user?.id !== client.userID
  );

  const getAvatarGroup = () => {
    if (!members.length) return <Avatar />;

    return (
      <div>
        {members.slice(0, 2).map((member, i) => {
          return (
            <Avatar
              key={i}
              image={member.user?.image}
              name={member.user?.name || member.user?.id}
            />
          );
        })}
      </div>
    );
  };

  const getUserText = () => {
    if (members.length === 1) {
      return (
        <span className="font-bold">{`@${
          members[0].user?.name || members[0].user?.id
        }`}</span>
      );
    }

    if (members.length === 2) {
      return (
        <span className="font-bold">{`@${
          members[0].user?.name || members[0].user?.id
        } and @${members[1].user?.name || members[1].user?.id}`}</span>
      );
    }

    let memberString = "";

    members.forEach((member, i) => {
      if (i !== members.length - 1) {
        memberString = `${memberString}@${
          member?.user?.name || member?.user?.id
        }, `;
      } else {
        memberString = `${memberString} and @${
          member?.user?.name || member?.user?.id
        }`;
      }
    });

    return <span className="font-bold">{memberString || "the Universe"}</span>;
  };

  return (
    <div className="flex gap-2 items-center">
      {channel?.type === "team" ? <HashStraightIcon /> : getAvatarGroup()}
      <div className="mt-4">
        <p className="text-sm font-semibold">
          This is the beginning of your chat history
          {channel?.type === "team" ? " in " : " with "}
          {channel?.type === "team"
            ? `#${channel?.data?.name || channel?.data?.id}`
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
