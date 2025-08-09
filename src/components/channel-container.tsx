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
import { AdminPanel } from "./admin/panel";
import { EmptyChannel } from "./empty-channel";
import { PinnedMessageList } from "./pinned-message-list";
import { TeamChannelHeader } from "./team-channel-header";

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

  //   // todo: migrate to channel capabilities once migration guide is available
  //   const teamPermissions: PinEnabledUserRoles = {
  //     ...defaultPinPermissions.team,
  //     user: true,
  //   };
  //   const messagingPermissions: PinEnabledUserRoles = {
  //     ...defaultPinPermissions.messaging,
  //     user: true,
  //   };

  //   const pinnedPermissions = {
  //     ...defaultPinPermissions,
  //     team: teamPermissions,
  //     messaging: messagingPermissions,
  //   };

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
          <TeamChannelHeader />
          <MessageList
            disableQuotedMessages={true}
            // pinPermissions={pinnedPermissions}
          />
          <MessageInput
            minRows={1}
            maxRows={8}
            overrideSubmitHandler={submitHandler}
          />
        </Window>
        <Thread additionalMessageInputProps={{ maxRows: 8, minRows: 1 }} />
        <PinnedMessageList />
      </Channel>
    </div>
  );
}

export default ChannelContainer;
