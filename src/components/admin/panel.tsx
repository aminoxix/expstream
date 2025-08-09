import { useCallback } from "react";
import { Channel as StreamChannel } from "stream-chat";
import { useChatContext } from "stream-chat-react";
import { useWorkspaceController } from "../../context/workspace-controller";
import { AdminPanelForm, FormValues } from "./context/form";
import { CreateChannel } from "./create-channel";
import { EditChannel } from "./edit-channel";

interface AdminPanelProps {
  setActiveChannel?: (channel: StreamChannel | undefined) => void;
}

export const AdminPanel = ({ setActiveChannel }: AdminPanelProps) => {
  const { client, channel } = useChatContext();
  const { displayWorkspace, activeWorkspace } = useWorkspaceController();
  const onSubmit = useCallback(
    (newChannel?: StreamChannel) => {
      displayWorkspace("Chat");
      if (newChannel && setActiveChannel) {
        setActiveChannel(newChannel);
      }
    },
    [displayWorkspace, setActiveChannel]
  );

  let defaultFormValues: FormValues = { name: "", members: [] };
  let Form = null;

  if (activeWorkspace.match("Channel-Create")) {
    defaultFormValues = {
      members: client.userID ? [client.userID] : [],
      name: "",
    };
    Form = CreateChannel;
  } else if (activeWorkspace.match("Channel-Edit")) {
    defaultFormValues = {
      members: [],
      name: channel?.data?.config?.name || (channel?.data?.id as string),
    };
    Form = EditChannel;
  }
  return (
    <AdminPanelForm
      workspace={activeWorkspace}
      onSubmit={onSubmit}
      defaultValues={defaultFormValues}
    >
      <div className="w-full h-full p-4">{Form && <Form />}</div>
    </AdminPanelForm>
  );
};
