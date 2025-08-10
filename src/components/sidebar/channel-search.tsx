// src/components/ChannelSearch.tsx
"use client";

import { useWorkspaceController } from "@/context/workspace-controller";
import { WorkspaceFactory } from "@/types";
import { useCallback, useEffect, useState } from "react";
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

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "ArrowDown") {
        setFocused((prevFocused) => {
          if (prevFocused === undefined || allChannels === undefined) return 0;
          return prevFocused === allChannels.length - 1 ? 0 : prevFocused + 1;
        });
      } else if (event.key === "ArrowUp") {
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

  const onSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    setLoading(true);
    setFocused(undefined);
    setQuery(event.target.value);
    if (!event.target.value) {
      setTeamChannels([]);
      setDirectChannels([]);
      setAllChannels([]);
      setLoading(false);
      setDropdownOpen(false);
      displayWorkspace(WorkspaceFactory.createChat());
      return;
    }
    getChannels(event.target.value);
  };

  return (
    <div className="relative">
      <div className="">
        <Input
          onChange={onSearch}
          placeholder="Search"
          type="search"
          value={query}
        />
      </div>
      <ResultsDropdown
        teamChannels={teamChannels}
        directChannels={directChannels}
        focusedId={focusedId}
        loading={loading}
        setChannel={setChannel}
        setQuery={setQuery}
        dropdownOpen={dropdownOpen}
        setDropdownOpen={setDropdownOpen}
      />
    </div>
  );
};
