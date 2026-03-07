import { Channel, ChannelData, ChannelMemberResponse } from "stream-chat";

export interface ChannelConfig {
  id: string;
  type: string;
  name?: string;
  image?: string;
  members?: string[];
  data?: ChannelData;
}

export interface TeamChannelConfig extends ChannelConfig {
  type: "team";
  teamId: string;
  departmentId?: string;
  isPrivate?: boolean;
}

export interface DMChannelConfig extends ChannelConfig {
  type: "messaging";
  participants: [string, string];
}

export interface ChannelListConfig {
  filters: Record<string, unknown>;
  sort?: Array<{ [key: string]: 1 | -1 }>;
  options?: {
    limit?: number;
    offset?: number;
    message_limit?: number;
    member_limit?: number;
  };
}

export interface ChannelPreviewData {
  channel: Channel;
  lastMessage?: {
    text: string;
    timestamp: Date;
    user: {
      id: string;
      name?: string;
      image?: string;
    };
  };
  unreadCount: number;
  isOnline?: boolean;
  members: ChannelMemberResponse[];
}

export interface ChannelSearchResult {
  channel: Channel;
  score: number;
  reason: "name" | "member" | "message";
}

export interface ChannelPermissions {
  canSendMessage: boolean;
  canDeleteMessage: boolean;
  canEditMessage: boolean;
  canAddMembers: boolean;
  canRemoveMembers: boolean;
  canUpdateChannel: boolean;
  canDeleteChannel: boolean;
}

export type ChannelType = "team" | "messaging" | "announcement" | "survey";

export interface ChannelMetadata {
  id: string;
  type: ChannelType;
  name?: string;
  image?: string;
  memberCount: number;
  lastActivity?: Date;
  isPrivate: boolean;
  createdBy: string;
  createdAt: Date;
}

export interface CreateChannelParams {
  id?: string;
  type: ChannelType;
  name?: string;
  members?: string[];
  data?: Record<string, unknown>;
  image?: string;
  description?: string;
}

export interface UpdateChannelParams {
  name?: string;
  image?: string;
  data?: Record<string, unknown>;
  description?: string;
}

export interface ChannelStats {
  memberCount: number;
  messageCount: number;
  lastActivity: Date;
  isActive: boolean;
}

export interface ChannelFilters {
  type?: ChannelType | ChannelType[];
  members?: { $in?: string[]; $contains?: string };
  name?: { $autocomplete?: string; $eq?: string };
  id?: { $in?: string[] };
  created_by_id?: string;
  last_message_at?: { $gte?: Date; $lte?: Date };
}
