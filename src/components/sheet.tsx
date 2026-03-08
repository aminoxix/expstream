"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Channel, StreamChat } from "stream-chat";
import { Chat, useChatContext } from "stream-chat-react";

import { AvatarSimple } from "@/components/ui/avatar-simple";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  ArrowClockwiseIcon,
  ChatsIcon,
  InfoIcon,
  UsersIcon,
} from "@phosphor-icons/react";

import { useStreamChat } from "@/hooks/use-stream-chat";
import { ChatMember, CommunicationSheetProps } from "@/types";
import type { ChannelType } from "@/types/channels";
import { analyzeChatError } from "@/utils/chat-error-handler";
import { getDisplayName } from "@/utils/helpers";
import { ChannelContainer } from "./channel-container";

type ConnectionState = "idle" | "connecting" | "connected" | "error";

export function CommunicationSheet({
  channelId,
  members = [],
  title = "Discussion",
  type = "team",
  children,
  onOpenChange,
  onStateChange,
  onError,
  onTokenExpired,
}: CommunicationSheetProps) {
  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState<Channel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasFatalError, setHasFatalError] = useState(false);

  // Singleton Stream Chat connection
  const {
    client,
    isConnected: finalIsConnected,
    isConnecting: finalIsConnecting,
    isTokenExpired,
  } = useStreamChat();

  useEffect(() => {
    if (isTokenExpired && onTokenExpired) {
      onTokenExpired();
    }
  }, [isTokenExpired, onTokenExpired]);

  const retry = useCallback(() => {
    setError(null);
    setChannel(null);
  }, []);

  const connectionState: ConnectionState = error
    ? "error"
    : finalIsConnecting
      ? "connecting"
      : finalIsConnected
        ? "connected"
        : "idle";

  // Stabilize members reference to avoid re-triggering setupChannel on every render
  const membersRef = useRef(members);
  membersRef.current = members;
  const membersKey = useMemo(
    () =>
      members
        .map((m) => (typeof m === "string" ? m : m.id))
        .sort()
        .join(","),
    [members],
  );

  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const setupChannel = useCallback(async () => {
    if (!client || !finalIsConnected || !open || channel || hasFatalError) {
      return;
    }

    try {
      setError(null);

      const ch = client.channel(type, channelId, {
        name: title,
        members: membersRef.current.map((m) =>
          typeof m === "string" ? m : m.id,
        ),
      });

      await ch.watch();
      setChannel(ch);
    } catch (e: unknown) {
      const info = analyzeChatError(e);

      setError(info.message);

      if (!info.isRecoverable) {
        setHasFatalError(true);
      }

      if (info.requiresLogin) {
        onErrorRef.current?.onLoginRedirect?.();
      } else if (!info.isRecoverable && onErrorRef.current?.onRefresh) {
        onErrorRef.current.onRefresh();
      }
    }
  }, [
    client,
    finalIsConnected,
    open,
    channel,
    hasFatalError,
    type,
    channelId,
    title,
    membersKey,
  ]);

  useEffect(() => {
    setupChannel();
  }, [setupChannel]);

  useEffect(() => {
    if (!open) {
      setChannel(null);
      setError(null);
      setHasFatalError(false);
    }
  }, [open]);

  const streamMembers: ChatMember[] = useMemo(() => {
    if (!channel) return [];

    const overrides = new Map(
      members
        .filter((m): m is ChatMember => typeof m !== "string")
        .map((m) => [m.id, m] as const),
    );

    return Object.values(channel.state.members).map((m) => {
      const user = m.user;
      const override = user?.id ? overrides.get(user.id) : undefined;

      return {
        id: user?.id ?? "",
        name: override?.name ?? getDisplayName(user) ?? "Unknown",
        avatar: override?.avatar ?? user?.image,
        email: override?.email,
        role: m.role ?? "member",
        isOnline: user?.online ?? false,
      };
    });
  }, [channel, members]);

  if (!client) return null;

  return (
    <Sheet
      onOpenChange={(v) => {
        setOpen(v);
        onOpenChange?.(v);
        onStateChange?.(v);
      }}
    >
      <SheetTrigger asChild>{children}</SheetTrigger>

      <SheetContent className="max-w-[500px] p-0 flex flex-col h-full">
        <SheetHeader className="p-4 border-b bg-gray-50/50">
          <SheetTitle className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <ChatsIcon className="size-4 text-blue-600" />
            </div>

            <div className="flex-1">
              <h3 className="font-semibold text-sm">{title}</h3>
              <p className="text-xs text-gray-500 capitalize">
                {type} discussion
              </p>
            </div>

            <ConnectionIndicator state={connectionState} />
            <MembersPopover members={streamMembers} />
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-hidden">
          <ChatContent
            state={connectionState}
            error={error}
            retry={retry}
            channel={channel}
            client={client}
            type={type}
            hasFatalError={hasFatalError}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ConnectionIndicator({ state }: { state: ConnectionState }) {
  if (state === "connected" || state === "idle") return null;

  return (
    <div
      className={`w-2 h-2 rounded-full ${
        state === "connecting" ? "bg-yellow-500" : "bg-red-500"
      }`}
    />
  );
}

function ChatContent({
  state,
  error,
  retry,
  channel,
  client,
  type,
  hasFatalError,
}: {
  state: ConnectionState;
  error: string | null;
  retry: () => void;
  channel: Channel | null;
  client: StreamChat;
  type: ChannelType;
  hasFatalError: boolean;
}) {
  if (state === "connecting" || (state === "connected" && !channel)) {
    return <Centered>Loading chat…</Centered>;
  }

  if (state === "error") {
    return (
      <Centered>
        <p className="text-sm text-red-600">{error}</p>

        {!hasFatalError && (
          <Button size="sm" variant="outline" onClick={retry}>
            <ArrowClockwiseIcon className="size-4" />
            Retry
          </Button>
        )}
      </Centered>
    );
  }

  if (!channel) return null;

  return (
    <Chat client={client}>
      <ChannelWrapper channel={channel} type={type} />
    </Chat>
  );
}

function ChannelWrapper({
  channel,
  type,
}: {
  channel: Channel;
  type?: ChannelType;
}) {
  const { setActiveChannel } = useChatContext();

  useEffect(() => {
    setActiveChannel(channel);
  }, [channel, setActiveChannel]);

  return (
    <ChannelContainer
      type={type}
      threadOverlay
      showMessageInput
      showHeader={false}
      submitHandler={() => {}}
    />
  );
}

function MembersPopover({ members }: { members: ChatMember[] }) {
  if (!members.length) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1 text-xs text-gray-500">
          <InfoIcon className="size-3" />
          {members.length}
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-64 p-0">
        <div className="p-3 border-b flex items-center gap-2 text-sm font-medium">
          <UsersIcon className="size-4" />
          Members ({members.length})
        </div>

        <div className="max-h-60 overflow-y-auto">
          {members.map((m) => (
            <MemberItem key={m.id} member={m} />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function MemberItem({ member }: { member: ChatMember }) {
  const initials =
    member.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2) || "?";

  return (
    <div className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50">
      <AvatarSimple
        className="w-8 h-8 text-xs"
        src={member.avatar}
        fallback={initials}
      />
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">{member.name}</p>
        <p className="text-xs text-gray-500 truncate">{member.role}</p>
      </div>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-sm text-gray-500">
      {children}
    </div>
  );
}
