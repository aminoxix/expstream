"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AvatarSimple } from "@/components/ui/avatar-simple";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useWorkspaceController } from "@/context/workspace-controller";
import { getFileUrl, getInitials } from "@/lib/utils";
import { WorkspaceFactory } from "@/types";
import { getChannelDisplayName, getDisplayName } from "@/utils/helpers";
import {
  CaretLeftIcon,
  EnvelopeSimpleIcon,
  HashStraightIcon,
  PencilSimpleIcon,
  PushPinIcon,
  UsersIcon,
} from "@phosphor-icons/react";
import { MouseEventHandler, useCallback, useMemo } from "react";
import {
  useChannelActionContext,
  useChannelStateContext,
  useChatContext,
} from "stream-chat-react";

interface TeamChannelHeaderProps {
  onBack?: () => void;
}

export const TeamChannelHeader = ({ onBack }: TeamChannelHeaderProps = {}) => {
  const { displayWorkspace, togglePinnedMessageListOpen } =
    useWorkspaceController();
  const { client, channel: activeChannel } = useChatContext();
  const { channel, watcher_count } = useChannelStateContext();
  const { closeThread } = useChannelActionContext();

  const openChannelEditPanel = useCallback(() => {
    const targetChannel = channel || activeChannel;
    if (!targetChannel) {
      console.error("No channel available for editing");
      return;
    }
    const workspace = WorkspaceFactory.createAdminChannelEdit(targetChannel);
    displayWorkspace(workspace);
  }, [displayWorkspace, channel, activeChannel]);

  const onPinIconClick: MouseEventHandler = useCallback(
    (event) => {
      closeThread?.(event);
      togglePinnedMessageListOpen();
    },
    [closeThread, togglePinnedMessageListOpen],
  );

  const otherMembers = useMemo(() => {
    return Object.values(channel.state.members).filter(
      ({ user }) => user?.id !== client.user?.id,
    );
  }, [channel.state.members, client.user?.id]);

  const allMembers = useMemo(() => {
    return Object.values(channel.state.members);
  }, [channel.state.members]);

  const additionalMembers = otherMembers.length - 3;

  const hasPinnedMessages = (channel.state.pinnedMessages?.length || 0) > 0;

  return (
    <div className="flex w-full justify-between items-center p-4 bg-white border-b border-gray-200">
      {/* Left section */}
      <div className="flex items-center gap-2">
        {onBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="md:hidden size-8"
          >
            <CaretLeftIcon className="size-4" />
          </Button>
        )}
        {channel.type === "messaging" ? (
          <div className="flex items-center gap-4">
            {otherMembers.length > 0 ? (
              <>
                {otherMembers.slice(0, 3).map(({ user }, i) => {
                  const name =
                    getDisplayName(user) ||
                    user?.name ||
                    user?.id ||
                    "Unknown User";
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <AvatarSimple
                        className="size-8 rounded-full"
                        src={getFileUrl(user?.image || "")}
                        fallback={getInitials(user?.name || "")}
                      />
                      <span className="text-sm font-medium text-gray-800">
                        {name}
                      </span>
                    </div>
                  );
                })}
                {additionalMembers > 0 && (
                  <span className="text-sm text-gray-500">{`and ${additionalMembers} more`}</span>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2">
                <AvatarSimple className="size-8 rounded-full" fallback="U" />
                <span className="text-sm font-medium text-gray-800">
                  Chat User
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <HashStraightIcon weight="bold" size="20px" />
            <span className="text-base font-semibold text-gray-900">
              {getChannelDisplayName(channel) || "random"}
            </span>
          </div>
        )}
      </div>

      {/* Right section */}
      <div className="flex items-center">
        <Popover>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-gray-100 transition-colors">
              <div className="hidden sm:flex -space-x-2">
                {allMembers.slice(0, 4).map(({ user }) => (
                  <Avatar
                    key={user?.id}
                    className="size-6 rounded-full border border-gray-300"
                  >
                    <AvatarImage
                      src={getFileUrl(user?.image || "")}
                      alt={getDisplayName(user) || user?.name}
                    />
                    <AvatarFallback className="rounded-full text-[10px] font-medium bg-gray-100 text-gray-600">
                      {(getDisplayName(user) ||
                        user?.name ||
                        user?.id)?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {allMembers.length > 4 && (
                  <div className="flex items-center justify-center size-6 rounded-full border border-gray-300 bg-gray-100 text-[10px] font-medium text-gray-600">
                    +{allMembers.length - 4}
                  </div>
                )}
              </div>
              <span className="text-xs text-gray-500">{allMembers.length}</span>
              <UsersIcon className="size-4 text-gray-400" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            className="w-[calc(100vw-2rem)] sm:w-80 md:w-96 p-0"
          >
            <div className="px-3 py-2.5 border-b">
              <p className="text-sm font-semibold text-gray-900">Members</p>
              <p className="text-xs text-gray-500">
                {allMembers.length} member{allMembers.length !== 1 ? "s" : ""}
              </p>
            </div>
            <ScrollArea className="max-h-64">
              <div className="py-1">
                {allMembers.map(({ user, role }) => {
                  const customUser = user as typeof user & {
                    email?: string;
                    user_type?: string;
                  };
                  const name =
                    getDisplayName(user) || user?.name || user?.id || "Unknown";
                  const isCurrentUser = user?.id === client.user?.id;

                  return (
                    <div
                      key={user?.id}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50"
                    >
                      <AvatarSimple
                        fallback={getInitials(name)}
                        src={getFileUrl(user?.image || "")}
                        className="size-8 rounded-lg flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {name}
                          {isCurrentUser && (
                            <span className="text-xs font-normal text-gray-400 ml-1">
                              (you)
                            </span>
                          )}
                        </p>
                        {customUser?.email && (
                          <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                            <EnvelopeSimpleIcon className="size-3 flex-shrink-0" />
                            {customUser.email}
                          </p>
                        )}
                      </div>
                      {role && role !== "member" && (
                        <Badge variant="secondary" className="text-xs">
                          {role}
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>

        <Separator orientation="vertical" className="h-5" />
        <Button
          variant="ghost"
          onClick={onPinIconClick}
          className="mr-2 flex items-center gap-1"
        >
          <PushPinIcon className="h-4 w-4" />
          {hasPinnedMessages ? "Pins" : "No pinned messages"}
        </Button>
        {channel.type !== "messaging" && (
          <Button variant="outline" size="icon" onClick={openChannelEditPanel}>
            <PencilSimpleIcon className="h-4 w-4 text-gray-600" />
          </Button>
        )}
      </div>
    </div>
  );
};
