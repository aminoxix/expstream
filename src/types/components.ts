import { ReactNode } from "react";
import { StreamChat } from "stream-chat";
import { StreamUser } from "./users";

export interface ChatMember {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  role?: string;
  isOnline?: boolean;
}

export interface CommunicationSheetProps {
  channelId?: string;
  client?: StreamChat;
  user?: StreamUser;
  tokenProvider?: () => Promise<string>;
  members?: (string | ChatMember)[];
  title?: string;
  type?: "messaging" | "announcement" | "team" | "survey";
  children: ReactNode;
  onOpenChange?: (open: boolean) => void;
  onStateChange?: (isOpen: boolean) => void;
  onError?: {
    onRefresh?: () => void;
    onLoginRedirect?: () => void;
  };
  onTokenExpired?: () => void;
  adminId?: string;
}
