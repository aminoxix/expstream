import { User } from "stream-chat";

export interface StreamUser extends User {
  id: string;
  name?: string;
  image?: string;
  role?: string;
  display?: string;
  email?: string;
  online?: boolean;
  last_active?: string;
  created_at?: string;
  updated_at?: string;
}

export type UserStatus = "online" | "away" | "busy" | "offline";
