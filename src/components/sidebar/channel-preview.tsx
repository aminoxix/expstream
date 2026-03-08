// src/components/channel-preview.tsx
"use client";

import { Button } from "@/components/ui/button";
import { useWorkspaceController } from "@/context/workspace-controller";
import { WorkspaceFactory } from "@/types";
import { getChannelDisplayName } from "@/utils/helpers";
import clsx from "clsx";
import { useCallback } from "react";
import { Channel } from "stream-chat";
import {
  ChannelPreviewUIComponentProps,
  useChatContext,
} from "stream-chat-react";
import { DirectMessagingChannelPreview } from "./dm-channel-preview";
import { TeamChannelPreview } from "./team-channel-preview";

type TeamChannelPreviewProps = ChannelPreviewUIComponentProps & {
  type: "team" | "messaging";
  setActiveChannel?: (channel: Channel | undefined) => void;
};

export const ChannelPreview = ({
  channel,
  type,
  setActiveChannel,
}: TeamChannelPreviewProps) => {
  const { channel: activeChannel, setActiveChannel: setContextActiveChannel } =
    useChatContext();
  const { displayWorkspace } = useWorkspaceController();

  const handleClick = useCallback(() => {
    displayWorkspace(WorkspaceFactory.createChat());
    setContextActiveChannel(channel);
    setActiveChannel?.(channel);
  }, [channel, displayWorkspace, setContextActiveChannel, setActiveChannel]);

  return (
    <Button
      variant="ghost"
      className={clsx(
        "flex justify-start w-full",
        channel?.id === activeChannel?.id
          ? "font-bold bg-gray-200"
          : "font-normal",
      )}
      onClick={handleClick}
    >
      {type === "team" ? (
        <TeamChannelPreview
          channel={channel}
          name={getChannelDisplayName(channel) || "random"}
        />
      ) : (
        <DirectMessagingChannelPreview channel={channel} />
      )}
    </Button>
  );
};
