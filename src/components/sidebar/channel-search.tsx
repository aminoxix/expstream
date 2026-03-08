// src/components/ChannelSearch.tsx
"use client";

import { useWorkspaceController } from "@/context/workspace-controller";
import { useDebouncedCallback } from "@/hooks/debounce";
import { WorkspaceFactory } from "@/types";
import { analyzeChatError } from "@/utils/chat-error-handler";
import { Search } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Channel, ChannelFilters, UserResponse } from "stream-chat";
import { useChatContext } from "stream-chat-react";
import { Input } from "../ui/input";
import { ResultsDropdown } from "./results-dropdown";
import { channelByUser, ChannelOrUserType, isChannel } from "./utils";

interface ChannelSearchProps {
  currentUserId?: string;
  setActiveChannel?: React.Dispatch<React.SetStateAction<Channel | undefined>>;
}

export const ChannelSearch = ({
  currentUserId,
  setActiveChannel: externalSetActiveChannel,
}: ChannelSearchProps = {}) => {
  const { client, setActiveChannel } = useChatContext();
  const { displayWorkspace } = useWorkspaceController();

  const [allChannels, setAllChannels] = useState<
    ConcatArray<ChannelOrUserType> | undefined
  >();
  const [teamChannels, setTeamChannels] = useState<Channel[] | undefined>();
  const [directChannels, setDirectChannels] = useState<
    UserResponse[] | undefined
  >();
  const [focused, setFocused] = useState<number>();
  const [focusedId, setFocusedId] = useState("");
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setFocused((prevFocused) => {
          if (prevFocused === undefined || allChannels === undefined) return 0;
          return prevFocused === allChannels.length - 1 ? 0 : prevFocused + 1;
        });
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setFocused((prevFocused) => {
          if (prevFocused === undefined || allChannels === undefined) return 0;
          return prevFocused === 0 ? allChannels.length - 1 : prevFocused - 1;
        });
      } else if (event.key === "Enter") {
        event.preventDefault();

        const handleEnterAsync = async () => {
          if (allChannels !== undefined && focused !== undefined) {
            const channelToCheck = allChannels[focused]!;

            if (isChannel(channelToCheck)) {
              await setChannel(channelToCheck);
            } else {
              try {
                const channel = await channelByUser({
                  client,
                  setActiveChannel,
                  user: channelToCheck,
                });
                externalSetActiveChannel?.(channel);
                displayWorkspace(WorkspaceFactory.createChat());
              } catch (error) {
                const errorInfo = analyzeChatError(error);
                console.error("Failed to create/select channel:", errorInfo);
                toast.error(errorInfo.message);
              }
            }
          }

          setFocused(undefined);
          setFocusedId("");
          setQuery("");
          setDropdownOpen(false);
        };

        handleEnterAsync();
      } else if (event.key === "Escape") {
        setQuery("");
        setDropdownOpen(false);
        setTeamChannels([]);
        setDirectChannels([]);
        setAllChannels([]);
        displayWorkspace(WorkspaceFactory.createChat());
      }
    },
    [allChannels, client, focused, setActiveChannel, displayWorkspace],
  );

  const handleKeyDownRef = useRef(handleKeyDown);
  handleKeyDownRef.current = handleKeyDown;

  useEffect(() => {
    if (!query) return;
    const handler = (e: KeyboardEvent) => handleKeyDownRef.current(e);
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [query]);

  useEffect(() => {
    if (query) {
      setDropdownOpen(true);
    }
  }, [query]);

  useEffect(() => {
    if (!query && !dropdownOpen) {
      setTeamChannels([]);
      setDirectChannels([]);
      setAllChannels([]);
    }
  }, [query, dropdownOpen]);

  useEffect(() => {
    if (focused !== undefined && focused >= 0 && allChannels) {
      setFocusedId(allChannels[focused]?.id || "");
    }
  }, [allChannels, focused]);

  const setChannel = useCallback(
    async (channel: Channel) => {
      try {
        await channel.watch();
        setQuery("");
        setActiveChannel(channel);
        externalSetActiveChannel?.(channel);
        setDropdownOpen(false);
        displayWorkspace(WorkspaceFactory.createChat());
      } catch (error) {
        const errorInfo = analyzeChatError(error);
        console.error("Failed to watch channel:", errorInfo);
        toast.error(`Failed to access channel: ${errorInfo.message}`);
      }
    },
    [setActiveChannel, externalSetActiveChannel, displayWorkspace],
  );

  const handleUserSelect = useCallback(
    async (user: UserResponse) => {
      try {
        const channel = await channelByUser({
          client,
          setActiveChannel,
          user,
        });
        externalSetActiveChannel?.(channel);
        setQuery("");
        setDropdownOpen(false);
        displayWorkspace(WorkspaceFactory.createChat());
      } catch (error) {
        const errorInfo = analyzeChatError(error);
        console.error("Failed to create/select channel:", errorInfo);
        toast.error(errorInfo.message);
      }
    },
    [client, setActiveChannel, externalSetActiveChannel, displayWorkspace],
  );

  const getChannels = useCallback(
    async (text: string) => {
      const userId = currentUserId || client.user?.id;

      if (!userId) {
        console.warn("No user ID available for channel search");
        return;
      }

      try {
        setLoading(true);

        const channelFilter: ChannelFilters = {
          type: "team",
          name: { $autocomplete: text },
          members: { $in: [userId] },
        };

        const messagingFilter: ChannelFilters = {
          type: "messaging",
          last_message_at: { $exists: true },
          members: { $in: [userId] },
        };

        const channelResponse = client.queryChannels(
          channelFilter,
          {},
          { limit: 5 },
        );

        const messagingChannelsForSearchResponse = client.queryChannels(
          messagingFilter,
          { last_message_at: -1 },
          { limit: 50 },
        );

        const [channels, messagingChannelsForSearch] = await Promise.all([
          channelResponse,
          messagingChannelsForSearchResponse,
        ]);

        const searchUsersMap = new Map<string, UserResponse>();

        for (const channel of messagingChannelsForSearch) {
          if (channel.state.members) {
            Object.values(channel.state.members).forEach((member) => {
              if (member?.user && member.user.id !== userId) {
                const user = member.user;
                const userName = user.name?.toLowerCase() || "";
                const userUsername = user.username?.toLowerCase() || "";
                const userIdLower = user.id.toLowerCase();
                const searchTerm = text.toLowerCase();

                if (
                  userName.includes(searchTerm) ||
                  userUsername.includes(searchTerm) ||
                  userIdLower.includes(searchTerm)
                ) {
                  searchUsersMap.set(user.id, user);
                }
              }
            });
          }
        }

        const filteredChannels = channels.filter(
          (channel) =>
            !channel.id?.includes("announcement") &&
            !channel.id?.includes("survey"),
        );

        const otherUsers = Array.from(searchUsersMap.values()).slice(0, 5);
        setTeamChannels(filteredChannels);
        setDirectChannels(otherUsers);
        setAllChannels([...filteredChannels, ...otherUsers]);
      } catch (event) {
        setQuery("");
        setDropdownOpen(false);
        displayWorkspace(WorkspaceFactory.createChat());
      } finally {
        setLoading(false);
      }
    },
    [client, currentUserId, displayWorkspace],
  );

  const debouncedGetChannels = useDebouncedCallback(getChannels, 300);

  const getDefaultChannelsAndUsers = useCallback(async () => {
    const userId = currentUserId || client.user?.id;

    if (!userId) {
      console.warn("No user ID available for default channels");
      return;
    }

    try {
      setLoading(true);

      const defaultChannelFilter: ChannelFilters = {
        type: "team",
        members: { $in: [userId] },
      };

      const defaultMessagingFilter: ChannelFilters = {
        type: "messaging",
        last_message_at: { $exists: true },
        members: { $in: [userId] },
      };

      const channelResponse = client.queryChannels(
        defaultChannelFilter,
        { last_message_at: -1, updated_at: -1 },
        { limit: 5 },
      );

      const messagingChannelsResponse = client.queryChannels(
        defaultMessagingFilter,
        { last_message_at: -1 },
        { limit: 20 },
      );

      const [channels, messagingChannels] = await Promise.all([
        channelResponse,
        messagingChannelsResponse,
      ]);

      const messagingUsers = new Map<string, UserResponse>();

      for (const channel of messagingChannels) {
        if (channel.state.members) {
          Object.values(channel.state.members).forEach((member) => {
            if (member?.user && member.user.id !== userId) {
              messagingUsers.set(member.user.id, member.user);
            }
          });
        }
      }

      const users = Array.from(messagingUsers.values()).slice(0, 5);

      const filteredChannels = channels.filter(
        (channel) =>
          !channel.id?.includes("announcement") &&
          !channel.id?.includes("survey"),
      );

      const otherUsers = users.filter((user) => user.id !== client.user?.id);
      setTeamChannels(filteredChannels);
      setDirectChannels(otherUsers);
      setAllChannels([...filteredChannels, ...otherUsers]);
    } catch (error) {
      const errorInfo = analyzeChatError(error);
      console.error("Failed to load default channels and users:", errorInfo);
    } finally {
      setLoading(false);
    }
  }, [client, currentUserId]);

  const onSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();

    const value = event.target.value;
    setQuery(value);
    setFocused(undefined);

    if (!value.trim()) {
      getDefaultChannelsAndUsers();
      return;
    }

    setLoading(true);
    debouncedGetChannels(value);
  };

  const handleFocus = () => {
    setDropdownOpen(true);
    if (query.trim() === "") {
      getDefaultChannelsAndUsers();
    }
  };

  return (
    <div className="relative">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
        <Search className="size-4" />
      </div>

      <ResultsDropdown
        inputRef={inputRef}
        teamChannels={teamChannels}
        directChannels={directChannels}
        focusedId={focusedId}
        loading={loading}
        setChannel={setChannel}
        onUserSelect={handleUserSelect}
        dropdownOpen={dropdownOpen}
        setDropdownOpen={setDropdownOpen}
      >
        <Input
          type="search"
          value={query}
          ref={inputRef}
          onChange={onSearch}
          onFocus={handleFocus}
          className="pl-9 w-full"
          placeholder="Search channels or users..."
        />
      </ResultsDropdown>
    </div>
  );
};
