import React, { PropsWithChildren, useCallback } from "react";

import { useWorkspaceController } from "@/context/workspace-controller";

import { WorkspaceFactory } from "@/types";
import { PlusCircleIcon } from "@phosphor-icons/react";
import type { ChannelListMessengerProps } from "stream-chat-react";
import { Button } from "../ui/button";

export type TeamChannelListProps = ChannelListMessengerProps & {
  type: "messaging" | "team";
};

const ChannelList = (props: PropsWithChildren<TeamChannelListProps>) => {
  const { children, error = false, loading, type } = props;

  const { displayWorkspace } = useWorkspaceController();

  const handleAddChannelClick = useCallback(() => {
    const workspace = WorkspaceFactory.createAdminChannelCreate(type);
    displayWorkspace(workspace);
  }, [type, displayWorkspace]);

  if (error) {
    return type === "team" ? (
      <p className="text-xs pt-4">
        Connection error, please wait a moment and try again.
      </p>
    ) : null;
  }

  if (loading) {
    return (
      <p className="text-sm">
        {type === "team" ? "Channels" : "Messages"} loading....
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
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
