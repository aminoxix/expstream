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
import { z } from "zod";

type ChannelType = "team" | "messaging";
type UpsertAction = "create" | "update";

// Zod schemas for form validation
const FormValuesSchema = z.object({
  name: z.string().optional(),
  members: z.array(z.string()).min(1, "At least one member is required"),
});

const TeamFormValuesSchema = FormValuesSchema.refine((data) => !!data.name, {
  message: "Channel name is required for team channels",
  path: ["name"],
});

export type FormValues = z.infer<typeof FormValuesSchema>;
export type FormErrors = {
  name: string | null;
  members: string | null;
  permissions?: string | null;
};

type AdminPanelFormContext = FormValues & {
  handleInputChange: ChangeEventHandler<HTMLInputElement>;
  handleMemberSelect: (value: string, checked: boolean) => void;
  handleSubmit: MouseEventHandler<HTMLButtonElement>;
  createChannelType?: ChannelType;
  errors: FormErrors;
  canUpdateChannel: boolean;
};

const Context = createContext<AdminPanelFormContext>({
  handleInputChange: () => null,
  handleMemberSelect: () => null,
  handleSubmit: () => null,
  members: [],
  name: "",
  errors: { name: null, members: null, permissions: null },
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
  const [name, setChannelName] = useState<string>(defaultValues.name || "");
  const [members, setMembers] = useState<string[]>(defaultValues.members);
  const [errors, setErrors] = useState<FormErrors>({
    name: null,
    members: null,
    permissions: null,
  });

  const createChannelType = getChannelTypeFromWorkspace(workspace);
  const action = getUpsertAction(workspace);

  const canUpdateChannel = useCallback(() => {
    if (!channel || action !== "update") return false;
    const userRoles = client.user?.role ? [client.user.role] : [];
    const channelRoles = channel.data?.own_capabilities || [];
    return (
      userRoles.includes("admin") ||
      userRoles.includes("channel_moderator") ||
      channelRoles.includes("update-channel")
    );
  }, [client.user, channel, action]);

  const createChannel = useCallback(
    async ({ name, members }: FormValues) => {
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
    async ({ name, members }: FormValues) => {
      if (!channel) {
        toast.error("No channel selected for update");
        return;
      }

      if (!canUpdateChannel()) {
        setErrors((prev) => ({
          ...prev,
          permissions: "You do not have permission to update this channel",
        }));
        toast.error("You do not have permission to update this channel");
        return;
      }

      try {
        if (name !== (channel?.data?.name || channel?.id)) {
          await channel.update(
            { name, demo: channel.data?.demo || "team" },
            { text: `Channel name changed to ${name}` }
          );
          // Force refresh of channel list
          await client.queryChannels(
            {
              id: channel.id,
              type: channel.type,
              members: { $in: [client.userID ?? ""] },
            },
            { last_message_at: -1, updated_at: -1 },
            { state: true, watch: true }
          );
          toast.success("Channel name updated");
        }
        if (members?.length) {
          await channel.addMembers(members);
          toast.success("Members added to channel");
        }
      } catch (error: any) {
        if (error?.code === 17) {
          setErrors((prev) => ({
            ...prev,
            permissions: "You do not have permission to update this channel",
          }));
          toast.error("Failed to update channel: Insufficient permissions");
        } else {
          toast.error("Failed to update channel");
        }
        throw error;
      }
    },
    [channel, canUpdateChannel, client]
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
      let errors: FormErrors = { name: null, members: null, permissions: null };

      try {
        if (action === "create") {
          if (createChannelType === "team") {
            TeamFormValuesSchema.parse(values);
          } else {
            FormValuesSchema.parse(values);
          }
        } else if (action === "update") {
          FormValuesSchema.parse(values);
          if (
            values.name === defaultValues.name &&
            values.members.length === 0
          ) {
            errors = {
              name: "Name not changed (change name or add members)",
              members: "No new members added (change name or add members)",
              permissions: null,
            };
          }
          if (!canUpdateChannel()) {
            errors.permissions =
              "You do not have permission to update this channel";
          }
        }
      } catch (error) {
        if (error instanceof z.ZodError) {
          error.issues.forEach((err) => {
            // Changed from error.errors to error.issues
            if (err.path.includes("name")) {
              errors.name = err.message;
            }
            if (err.path.includes("members")) {
              errors.members = err.message;
            }
          });
        }
      }

      return Object.values(errors).some((v) => !!v) ? errors : null;
    },
    [defaultValues.name, canUpdateChannel]
  );

  const handleSubmit: MouseEventHandler<HTMLButtonElement> = useCallback(
    async (event) => {
      event.preventDefault();
      const values = { name, members };
      const errors = validateForm({
        values,
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
          newChannel = await createChannel(values);
        }
        if (action === "update") {
          await updateChannel(values);
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
      setErrors((prev) => ({ ...prev, name: null, permissions: null }));
    },
    []
  );

  const handleMemberSelect = useCallback((value: string, checked: boolean) => {
    setMembers((prev) =>
      checked ? [...prev, value] : prev.filter((id) => id !== value)
    );
    setErrors((prev) => ({ ...prev, members: null, permissions: null }));
  }, []);

  useEffect(() => {
    setChannelName(defaultValues.name || "");
    setMembers(defaultValues.members);
    setErrors({ name: null, members: null, permissions: null });
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
