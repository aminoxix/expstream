import React, {
  PropsWithChildren,
  useCallback,
  useEffect,
  useState,
} from "react";

import { Button } from "@/components/ui/button";
import { useWorkspaceController } from "@/context/workspace-controller";
import { WorkspaceFactory } from "@/types";
import { PlusCircleIcon } from "@phosphor-icons/react";
import type { ChannelListMessengerProps } from "stream-chat-react";

export type TeamChannelListProps = ChannelListMessengerProps & {
  type: "messaging" | "team";
};

const ChannelList = (props: PropsWithChildren<TeamChannelListProps>) => {
  const { children, error = false, loading, type } = props;
  const { displayWorkspace } = useWorkspaceController();
  const [isInitializing, setIsInitializing] = useState(true);

  const handleAddChannelClick = useCallback(() => {
    const workspace = WorkspaceFactory.createAdminChannelCreate(type);
    displayWorkspace(workspace);
  }, [type, displayWorkspace]);

  // Track initial connection to show loading instead of premature errors
  useEffect(() => {
    if (!error && !loading) {
      const timer = setTimeout(() => {
        setIsInitializing(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [error, loading]);

  // Show loading state during initialization or explicit loading
  if (loading || (isInitializing && error)) {
    return (
      <div className="flex items-center gap-2 text-sm pt-4">
        <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full" />
        <p>{type === "team" ? "Loading channels" : "Loading messages"}...</p>
      </div>
    );
  }

  // Show error state only after initialization completes
  if (error && !isInitializing) {
    return type === "team" ? (
      <p className="text-xs pt-4 text-red-500">
        Connection error, please wait a moment and try again.
      </p>
    ) : null;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="pt-4 flex items-center">
        <p className="uppercase text-xs text-gray-500 font-bold">
          {type === "team" ? "Channels" : "Direct Messages"}
        </p>
        <Button
          variant="ghost"
          className="ml-auto"
          onClick={handleAddChannelClick}
        >
          <PlusCircleIcon className="size-5" />
        </Button>
      </div>
      {children}
    </div>
  );
};

export const TeamChannelList = React.memo(ChannelList);
