import { useEffect } from "react";
import type {
  Channel,
  ChannelFilters,
  ChannelSort,
  Channel as StreamChannel,
} from "stream-chat";
import { ChannelList, useChatContext } from "stream-chat-react";
import { ChannelPreview } from "./channel-preview";
import { ChannelSearch } from "./channel-search";
import { TeamChannelList } from "./team-channel-list";

interface SidebarProps {
  setActiveChannel: React.Dispatch<
    React.SetStateAction<StreamChannel | undefined>
  >;
}

const filters: ChannelFilters[] = [
  { type: "team", demo: "team" },
  { type: "messaging", demo: "team" },
];
const options = { state: true, watch: true, presence: true, limit: 10 };
const sort: ChannelSort = { last_message_at: -1, updated_at: -1 };

const customChannelTeamFilter = (channels: Channel[]) => {
  return channels.filter((channel) => channel.type === "team");
};

const customChannelMessagingFilter = (channels: Channel[]) => {
  return channels.filter((channel) => channel.type === "messaging");
};

const TeamChannelsList = ({
  setActiveChannel,
}: {
  setActiveChannel: SidebarProps["setActiveChannel"];
}) => {
  const { client } = useChatContext();

  // Refresh channels on mount and on channel creation
  useEffect(() => {
    const refreshChannels = async () => {
      try {
        await client.queryChannels(filters[0], sort, options);
        console.log("[TeamChannelsList] Channels refreshed");
      } catch (err) {
        console.error("[TeamChannelsList] Failed to refresh channels:", err);
      }
    };
    refreshChannels();

    // Listen for channel creation events
    const handleChannelCreated = () => {
      refreshChannels();
    };
    client.on("channel.created", handleChannelCreated);
    return () => {
      client.off("channel.created", handleChannelCreated);
    };
  }, [client]);

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

  // Refresh channels on mount and on channel creation
  useEffect(() => {
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

    // Listen for channel creation events
    const handleChannelCreated = () => {
      refreshChannels();
    };
    client.on("channel.created", handleChannelCreated);
    return () => {
      client.off("channel.created", handleChannelCreated);
    };
  }, [client]);

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
    <div className="h-full flex flex-col gap-4 justify-center">
      <ChannelSearch />
      <TeamChannelsList setActiveChannel={setActiveChannel} />
      <MessagingChannelsList setActiveChannel={setActiveChannel} />
    </div>
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
