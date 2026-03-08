// src/components/sidebar/index.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  CHANNEL_TYPES,
  MESSAGING_CHANNEL_CONFIG,
  TEAM_CHANNEL_CONFIG,
  UI_MESSAGES,
} from "@/config";
import { useWorkspaceController } from "@/context/workspace-controller";
import { useChannelListManager } from "@/hooks/use-channel-list-manager";
import { usePaginatedChannels } from "@/hooks/use-paginated-channels";
import { WorkspaceFactory } from "@/types";
import { PlusCircleIcon } from "@phosphor-icons/react";
import Image from "next/image";
import { useCallback, useMemo } from "react";
import type { Channel as StreamChannel } from "stream-chat";
import { useChatContext } from "stream-chat-react";
import { ChannelPreview } from "./channel-preview";
import { ChannelSearch } from "./channel-search";

interface EnhancedSidebarProps {
  setActiveChannel: React.Dispatch<
    React.SetStateAction<StreamChannel | undefined>
  >;
  currentUserId?: string;
}

interface ChannelListSectionProps {
  setActiveChannel: EnhancedSidebarProps["setActiveChannel"];
  channelType: "team" | "messaging";
}

const EmptyGroupChannelListIndicator = () => (
  <div className="text-xs">{UI_MESSAGES.EMPTY_STATES.GROUP_CHANNELS}</div>
);

const EmptyDMChannelListIndicator = () => (
  <div className="text-xs">{UI_MESSAGES.EMPTY_STATES.DM_CHANNELS}</div>
);

function ChannelListSection({
  setActiveChannel,
  channelType,
}: ChannelListSectionProps) {
  const { client } = useChatContext();
  const { displayWorkspace } = useWorkspaceController();

  const handleAddChannelClick = useCallback(() => {
    const workspace = WorkspaceFactory.createAdminChannelCreate(channelType);
    displayWorkspace(workspace);
  }, [channelType, displayWorkspace]);

  const { filters } = useChannelListManager({
    client,
    userId: client.user?.id,
    channelType,
    autoRefresh: false,
  });

  // Use pagination hook with proper filtering
  const { channels, hasNextPage, loadNextPage, loading, error } =
    usePaginatedChannels(
      client,
      filters,
      { last_message_at: -1 },
      { limit: 5 },
      undefined,
    );

  // Apply additional filtering for announcement/survey channels
  const config = useMemo(() => {
    return channelType === CHANNEL_TYPES.TEAM
      ? TEAM_CHANNEL_CONFIG
      : MESSAGING_CHANNEL_CONFIG;
  }, [channelType]);

  const filteredChannels = useMemo(() => {
    return config.filterFn(channels);
  }, [channels, config.filterFn]);

  const EmptyIndicator =
    channelType === CHANNEL_TYPES.TEAM
      ? EmptyGroupChannelListIndicator
      : EmptyDMChannelListIndicator;

  return (
    <div className="flex flex-col gap-2">
      <div className="pt-4 flex items-center">
        <p className="uppercase text-xs text-gray-500 font-bold">
          {channelType === "team" ? "Channels" : "Direct Messages"}
        </p>
        <Button
          variant="ghost"
          className="size-10 ml-auto"
          onClick={handleAddChannelClick}
        >
          <PlusCircleIcon className="size-5" />
        </Button>
      </div>

      {/* Custom channel list with pagination */}
      <div className="flex flex-col gap-1 overflow-hidden">
        {filteredChannels.map((channel) => (
          <ChannelPreview
            key={channel.cid}
            channel={channel}
            type={channelType}
            setActiveChannel={setActiveChannel}
          />
        ))}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center gap-2 text-sm py-2">
          <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full" />
          <span>Loading...</span>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <p className="text-xs text-red-500 py-2">
          Connection error, please wait a moment and try again.
        </p>
      )}

      {/* Empty state */}
      {!loading && !error && filteredChannels.length === 0 && (
        <EmptyIndicator />
      )}

      {/* Pagination */}
      {hasNextPage && !loading && (
        <div className="flex items-center justify-center mt-2 px-2">
          <button
            onClick={loadNextPage}
            className="w-full px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Load more {channelType === "team" ? "channels" : "messages"}
          </button>
        </div>
      )}
    </div>
  );
}

export function EnhancedSidebar({
  setActiveChannel,
  currentUserId,
}: EnhancedSidebarProps) {
  return (
    <aside className="flex flex-col h-full">
      <div className="flex items-center gap-2.5 px-4 py-3 shrink-0">
        <Image
          src="/transparent-logo.png"
          alt="Expstream"
          width={28}
          height={28}
          className="shrink-0"
        />
        <span className="text-base font-semibold tracking-tight">
          Expstream
        </span>
      </div>

      <Separator className="shrink-0" />

      <div className="flex-1 overflow-y-auto">
        <div className="pb-3 pt-2">
          <ChannelSearch
            currentUserId={currentUserId}
            setActiveChannel={setActiveChannel}
          />
        </div>

        <Separator />

        <div className="px-2">
          <div className="py-2">
            <ChannelListSection
              setActiveChannel={setActiveChannel}
              channelType={CHANNEL_TYPES.TEAM}
            />
          </div>
          <Separator className="my-2" />
          <div className="py-2">
            <ChannelListSection
              setActiveChannel={setActiveChannel}
              channelType={CHANNEL_TYPES.MESSAGING}
            />
          </div>
        </div>
      </div>
    </aside>
  );
}

// Keep backward-compatible export
export const Sidebar = EnhancedSidebar;
