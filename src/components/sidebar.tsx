import { ChannelList } from "stream-chat-react";

import { ChannelSearch } from "./ChannelSearch/ChannelSearch";

// import { TeamChannelList } from '../TeamChannelList/TeamChannelList';
// import { ChannelPreview } from '../ChannelPreview/ChannelPreview';

import type { Channel, ChannelFilters } from "stream-chat";
import { ChannelSort } from "stream-chat";
import { ChannelPreview } from "./ChannelPreview/ChannelPreview";
import { TeamChannelList } from "./team-channel-list";

const filters: ChannelFilters[] = [
  { type: "team", demo: "team" },
  { type: "messaging", demo: "team" },
];
const options = { state: true, watch: true, presence: true, limit: 3 };
const sort: ChannelSort = { last_message_at: -1, updated_at: -1 };

const customChannelTeamFilter = (channels: Channel[]) => {
  return channels.filter((channel) => channel.type === "team");
};

const customChannelMessagingFilter = (channels: Channel[]) => {
  return channels.filter((channel) => channel.type === "messaging");
};

const TeamChannelsList = () => (
  <ChannelList
    channelRenderFilterFn={customChannelTeamFilter}
    filters={filters[0]}
    options={options}
    sort={sort}
    EmptyStateIndicator={EmptyGroupChannelListIndicator}
    List={(listProps) => <TeamChannelList {...listProps} type="team" />}
    Preview={(previewProps) => <ChannelPreview {...previewProps} type="team" />}
  />
);

const MessagingChannelsList = () => (
  <ChannelList
    channelRenderFilterFn={customChannelMessagingFilter}
    filters={filters[1]}
    options={options}
    sort={sort}
    setActiveChannelOnMount={false}
    EmptyStateIndicator={EmptyDMChannelListIndicator}
    List={(listProps) => <TeamChannelList {...listProps} type="messaging" />}
    Preview={(previewProps) => (
      <ChannelPreview {...previewProps} type="messaging" />
    )}
  />
);

export const Sidebar = () => {
  return (
    <div className="h-full flex flex-col gap-4 justify-center">
      <ChannelSearch />
      <TeamChannelsList />
      <MessagingChannelsList />
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
