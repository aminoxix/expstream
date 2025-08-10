// src/components/context/form.tsx
"use client";

import { Workspace, WorkspaceKind } from "@/types/workspace";
import {
  ChangeEventHandler,
  createContext,
  MouseEventHandler,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { toast } from "sonner";
import { Channel as StreamChannel } from "stream-chat";
import { useChatContext } from "stream-chat-react";

type UpsertChannelParams = { name: string; members: string[] };

type ChannelType = "team" | "messaging";

type UpsertAction = "create" | "update";

export type FormValues = {
  name: string;
  members: string[];
};

export type FormErrors = {
  name: string | null;
  members: string | null;
};

type AdminPanelFormContext = FormValues & {
  handleInputChange: ChangeEventHandler<HTMLInputElement>;
  handleMemberSelect: (value: string, checked: boolean) => void;
  handleSubmit: MouseEventHandler<HTMLButtonElement>;
  createChannelType?: ChannelType;
  errors: FormErrors;
  canUpdateChannel: boolean; // Added to indicate update permission
};

const Context = createContext<AdminPanelFormContext>({
  handleInputChange: () => null,
  handleMemberSelect: () => null,
  handleSubmit: () => null,
  members: [],
  name: "",
  errors: { name: null, members: null },
  canUpdateChannel: false,
});

type AdminPanelFormProps = {
  workspace: Workspace;
  onSubmit: (newChannel?: StreamChannel) => void;
  defaultValues: FormValues;
};

const getChannelTypeFromWorkspace = (
  workspace: Workspace
): ChannelType | undefined => {
  switch (workspace.kind) {
    case WorkspaceKind.AdminChannelCreateTeam:
      return "team";
    case WorkspaceKind.AdminChannelCreateMessaging:
      return "messaging";
    default:
      return undefined;
  }
};

const getUpsertAction = (workspace: Workspace): UpsertAction | undefined => {
  switch (workspace.kind) {
    case WorkspaceKind.AdminChannelCreateTeam:
    case WorkspaceKind.AdminChannelCreateMessaging:
      return "create";
    case WorkspaceKind.AdminChannelEdit:
      return "update";
    default:
      return undefined;
  }
};

export const AdminPanelForm = ({
  children,
  defaultValues,
  workspace,
  onSubmit,
}: PropsWithChildren<AdminPanelFormProps>) => {
  const { client, channel, setActiveChannel } = useChatContext();
  const [name, setChannelName] = useState<string>(defaultValues.name);
  const [members, setMembers] = useState<string[]>(defaultValues.members);
  const [errors, setErrors] = useState<FormErrors>({
    name: null,
    members: null,
  });

  const createChannelType = getChannelTypeFromWorkspace(workspace);
  const action = getUpsertAction(workspace);

  // Check if user has permission to update channel
  const canUpdateChannel = useCallback(() => {
    if (!channel || action !== "update") return false;
    // Check user roles or channel permissions
    const userRoles = client.user?.role ? [client.user.role] : [];
    const channelRoles = channel.data?.own_capabilities || [];
    return (
      userRoles.includes("admin") ||
      userRoles.includes("channel_moderator") ||
      channelRoles.includes("update-channel")
    );
  }, [client.user, channel, action]);

  const createChannel = useCallback(
    async ({ name, members }: UpsertChannelParams) => {
      if (!createChannelType || members.length === 0) {
        toast.error(
          "Cannot create channel: Invalid type or no members selected"
        );
        return undefined;
      }

      try {
        const channelId = name
          ? name.toLowerCase().replace(/\s/g, "-")
          : undefined;
        const newChannel = client.channel(createChannelType, channelId, {
          name,
          members,
          demo: "team",
        });

        await newChannel.watch();
        setActiveChannel(newChannel);
        toast.success("Channel created successfully");
        return newChannel;
      } catch (error) {
        toast.error("Failed to create channel");
        throw error;
      }
    },
    [createChannelType, setActiveChannel, client]
  );

  const updateChannel = useCallback(
    async ({ name, members }: UpsertChannelParams) => {
      if (!channel) {
        toast.error("No channel selected for update");
        return;
      }

      if (!canUpdateChannel()) {
        toast.error("You do not have permission to update this channel");
        return;
      }

      try {
        if (name !== (channel?.data?.name || channel?.id)) {
          await channel.update(
            { name },
            { text: `Channel name changed to ${name}` }
          );
          toast.success("Channel name updated");
        }
        if (members?.length) {
          await channel.addMembers(members);
          toast.success("Members added to channel");
        }
      } catch (error) {
        toast.error("Failed to update channel: Insufficient permissions");
        throw error;
      }
    },
    [channel, canUpdateChannel]
  );

  const validateForm = useCallback(
    ({
      action,
      createChannelType,
      values,
    }: {
      values: FormValues;
      action?: UpsertAction;
      createChannelType?: ChannelType;
    }): FormErrors | null => {
      let errors: FormErrors = { name: null, members: null };

      if (action === "create") {
        errors = {
          name:
            !values.name && createChannelType === "team"
              ? "Channel name is required for team channels"
              : null,
          members:
            values.members.length < 2
              ? "At least one additional member is required"
              : null,
        };
      }

      if (
        action === "update" &&
        values.name === defaultValues.name &&
        values.members.length === 0
      ) {
        errors = {
          name: "Name not changed (change name or add members)",
          members: "No new members added (change name or add members)",
        };
      }

      return Object.values(errors).some((v) => !!v) ? errors : null;
    },
    [defaultValues.name]
  );

  const handleSubmit: MouseEventHandler<HTMLButtonElement> = useCallback(
    async (event) => {
      event.preventDefault();
      const errors = validateForm({
        values: { name, members },
        action,
        createChannelType,
      });

      if (errors) {
        setErrors(errors);
        toast.error("Please fix form errors before submitting");
        return;
      }

      try {
        let newChannel: StreamChannel | undefined;
        if (action === "create") {
          newChannel = await createChannel({ name, members });
        }
        if (action === "update") {
          await updateChannel({ name, members });
        }
        onSubmit(newChannel);
      } catch (error) {
        console.error("[AdminPanelForm] Error:", error);
      }
    },
    [
      action,
      createChannelType,
      name,
      members,
      createChannel,
      updateChannel,
      onSubmit,
      validateForm,
    ]
  );

  const handleInputChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    (event) => {
      event.preventDefault();
      setChannelName(event.target.value);
      setErrors((prev) => ({ ...prev, name: null }));
    },
    []
  );

  const handleMemberSelect = useCallback((value: string, checked: boolean) => {
    setMembers((prev) =>
      checked ? [...prev, value] : prev.filter((id) => id !== value)
    );
    setErrors((prev) => ({ ...prev, members: null }));
  }, []);

  useEffect(() => {
    setChannelName(defaultValues.name);
    setMembers(defaultValues.members);
    setErrors({ name: null, members: null });
  }, [defaultValues]);

  return (
    <Context.Provider
      value={{
        createChannelType,
        errors,
        name,
        members,
        handleInputChange,
        handleMemberSelect,
        handleSubmit,
        canUpdateChannel: canUpdateChannel(),
      }}
    >
      {children}
    </Context.Provider>
  );
};

export const useAdminPanelFormState = () => useContext(Context);
