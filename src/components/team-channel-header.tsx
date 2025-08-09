"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useWorkspaceController } from "@/context/workspace-controller";
import { InfoIcon, PinIcon } from "lucide-react";
import { MouseEventHandler, useCallback, useMemo } from "react";
import {
  Avatar as StreamAvatar,
  useChannelActionContext,
  useChannelStateContext,
  useChatContext,
} from "stream-chat-react";

export const TeamChannelHeader = () => {
  const { displayWorkspace, togglePinnedMessageListOpen } =
    useWorkspaceController();
  const { client } = useChatContext();
  const { channel, watcher_count } = useChannelStateContext();
  const { closeThread } = useChannelActionContext();

  const teamHeader = `# ${
    channel?.data?.name || channel?.data?.id || "random"
  }`;

  const openChannelEditPanel = useCallback(() => {
    displayWorkspace("Admin-Channel-Edit");
  }, [displayWorkspace]);

  const onPinIconClick: MouseEventHandler = useCallback(
    (event) => {
      closeThread?.(event);
      togglePinnedMessageListOpen();
    },
    [closeThread, togglePinnedMessageListOpen]
  );

  const members = useMemo(() => {
    return Object.values(channel.state.members).filter(
      ({ user }) => user?.id !== client.userID
    );
  }, [channel.state.members, client.userID]);

  const additionalMembers = members.length - 3;

  const getWatcherText = (watchers?: number) => {
    if (!watchers) return "No users online";
    if (watchers === 1) return "1 user online";
    return `${watchers} users online`;
  };

  const hasPinnedMessages = (channel.state.pinnedMessages?.length || 0) > 0;

  return (
    <div className="flex w-full justify-between items-center p-3 bg-white border-b border-gray-200">
      {/* Left section */}
      {channel.type === "messaging" ? (
        <div className="flex items-center gap-4">
          {members.length > 0 ? (
            <>
              {members.slice(0, 3).map(({ user }, i) => (
                <div key={i} className="flex items-center gap-2">
                  <StreamAvatar
                    image={user?.image}
                    name={user?.name || user?.id}
                  />
                  <span className="text-sm font-medium text-gray-800">
                    {user?.name || user?.id || "Unknown User"}
                  </span>
                </div>
              ))}
              {additionalMembers > 0 && (
                <span className="text-sm text-gray-500">{`and ${additionalMembers} more`}</span>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2">
              <StreamAvatar />
              <span className="text-sm font-medium text-gray-800">
                Johnny Blaze
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold text-gray-900">
            {teamHeader}
          </span>
          <Button variant="ghost" size="icon" onClick={openChannelEditPanel}>
            <InfoIcon className="h-4 w-4 text-gray-600" />
          </Button>
        </div>
      )}

      {/* Right section */}
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-500">
          {getWatcherText(watcher_count)}
        </span>
        <Separator orientation="vertical" className="h-5" />
        <Button
          variant="ghost"
          size="sm"
          onClick={onPinIconClick}
          className="flex items-center gap-1"
        >
          <PinIcon className="h-4 w-4" />
          {hasPinnedMessages ? "Pins" : "No pinned messages"}
        </Button>
      </div>
    </div>
  );
};
