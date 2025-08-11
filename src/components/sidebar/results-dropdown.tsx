"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import React from "react";
import { Channel, UserResponse } from "stream-chat";
import { Avatar, useChatContext } from "stream-chat-react";
import { channelByUser, ChannelOrUserType, isChannel } from "./utils";

type SearchResultProps = {
  result: ChannelOrUserType;
  focusedId: string;
  setChannel: (channel: Channel) => void;
};

const SearchResultItem = ({
  result,
  focusedId,
  setChannel,
}: SearchResultProps) => {
  const { client, setActiveChannel } = useChatContext();

  if (isChannel(result)) {
    const channel = result as Channel;

    return (
      <div
        onClick={() => setChannel(channel)}
        className={cn("cursor-pointer p-2 hover:bg-muted rounded", {
          "bg-muted": focusedId === channel.id,
        })}
      >
        <span className="text-sm"># {channel?.data?.name || channel.id}</span>
      </div>
    );
  } else {
    const user = result as UserResponse;

    return (
      <div
        onClick={() => channelByUser({ client, setActiveChannel, user })}
        className={cn(
          "flex items-center gap-2 cursor-pointer p-2 hover:bg-muted rounded",
          {
            "bg-muted": focusedId === user.id,
          }
        )}
      >
        <div className="size-8 justify-center items-center flex">
          <Avatar image={user.image} name={user.name || user.id} />
        </div>
        <span className="text-sm">
          {user.name || user.id || "Unknown User"}
        </span>
      </div>
    );
  }
};

type ResultsDropdownProps = {
  children: React.ReactElement; // single child — the Input component (trigger)
  inputRef?: React.RefObject<HTMLInputElement | null>; // accept nullable ref
  teamChannels?: Channel[];
  directChannels?: UserResponse[];
  focusedId: string;
  loading: boolean;
  setChannel: (channel: Channel) => void;
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
  dropdownOpen,
  setDropdownOpen,
}: ResultsDropdownProps) => {
  return (
    <Popover open={dropdownOpen} onOpenChange={setDropdownOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        align="center"
        className="w-64 mt-2 max-h-80 overflow-y-auto rounded-lg shadow-lg border bg-popover z-50 p-0"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          // Ensure focus stays on input
          inputRef?.current?.focus();
        }}
        onInteractOutside={(event) => {
          // Prevent closing if interacting with input
          if (inputRef?.current?.contains(event.target as Node)) {
            event.preventDefault();
          }
        }}
        onEscapeKeyDown={(event) => {
          // Close dropdown on escape but keep focus on input
          event.preventDefault();
          setDropdownOpen(false);
          inputRef?.current?.focus();
        }}
      >
        <div className="p-2 text-sm font-medium border-b">Channels</div>
        <div className="p-2">
          {loading && !teamChannels.length && <i>Loading...</i>}
          {!loading && teamChannels.length === 0 && (
            <i className="text-sm">No channels found</i>
          )}
          {teamChannels.map((channel) => (
            <SearchResultItem
              key={channel.id}
              result={channel}
              focusedId={focusedId}
              setChannel={setChannel}
            />
          ))}
        </div>

        <Separator />

        <div className="p-2 text-sm font-medium border-b">Users</div>
        <div className="p-2">
          {loading && !directChannels.length && <i>Loading...</i>}
          {!loading && directChannels.length === 0 && (
            <i className="text-sm">No direct messages found</i>
          )}
          {directChannels.map((user) => (
            <SearchResultItem
              key={user.id}
              result={user}
              focusedId={focusedId}
              setChannel={setChannel}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
