import React, { PropsWithChildren, useCallback } from "react";

import {
  useWorkspaceController,
  Workspace,
} from "../../context/WorkspaceController";

import { PlusCircleIcon } from "@phosphor-icons/react";
import type { ChannelListMessengerProps } from "stream-chat-react";
import { Button } from "../ui/button";

export type TeamChannelListProps = ChannelListMessengerProps & {
  type: string;
};

const ChannelList = (props: PropsWithChildren<TeamChannelListProps>) => {
  const { children, error = false, loading, type } = props;

  const { displayWorkspace } = useWorkspaceController();

  const handleAddChannelClick = useCallback(() => {
    console.log("type", type);
    displayWorkspace(`Admin-Admin-Channel-Create__${type}` as Workspace);
  }, [type, displayWorkspace]);

  if (error) {
    return type === "team" ? (
      <div className="team-channel-list">
        <p className="team-channel-list__message">
          Connection error, please wait a moment and try again.
        </p>
      </div>
    ) : null;
  }

  if (loading) {
    return (
      <div className="team-channel-list">
        <p className="team-channel-list__message loading">
          {type === "team" ? "Channels" : "Messages"} loading....
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex pt-4 justify-between items-center">
        <p className="uppercase text-xs text-gray-500 font-bold">
          {type === "team" ? "Channels" : "Direct Messages"}
        </p>
        <Button variant="ghost" onClick={handleAddChannelClick}>
          <PlusCircleIcon className="size-5" />
        </Button>
      </div>
      {children}
    </div>
  );
};

export const TeamChannelList = React.memo(ChannelList);
