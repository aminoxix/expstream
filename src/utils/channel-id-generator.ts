/**
 * Channel ID Generation Utilities
 */

import type { ChannelType } from "@/types/channels";

export interface ChannelIdOptions {
  type: ChannelType;
  name?: string;
  members: string[];
  prefix?: string;
}

function extractUserId(userId: string | null | undefined): string {
  if (!userId) return "unknown";
  const parts = userId.split("-");
  if (parts.length > 1) {
    return parts[parts.length - 1]?.slice(0, 8) || userId.slice(0, 8);
  }
  return userId.slice(0, 8);
}

export function generateDMChannelId(
  userIds: string[],
  prefix?: string,
): string {
  if (userIds.length !== 2) {
    throw new Error("DM channels require exactly 2 users");
  }
  const [user1Id, user2Id] = userIds.map(extractUserId).sort();
  return `${prefix?.toLowerCase() ?? "dm"}-${user1Id}-${user2Id}`;
}

export function generateTeamChannelId(name: string, prefix?: string): string {
  if (!name) throw new Error("Team channels require a name");
  const sanitizedName = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-_]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[-_]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return prefix ? `${prefix.toLowerCase()}-${sanitizedName}` : sanitizedName;
}

export function generateAnnouncementChannelId(
  name: string,
  orgId?: string,
): string {
  const sanitizedName = generateTeamChannelId(name);
  return orgId
    ? `announcements-${orgId.toLowerCase()}-${sanitizedName}`
    : `announcements-${sanitizedName}`;
}

export function generateSurveyChannelId(name: string, orgId?: string): string {
  const sanitizedName = generateTeamChannelId(name);
  return orgId
    ? `survey-${orgId.toLowerCase()}-${sanitizedName}`
    : `survey-${sanitizedName}`;
}

export function validateChannelId(
  channelId: string,
  expectedType: ChannelType,
): boolean {
  switch (expectedType) {
    case "messaging":
      return /^dm-[a-z0-9]{1,8}-[a-z0-9]{1,8}$/.test(channelId);
    case "team":
      return /^[a-z0-9-]+$/.test(channelId) && !channelId.startsWith("dm-");
    case "announcement":
      return channelId.startsWith("announcements-");
    case "survey":
      return channelId.startsWith("survey-");
    default:
      return false;
  }
}

export function getChannelTypeFromId(channelId: string): ChannelType | null {
  if (channelId.startsWith("dm-")) return "messaging";
  if (channelId.startsWith("announcements-")) return "announcement";
  if (channelId.startsWith("survey-")) return "survey";
  return "team";
}
