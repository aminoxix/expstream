import type {
  Channel,
  ChannelFilters,
  ChannelOptions,
  ChannelSort,
} from "stream-chat";
import {
  CHANNEL_TYPES,
  DEFAULT_CHANNEL_OPTIONS,
  DEFAULT_CHANNEL_SORT,
} from "./constants";

export interface IChannelConfig {
  filters: ChannelFilters;
  options: ChannelOptions;
  sort: ChannelSort;
}

export function createChannelFilters(
  userId: string | undefined,
  channelType: (typeof CHANNEL_TYPES)[keyof typeof CHANNEL_TYPES],
): ChannelFilters {
  return {
    members: { $in: [userId ?? ""] },
  };
}

export function createChannelConfig(
  userId: string | undefined,
  channelType: (typeof CHANNEL_TYPES)[keyof typeof CHANNEL_TYPES],
  customOptions?: Partial<ChannelOptions>,
  customSort?: Partial<ChannelSort>,
): IChannelConfig {
  return {
    filters: createChannelFilters(userId, channelType),
    options: { ...DEFAULT_CHANNEL_OPTIONS, ...customOptions },
    sort: { ...DEFAULT_CHANNEL_SORT, ...customSort } as ChannelSort,
  };
}

export const TEAM_CHANNEL_CONFIG = {
  type: CHANNEL_TYPES.TEAM,
  filterFn: (channels: Channel[]) =>
    channels.filter(
      (channel) =>
        channel.type === CHANNEL_TYPES.TEAM &&
        !channel.id?.includes("announcement") &&
        !channel.id?.includes("survey"),
    ),
} as const;

export const MESSAGING_CHANNEL_CONFIG = {
  type: CHANNEL_TYPES.MESSAGING,
  filterFn: (channels: Channel[]) =>
    channels.filter(
      (channel) =>
        channel.type === CHANNEL_TYPES.MESSAGING &&
        !channel.id?.includes("announcement") &&
        !channel.id?.includes("survey"),
    ),
} as const;
