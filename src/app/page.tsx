"use client";

import MyChat from "@/components/chat";
import {
  useIntegratedStreamChat,
  type AuthContextLike,
} from "@/hooks/use-integrated-stream-chat";
import { getUserFromStorage } from "@/lib/utils";
import { createTokenProvider } from "@/utils/streamClient";
import type { StreamChatUserInfo } from "@/utils/token-helper";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

export default function Dashboard() {
  const router = useRouter();

  const [user, setUser] = useState<{
    userId: string;
    fullName?: string;
    imageUrl?: string;
  } | null>(null);

  useEffect(() => {
    const storedUser = getUserFromStorage();
    if (!storedUser) {
      router.replace("/create");
    } else {
      setUser(storedUser);
    }
  }, [router]);

  const auth: AuthContextLike | null = useMemo(() => {
    if (!user) return null;

    const nameParts = user.fullName?.split(" ") ?? [];
    const streamUser: StreamChatUserInfo = {
      user_id: user.userId,
      first_name: nameParts[0],
      last_name: nameParts.slice(1).join(" ") || undefined,
      image: user.imageUrl,
    };

    return {
      user: streamUser,
      logout: () => {
        localStorage.removeItem("user");
        router.replace("/create");
      },
    };
  }, [user, router]);

  const resolveTokenProvider = useCallback(() => {
    if (!user) throw new Error("No user available");
    return createTokenProvider(user.userId);
  }, [user]);

  const { isConnected, isConnecting, connectionError, retry } =
    useIntegratedStreamChat({
      auth,
      resolveTokenProvider,
      autoConnect: true,
    });

  if (!user) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <h1 className="text-gray-800 text-lg">Loading...</h1>
      </div>
    );
  }

  if (connectionError) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-3">
        <p className="text-red-500 text-center">{connectionError}</p>
        <button
          onClick={retry}
          className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md"
        >
          Retry
        </button>
      </div>
    );
  }

  if (isConnecting || !isConnected) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <h1 className="text-gray-800 text-lg">Connecting to chat...</h1>
      </div>
    );
  }

  return <MyChat userId={user.userId} />;
}
