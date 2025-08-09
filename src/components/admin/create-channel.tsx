import { ChannelNameInputField } from "./channel-name-input";
import { AdminPanelFooter } from "./footer";
import { AdminPanelHeader } from "./header";
import { UserList } from "./users-list";

import { useWorkspaceController } from "../../context/workspace-controller";
import { useAdminPanelFormState } from "./context/form";

export const CreateChannel = () => {
  const { closeAdminPanel } = useWorkspaceController();
  const { createChannelType, name, handleInputChange, handleSubmit, errors } =
    useAdminPanelFormState();

  return (
    <div className="h-full w-full flex flex-col gap-4">
      <AdminPanelHeader
        onClose={closeAdminPanel}
        title={
          createChannelType === "team"
            ? "Create a New Channel"
            : "Send a Direct Message"
        }
      />
      {createChannelType === "team" && (
        <ChannelNameInputField
          error={errors.name}
          name={name}
          onChange={handleInputChange}
          placeholder="channel-name (no spaces)"
        />
      )}
      <UserList />
      <AdminPanelFooter
        onButtonClick={handleSubmit}
        buttonText={
          createChannelType === "team"
            ? "Create Channel"
            : "Create Message Group"
        }
      />
    </div>
  );
};
