// src/components/edit-channel.tsx
"use client";

import { useWorkspaceController } from "../../context/workspace-controller";
import { ChannelNameInputField } from "./channel-name-input";
import { useAdminPanelFormState } from "./context/form";
import { AdminPanelFooter } from "./footer";
import { AdminPanelHeader } from "./header";
import { UserList } from "./users-list";

export const EditChannel = () => {
  const { closeAdminPanel } = useWorkspaceController();
  const { name, handleInputChange, handleSubmit, errors } =
    useAdminPanelFormState();

  return (
    <div className="h-full w-full flex flex-col gap-4">
      <AdminPanelHeader onClose={closeAdminPanel} title="Edit Channel" />
      <div>
        <ChannelNameInputField
          name={name}
          error={errors.name || errors.permissions || null} // Coerce to string | null
          onChange={handleInputChange}
        />
        {(errors.name || errors.permissions) && (
          <span className="text-red-500 text-sm">
            {errors.name || errors.permissions}
          </span>
        )}
      </div>
      <UserList />
      <AdminPanelFooter
        buttonText="Save Changes"
        onButtonClick={handleSubmit}
        disabled={!!errors.name || !!errors.permissions}
      />
    </div>
  );
};
