import { LocalMessage, Message, SendMessageOptions } from "stream-chat";
//   Channel as StreamChannel,

import {
  Channel,
  LoadingIndicator,
  MessageInput,
  MessageList,
  SimpleReactionsList,
  Thread,
  ThreadHeader,
  Window,
} from "stream-chat-react";

import { useWorkspaceController } from "@/context/workspace-controller";
import "stream-chat-react/dist/css/v2/index.css";
import { AdminPanel } from "./AdminPanel/AdminPanel";
import CustomChannelHeader from "./channel-header";
import { EmptyChannel } from "./empty-channel";

interface IChannelContainer {
  //   channel: StreamChannel;
  setChatExpanded?: (expanded: boolean) => void;
  submitHandler: (params: {
    cid: string;
    localMessage: LocalMessage;
    message: Message;
    sendOptions: SendMessageOptions;
  }) => Promise<void> | void;
}

function ChannelContainer({
  //   channel,
  setChatExpanded,
  submitHandler,
}: IChannelContainer) {
  const { activeWorkspace } = useWorkspaceController();

  if (activeWorkspace.match("Admin")) {
    return <AdminPanel />;
  }

  return (
    <Channel
      //   channel={channel}
      EmptyStateIndicator={EmptyChannel}
      LoadingIndicator={LoadingIndicator}
      ReactionsList={SimpleReactionsList}
      ThreadHeader={ThreadHeader}
    >
      <div className="p-4 w-full">
        <Window>
          <CustomChannelHeader setChatExpanded={setChatExpanded} />
          <MessageList />
          <MessageInput overrideSubmitHandler={submitHandler} />
        </Window>
      </div>
      <Thread />
    </Channel>
  );
}

export default ChannelContainer;
