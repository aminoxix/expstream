"use client";

export interface StreamChatUserInfo {
  user_id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  image?: string;
}

export function formatStreamChatUser(user: StreamChatUserInfo) {
  return {
    id: user.user_id,
    name:
      `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.user_id,
    email: user.email,
    image: user.image,
  };
}
