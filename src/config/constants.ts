import type { ChannelOptions, ChannelSort } from "stream-chat";

export const CHANNEL_TYPES = {
  TEAM: "team" as const,
  MESSAGING: "messaging" as const,
  ANNOUNCEMENT: "announcement" as const,
  SURVEY: "survey" as const,
} as const;

export type ChannelType = (typeof CHANNEL_TYPES)[keyof typeof CHANNEL_TYPES];

export const DEFAULT_CHANNEL_OPTIONS: ChannelOptions = {
  state: true,
  watch: true,
  presence: true,
  limit: 10,
} as const;

export const DEFAULT_CHANNEL_SORT: ChannelSort = {
  last_message_at: -1,
  updated_at: -1,
} as const;

export const WORKSPACE_KINDS = {
  ADMIN_CHANNEL_EDIT: "AdminChannelEdit" as const,
  ADMIN_CHANNEL_CREATE_TEAM: "AdminChannelCreateTeam" as const,
  ADMIN_CHANNEL_CREATE_MESSAGING: "AdminChannelCreateMessaging" as const,
} as const;

export const ADMIN_WORKSPACE_KINDS = [
  WORKSPACE_KINDS.ADMIN_CHANNEL_EDIT,
  WORKSPACE_KINDS.ADMIN_CHANNEL_CREATE_TEAM,
  WORKSPACE_KINDS.ADMIN_CHANNEL_CREATE_MESSAGING,
] as const;

export const MESSAGE_INPUT_CONSTRAINTS = {
  MIN_ROWS: 1,
  MAX_ROWS: 8,
} as const;

export const UI_MESSAGES = {
  LOADING: {
    CHAT_CLIENT: "Loading chat client...",
    CHANNEL: "Loading channel...",
    CLIENT_CONNECTION: "Setting up client & connection...",
  },
  EMPTY_STATES: {
    GROUP_CHANNELS: "There are no group channels. Start by creating some.",
    DM_CHANNELS: "There are no DM channels. Start by creating some.",
  },
  ERRORS: {
    NO_ACTIVE_CHANNEL: "No active channel selected",
    SEND_MESSAGE_FAILED: "Failed to send message",
    CHANNEL_WATCH_FAILED: "Failed to watch channel",
    UNKNOWN_ERROR: "Unknown error",
  },
} as const;
