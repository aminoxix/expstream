// src/types/workspace.ts
import { Channel } from "stream-chat";

export const WorkspaceKind = {
  Chat: "Chat",
  AdminChannelEdit: "AdminChannelEdit",
  AdminChannelCreateTeam: "AdminChannelCreateTeam",
  AdminChannelCreateMessaging: "AdminChannelCreateMessaging",
} as const;

export type WorkspaceKind = (typeof WorkspaceKind)[keyof typeof WorkspaceKind];

export interface ChatWorkspace {
  kind: typeof WorkspaceKind.Chat;
}

export interface AdminChannelEditWorkspace {
  kind: typeof WorkspaceKind.AdminChannelEdit;
  channel: Channel;
}

export interface AdminChannelCreateTeamWorkspace {
  kind: typeof WorkspaceKind.AdminChannelCreateTeam;
}

export interface AdminChannelCreateMessagingWorkspace {
  kind: typeof WorkspaceKind.AdminChannelCreateMessaging;
}

export type Workspace =
  | ChatWorkspace
  | AdminChannelEditWorkspace
  | AdminChannelCreateTeamWorkspace
  | AdminChannelCreateMessagingWorkspace;

export class WorkspaceFactory {
  static createChat(): ChatWorkspace {
    return { kind: WorkspaceKind.Chat };
  }

  static createAdminChannelEdit(channel: Channel): AdminChannelEditWorkspace {
    if (!channel || !channel.id) {
      throw new Error(
        "Invalid channel provided for AdminChannelEdit workspace"
      );
    }
    return { kind: WorkspaceKind.AdminChannelEdit, channel };
  }

  static createAdminChannelCreate(
    type: "team" | "messaging"
  ): AdminChannelCreateTeamWorkspace | AdminChannelCreateMessagingWorkspace {
    return {
      kind:
        type === "team"
          ? WorkspaceKind.AdminChannelCreateTeam
          : WorkspaceKind.AdminChannelCreateMessaging,
    };
  }
}
