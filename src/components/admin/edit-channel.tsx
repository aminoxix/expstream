import { ChannelNameInputField } from "./channel-name-input";
import { AdminPanelFooter } from "./footer";
import { AdminPanelHeader } from "./header";
import { UserList } from "./users-list";

import { useWorkspaceController } from "../../context/workspace-controller";
import { useAdminPanelFormState } from "./context/form";

export const EditChannel = () => {
  const { closeAdminPanel } = useWorkspaceController();
  const { name, handleInputChange, handleSubmit, errors } =
    useAdminPanelFormState();

  return (
    <div className="h-full w-full flex flex-col gap-4">
      <AdminPanelHeader onClose={closeAdminPanel} title="Edit Channel" />
      <ChannelNameInputField
        name={name}
        error={errors.name}
        onChange={handleInputChange}
      />
      <UserList />
      <AdminPanelFooter
        buttonText="Save Changes"
        onButtonClick={handleSubmit}
      />
    </div>
  );
};
