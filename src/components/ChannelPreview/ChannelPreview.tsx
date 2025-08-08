import clsx from "clsx";
import { useCallback } from "react";
import { Channel } from "stream-chat";
import {
  ChannelPreviewUIComponentProps,
  useChatContext,
} from "stream-chat-react";
import { useWorkspaceController } from "../../context/workspace-controller";
import { Button } from "../ui/button";
import { DirectMessagingChannelPreview } from "./DirectMessagingChannelPreview";
import { TeamChannelPreview } from "./TeamChannelPreview";

type TeamChannelPreviewProps = ChannelPreviewUIComponentProps & {
  type: string;
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
    displayWorkspace("Chat");
    setContextActiveChannel(channel);
    setActiveChannel?.(channel);
  }, [channel, displayWorkspace, setContextActiveChannel, setActiveChannel]);

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
