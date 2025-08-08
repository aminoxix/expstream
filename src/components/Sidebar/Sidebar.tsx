import { ChannelList } from "stream-chat-react";

import { ChannelSearch } from "../ChannelSearch/ChannelSearch";
import {
  EmptyDMChannelListIndicator,
  EmptyGroupChannelListIndicator,
} from "./EmptyChannelListIndicator";
// import { TeamChannelList } from '../TeamChannelList/TeamChannelList';
// import { ChannelPreview } from '../ChannelPreview/ChannelPreview';

import type { Channel, ChannelFilters } from "stream-chat";
import { ChannelSort } from "stream-chat";
import { ChannelPreview } from "../ChannelPreview/ChannelPreview";
import { TeamChannelList } from "../TeamChannelList/TeamChannelList";

const filters: ChannelFilters[] = [{ type: "team", name: "team" }];
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
    // List={(listProps) => (
    //   <TeamChannelList
    //     {...listProps}
    //     type='team'
    //   />
    // )}
    // Preview={(previewProps) => (
    //   <ChannelPreview
    //     {...previewProps}
    //     type='team'
    //   />
    // )}
  />
);

const MessagingChannelsList = () => (
  <div className="!border-none">
    <ChannelList
      channelRenderFilterFn={customChannelMessagingFilter}
      filters={filters[1]}
      options={options}
      sort={sort}
      setActiveChannelOnMount={false}
      EmptyStateIndicator={EmptyDMChannelListIndicator}
      List={(listProps) => (
        // <div className="!border-none">
        <TeamChannelList {...listProps} type="messaging" />
        // </div>
      )}
      Preview={(previewProps) => (
        <ChannelPreview {...previewProps} type="messaging" />
      )}
    />
  </div>
);

export const Sidebar = () => {
  return (
    <div className="h-full">
      <ChannelSearch />
      {/* <TeamChannelsList/> */}
      <MessagingChannelsList />
    </div>
  );
};
