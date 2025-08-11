// src/components/sidebar/index.tsx
"use client";

import { useEffect, useMemo } from "react";
import type {
  Channel,
  ChannelFilters,
  ChannelSort,
  Channel as StreamChannel,
} from "stream-chat";
import { ChannelList, useChatContext } from "stream-chat-react";
import { ScrollArea } from "../ui/scroll-area";
import { Separator } from "../ui/separator";
import { ChannelPreview } from "./channel-preview";
import { ChannelSearch } from "./channel-search";
import { TeamChannelList } from "./team-channel-list";

interface SidebarProps {
  setActiveChannel: React.Dispatch<
    React.SetStateAction<StreamChannel | undefined>
  >;
}

const getFilters = (userId: string | undefined): ChannelFilters[] => [
  { type: "team", demo: "team", members: { $in: [userId ?? ""] } },
  { type: "messaging", demo: "team", members: { $in: [userId ?? ""] } },
];

const options = { state: true, watch: true, presence: true, limit: 10 };
const sort: ChannelSort = { last_message_at: -1, updated_at: -1 };

const customChannelTeamFilter = (channels: Channel[]) => {
  console.log(
    "Team channels",
    channels.filter((channel) => channel.type === "team")
  );
  return channels.filter((channel) => channel.type === "team");
};

const customChannelMessagingFilter = (channels: Channel[]) => {
  console.log(
    "Messaging channels",
    channels.filter((channel) => channel.type === "messaging")
  );
  return channels.filter((channel) => channel.type === "messaging");
};

const TeamChannelsList = ({
  setActiveChannel,
}: {
  setActiveChannel: SidebarProps["setActiveChannel"];
}) => {
  const { client } = useChatContext();
  const filters = useMemo(() => getFilters(client.userID), [client.userID]);

  useEffect(() => {
    if (!client.userID) return;

    const refreshChannels = async () => {
      try {
        await client.queryChannels(filters[0], sort, options);
        console.log("[TeamChannelsList] Channels refreshed");
      } catch (err) {
        console.error("[TeamChannelsList] Failed to refresh channels:", err);
      }
    };
    refreshChannels();

    // Listen for channel creation and update events
    const handleChannelEvent = () => {
      refreshChannels();
    };
    client.on("channel.created", handleChannelEvent);
    client.on("channel.updated", handleChannelEvent); // Added for updates
    return () => {
      client.off("channel.created", handleChannelEvent);
      client.off("channel.updated", handleChannelEvent);
    };
  }, [client, filters]);

  return (
    <ChannelList
      channelRenderFilterFn={customChannelTeamFilter}
      filters={filters[0]}
      options={options}
      sort={sort}
      EmptyStateIndicator={EmptyGroupChannelListIndicator}
      List={(listProps) => <TeamChannelList {...listProps} type="team" />}
      Preview={(previewProps) => (
        <ChannelPreview
          {...previewProps}
          type="team"
          setActiveChannel={setActiveChannel}
        />
      )}
    />
  );
};

const MessagingChannelsList = ({
  setActiveChannel,
}: {
  setActiveChannel: SidebarProps["setActiveChannel"];
}) => {
  const { client } = useChatContext();
  const filters = useMemo(() => getFilters(client.userID), [client.userID]);

  useEffect(() => {
    if (!client.userID) return;

    const refreshChannels = async () => {
      try {
        await client.queryChannels(filters[1], sort, options);
        console.log("[MessagingChannelsList] Channels refreshed");
      } catch (err) {
        console.error(
          "[MessagingChannelsList] Failed to refresh channels:",
          err
        );
      }
    };
    refreshChannels();

    // Listen for channel creation and update events
    const handleChannelEvent = () => {
      refreshChannels();
    };
    client.on("channel.created", handleChannelEvent);
    client.on("channel.updated", handleChannelEvent); // Added for updates
    return () => {
      client.off("channel.created", handleChannelEvent);
      client.off("channel.updated", handleChannelEvent);
    };
  }, [client, filters]);

  return (
    <ChannelList
      channelRenderFilterFn={customChannelMessagingFilter}
      filters={filters[1]}
      options={options}
      sort={sort}
      setActiveChannelOnMount={false}
      EmptyStateIndicator={EmptyDMChannelListIndicator}
      List={(listProps) => <TeamChannelList {...listProps} type="messaging" />}
      Preview={(previewProps) => (
        <ChannelPreview
          {...previewProps}
          type="messaging"
          setActiveChannel={setActiveChannel}
        />
      )}
    />
  );
};

export const Sidebar = ({ setActiveChannel }: SidebarProps) => {
  return (
    <aside className="flex flex-col h-full bg-background">
      <div className="p-3">
        <ChannelSearch />
      </div>

      <Separator />

      <ScrollArea className="flex-1 px-2">
        <div className="py-2">
          <TeamChannelsList setActiveChannel={setActiveChannel} />
        </div>
        <Separator className="my-2" />
        <div className="py-2">
          <MessagingChannelsList setActiveChannel={setActiveChannel} />
        </div>
      </ScrollArea>
    </aside>
  );
};

export const EmptyGroupChannelListIndicator = () => (
  <div className="text-xs">
    There are no group channels. Start by creating some.
  </div>
);

export const EmptyDMChannelListIndicator = () => (
  <div className="text-xs">
    There are no DM channels. Start by creating some.
  </div>
);
