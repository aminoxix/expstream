// src/components/channel-preview.tsx
"use client";

import { WorkspaceFactory } from "@/types";
import clsx from "clsx";
import { useCallback } from "react";
import { Channel } from "stream-chat";
import {
  ChannelPreviewUIComponentProps,
  useChatContext,
} from "stream-chat-react";
import { useWorkspaceController } from "../../context/workspace-controller";
import { Button } from "../ui/button";
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
        "flex justify-start",
        channel?.id === activeChannel?.id
          ? "font-bold bg-gray-200"
          : "font-normal"
      )}
      onClick={handleClick}
    >
      {type === "team" ? (
        <TeamChannelPreview
          name={channel?.data?.name || channel?.id || "random"}
        />
      ) : (
        <DirectMessagingChannelPreview channel={channel} />
      )}
    </Button>
  );
};
