import { AdminPanelFooter } from "./AdminPanelFooter";
import { AdminPanelHeader } from "./AdminPanelHeader";
import { ChannelNameInputField } from "./ChannelNameInputField";
import { UserList } from "./users-list";

import { useWorkspaceController } from "../../context/workspace-controller";
import { useAdminPanelFormState } from "./context/AdminPanelFormContext";

export const EditChannel = () => {
  const { closeAdminPanel } = useWorkspaceController();
  const { name, handleInputChange, handleSubmit, errors } =
    useAdminPanelFormState();

  return (
    <div className="admin-panel__form">
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
