// src/components/ChannelSearch.tsx
"use client";

import { useWorkspaceController } from "@/context/workspace-controller";
import { useDebouncedCallback } from "@/hooks/debounce";
import { WorkspaceFactory } from "@/types";
import { Search } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Channel, UserResponse } from "stream-chat";
import { useChatContext } from "stream-chat-react";
import { Input } from "../ui/input";
import { ResultsDropdown } from "./results-dropdown";
import { channelByUser, ChannelOrUserType, isChannel } from "./utils";

export const ChannelSearch = () => {
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

  // Input ref (nullable) — pass to ResultsDropdown to focus on open
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

        if (allChannels !== undefined && focused !== undefined) {
          const channelToCheck = allChannels[focused];

          if (isChannel(channelToCheck)) {
            setActiveChannel(channelToCheck);
            displayWorkspace(
              WorkspaceFactory.createAdminChannelEdit(channelToCheck)
            );
          } else {
            channelByUser({ client, setActiveChannel, user: channelToCheck });
            displayWorkspace(WorkspaceFactory.createChat());
          }
        }

        setFocused(undefined);
        setFocusedId("");
        setQuery("");
        setDropdownOpen(false);
      } else if (event.key === "Escape") {
        setQuery("");
        setDropdownOpen(false);
        displayWorkspace(WorkspaceFactory.createChat());
      }
    },
    [allChannels, client, focused, setActiveChannel, displayWorkspace]
  );

  useEffect(() => {
    if (query) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown, query]);

  useEffect(() => {
    if (!query) {
      setTeamChannels([]);
      setDirectChannels([]);
      setAllChannels([]);
      setDropdownOpen(false);
    } else {
      setDropdownOpen(true);
    }
  }, [query]);

  useEffect(() => {
    if (focused !== undefined && focused >= 0 && allChannels) {
      setFocusedId(allChannels[focused].id || "");
    }
  }, [allChannels, focused]);

  const setChannel = (channel: Channel) => {
    setQuery("");
    setActiveChannel(channel);
    setDropdownOpen(false);
    displayWorkspace(WorkspaceFactory.createAdminChannelEdit(channel));
  };

  const getChannels = async (text: string) => {
    try {
      setLoading(true);
      const channelResponse = client.queryChannels(
        {
          type: "team",
          name: { $autocomplete: text },
          members: { $in: [client.userID as string] },
        },
        {},
        { limit: 5 }
      );

      const userResponse = client.queryUsers(
        { name: { $autocomplete: text } },
        { id: 1 },
        { limit: 5 }
      );

      const [channels, { users }] = await Promise.all([
        channelResponse,
        userResponse,
      ]);
      const otherUsers = users.filter((user) => user.id !== client.userID);
      setTeamChannels(channels);
      setDirectChannels(otherUsers);
      setAllChannels([...channels, ...otherUsers]);
    } catch (event) {
      setQuery("");
      setDropdownOpen(false);
      displayWorkspace(WorkspaceFactory.createChat());
    } finally {
      setLoading(false);
    }
  };

  const debouncedGetChannels = useDebouncedCallback(getChannels, 300);

  const onSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();

    const value = event.target.value;
    setQuery(value);
    setFocused(undefined);

    if (!value.trim()) {
      setTeamChannels([]);
      setDirectChannels([]);
      setAllChannels([]);
      setLoading(false);
      displayWorkspace(WorkspaceFactory.createChat());
      setDropdownOpen(false);
      return;
    }

    setLoading(true);
    debouncedGetChannels(value);
  };

  const handleFocus = () => {
    if (query.trim() !== "") {
      setDropdownOpen(true);
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
        dropdownOpen={dropdownOpen}
        setDropdownOpen={setDropdownOpen}
      >
        <Input
          ref={inputRef}
          type="search"
          value={query}
          onFocus={handleFocus}
          className="pl-9 w-full"
          onChange={onSearch}
          placeholder="Search channels or users..."
        />
      </ResultsDropdown>
    </div>
  );
};
