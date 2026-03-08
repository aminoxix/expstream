"use client";

import { AvatarSimple } from "@/components/ui/avatar-simple";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn, getFileUrl, getInitials } from "@/lib/utils";
import { getChannelDisplayName, getDisplayName } from "@/utils/helpers";
import React from "react";
import { Channel, UserResponse } from "stream-chat";
import { ChannelOrUserType, isChannel } from "./utils";

type SearchResultProps = {
  result: ChannelOrUserType;
  focusedId: string;
  setChannel: (channel: Channel) => void;
  onUserSelect: (user: UserResponse) => Promise<void>;
};

const SearchResultItem = ({
  result,
  focusedId,
  setChannel,
  onUserSelect,
}: SearchResultProps) => {
  if (isChannel(result)) {
    const channel = result as Channel;

    return (
      <div
        onClick={() => setChannel(channel)}
        className={cn("cursor-pointer p-2 hover:bg-muted rounded", {
          "bg-muted": focusedId === channel.id,
        })}
      >
        <span className="text-sm"># {getChannelDisplayName(channel)}</span>
      </div>
    );
  } else {
    const user = result as UserResponse;

    return (
      <div
        onClick={() => onUserSelect(user)}
        className={cn(
          "flex items-center gap-2 cursor-pointer p-2 hover:bg-muted rounded",
          {
            "bg-muted": focusedId === user.id,
          },
        )}
      >
        <AvatarSimple
          className="size-8 rounded-md"
          src={getFileUrl(user.image || "")}
          fallback={getInitials(getDisplayName(user) || user.name || user.id)}
        />
        <span className="text-sm">
          {getDisplayName(user) || user.name || user.id || "Unknown User"}
        </span>
      </div>
    );
  }
};

type ResultsDropdownProps = {
  children: React.ReactElement;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  teamChannels?: Channel[];
  directChannels?: UserResponse[];
  focusedId: string;
  loading: boolean;
  setChannel: (channel: Channel) => void;
  onUserSelect: (user: UserResponse) => Promise<void>;
  dropdownOpen: boolean;
  setDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

export const ResultsDropdown = ({
  children,
  inputRef,
  teamChannels = [],
  directChannels = [],
  focusedId,
  loading,
  setChannel,
  onUserSelect,
  dropdownOpen,
  setDropdownOpen,
}: ResultsDropdownProps) => {
  const handleOpenChange = (open: boolean) => {
    // Prevent Popover from auto-closing, only allow programmatic closing
    if (!open) return;
    setDropdownOpen(open);
  };

  return (
    <Popover open={dropdownOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        align="center"
        className="w-[calc(100vw-2rem)] sm:w-80 h-96 mt-2 rounded-lg shadow-lg border bg-popover z-50 p-0 overflow-hidden"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          inputRef?.current?.focus();
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (inputRef?.current?.contains(event.target as Node)) {
            event.preventDefault();
          }
        }}
        onEscapeKeyDown={(event) => {
          event.preventDefault();
          setDropdownOpen(false);
          inputRef?.current?.blur();
        }}
      >
        <div className="flex flex-col h-full">
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="p-2 text-sm font-medium border-b bg-gray-50">
              Channels
            </div>
            <div className="p-2">
              {loading && !teamChannels.length && (
                <div className="flex items-center justify-center p-4">
                  <i className="text-sm text-muted-foreground">Loading...</i>
                </div>
              )}
              {!loading && teamChannels.length === 0 && (
                <div className="flex items-center justify-center p-4">
                  <i className="text-sm text-muted-foreground">
                    No channels found
                  </i>
                </div>
              )}
              <div className="space-y-1">
                {teamChannels.map((channel) => (
                  <SearchResultItem
                    key={channel.id}
                    result={channel}
                    focusedId={focusedId}
                    setChannel={setChannel}
                    onUserSelect={onUserSelect}
                  />
                ))}
              </div>
            </div>
          </div>

          <Separator className="flex-shrink-0" />

          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="p-2 text-sm font-medium border-b bg-gray-50">
              Direct Messages
            </div>
            <div className="p-2">
              {loading && !directChannels.length && (
                <div className="flex items-center justify-center p-4">
                  <i className="text-sm text-muted-foreground">Loading...</i>
                </div>
              )}
              {!loading && directChannels.length === 0 && (
                <div className="flex items-center justify-center p-4">
                  <i className="text-sm text-muted-foreground">
                    No direct messages found
                  </i>
                </div>
              )}
              <div className="space-y-1">
                {directChannels.map((user) => (
                  <SearchResultItem
                    key={user.id}
                    result={user}
                    focusedId={focusedId}
                    setChannel={setChannel}
                    onUserSelect={onUserSelect}
                  />
                ))}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setDropdownOpen(false);
              inputRef?.current?.blur();
            }}
            className="flex-shrink-0 px-3 py-2 bg-gray-50 border-t w-full hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-xs font-mono shadow-sm hidden md:inline">
                Esc
              </kbd>
              <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-xs font-mono shadow-sm md:hidden">
                Press
              </kbd>
              <span>to close</span>
            </div>
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
