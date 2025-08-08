import clsx from "clsx";
import { useCallback } from "react";
import {
  ChannelPreviewUIComponentProps,
  useChatContext,
} from "stream-chat-react";

import { DirectMessagingChannelPreview } from "./DirectMessagingChannelPreview";
import { TeamChannelPreview } from "./TeamChannelPreview";

import { useWorkspaceController } from "../../context/workspace-controller";
import { Button } from "../ui/button";

type TeamChannelPreviewProps = ChannelPreviewUIComponentProps & {
  type: string;
};

export const ChannelPreview = ({ channel, type }: TeamChannelPreviewProps) => {
  const { channel: activeChannel, setActiveChannel } = useChatContext();
  const { displayWorkspace } = useWorkspaceController();

  const handleClick = useCallback(() => {
    displayWorkspace("Chat");
    if (setActiveChannel) {
      setActiveChannel(channel);
    }
  }, [channel, displayWorkspace, setActiveChannel]);

  return (
    <Button
      variant="ghost"
      className={clsx(
        "flex justify-start",
        channel?.id === activeChannel?.id ? "font-bold" : "font-normal"
      )}
      onClick={handleClick}
    >
      {type === "team" ? (
        <TeamChannelPreview
          name={
            channel?.data?.config?.name ||
            (channel?.data?.id as string) ||
            "random"
          }
        />
      ) : (
        <DirectMessagingChannelPreview channel={channel} />
      )}
    </Button>
  );
};
