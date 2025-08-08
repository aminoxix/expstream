import { useWorkspaceController } from "@/context/workspace-controller";
import {
  LocalMessage,
  Message,
  SendMessageOptions,
  Channel as StreamChannel,
} from "stream-chat";
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
import "stream-chat-react/dist/css/v2/index.css";
import { AdminPanel } from "./AdminPanel/AdminPanel";
import CustomChannelHeader from "./channel-header";
import { EmptyChannel } from "./empty-channel";

interface IChannelContainer {
  setChatExpanded?: (expanded: boolean) => void;
  submitHandler: (params: {
    cid: string;
    localMessage: LocalMessage;
    message: Message;
    sendOptions: SendMessageOptions;
  }) => Promise<void> | void;
  setActiveChannel?: (channel: StreamChannel | undefined) => void;
}

function ChannelContainer({
  setChatExpanded,
  submitHandler,
  setActiveChannel,
}: IChannelContainer) {
  const { activeWorkspace } = useWorkspaceController();

  if (activeWorkspace.match("Admin")) {
    return <AdminPanel setActiveChannel={setActiveChannel} />;
  }

  return (
    <div className="p-4 w-full">
      <Channel
        EmptyStateIndicator={EmptyChannel}
        LoadingIndicator={LoadingIndicator}
        ReactionsList={SimpleReactionsList}
        ThreadHeader={ThreadHeader}
      >
        <Window>
          <CustomChannelHeader setChatExpanded={setChatExpanded} />
          <MessageList />
          <MessageInput overrideSubmitHandler={submitHandler} />
        </Window>
        <Thread />
      </Channel>
    </div>
  );
}

export default ChannelContainer;
