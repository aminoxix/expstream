// src/components/context/form.tsx
"use client";

import { Workspace, WorkspaceKind } from "@/types/workspace";
import {
  generateDMChannelId,
  generateTeamChannelId,
} from "@/utils/channel-id-generator";
import { analyzeChatError } from "@/utils/chat-error-handler";
import { getChannelDisplayName } from "@/utils/helpers";
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
  members: z
    .array(z.string())
    .min(2, "At least 2 members are required to create a channel"),
});

const TeamFormValuesSchema = FormValuesSchema.refine(
  (data) => {
    return data.name && data.name.trim().length > 0;
  },
  {
    message: "Channel name is required for team channels",
    path: ["name"],
  },
).refine(
  (data) => {
    if (data.name && data.name.trim()) {
      const trimmedName = data.name.trim();
      return trimmedName.length >= 1 && trimmedName.length <= 100;
    }
    return true;
  },
  {
    message: "Channel name must be between 1 and 100 characters",
    path: ["name"],
  },
);

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
  workspace: Workspace,
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
  const [originalMembers, setOriginalMembers] = useState<string[]>(
    defaultValues.members,
  );
  const [errors, setErrors] = useState<FormErrors>({
    name: null,
    members: null,
    permissions: null,
  });

  const createChannelType = getChannelTypeFromWorkspace(workspace);
  const action = getUpsertAction(workspace);

  const canUpdateChannel = useCallback(() => {
    if (action === "create") return true;
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
      if (!createChannelType) {
        toast.error("Cannot create channel: Invalid channel type");
        return undefined;
      }

      if (members.length < 2) {
        setErrors((prev) => ({
          ...prev,
          members: "At least 2 members are required to create a channel",
        }));
        return undefined;
      }

      try {
        let channelId: string | undefined;
        if (createChannelType === "team" && name?.trim()) {
          channelId = generateTeamChannelId(name.trim());
        } else if (createChannelType === "messaging" && members.length === 2) {
          channelId = generateDMChannelId(members);
        }

        const channelData: {
          name?: string;
          members?: string[];
        } = {
          members,
        };

        if (name && name.trim()) {
          channelData.name = name.trim();
        }

        const newChannel = channelId
          ? client.channel(createChannelType, channelId, channelData)
          : client.channel(createChannelType, channelData);

        await newChannel.watch();
        setActiveChannel(newChannel);
        toast.success("Channel created successfully");
        return newChannel;
      } catch (error) {
        console.error("[AdminPanelForm] Channel creation failed:", error);

        const errorInfo = analyzeChatError(error);

        if (
          errorInfo.action === "retry" &&
          errorInfo.message.includes("2 members")
        ) {
          setErrors((prev) => ({
            ...prev,
            members: errorInfo.message,
          }));
        } else {
          toast.error(errorInfo.message);
        }

        throw error;
      }
    },
    [createChannelType, setActiveChannel, client, setErrors],
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
        const trimmedName = name?.trim();
        const currentName = getChannelDisplayName(channel);

        const currentMembers = originalMembers;
        const newMembers = members || [];
        const membersToAdd = newMembers.filter(
          (member) => !currentMembers.includes(member),
        );
        const membersToRemove = currentMembers.filter(
          (member) => !newMembers.includes(member),
        );

        const nameChanged = trimmedName && trimmedName !== currentName;
        const currentUserName =
          client.user?.name || client.user?.id || "Someone";

        const getMemberNames = async (memberIds: string[]) => {
          if (memberIds.length === 0) return [];
          try {
            const { users } = await client.queryUsers({
              id: { $in: memberIds },
            });
            return users.map((u) => u.name || u.id);
          } catch {
            return memberIds;
          }
        };

        if (nameChanged) {
          await channel.update(
            { name: trimmedName },
            {
              text: `${currentUserName} changed the channel name to ${trimmedName}`,
            },
          );
          await client.queryChannels(
            {
              id: channel.id,
              type: channel.type,
              members: { $in: [client.user?.id ?? ""] },
            },
            { last_message_at: -1, updated_at: -1 },
            { state: true, watch: true },
          );
          toast.success("Channel name updated");
        }

        if (membersToAdd.length > 0) {
          const addedNames = await getMemberNames(membersToAdd);
          await channel.addMembers(membersToAdd, {
            text: `${currentUserName} added ${addedNames.join(", ")}`,
          });
          toast.success(`Added ${membersToAdd.length} member(s) to channel`);
        }

        if (membersToRemove.length > 0) {
          const removedNames = await getMemberNames(membersToRemove);
          await channel.removeMembers(membersToRemove, {
            text: `${currentUserName} removed ${removedNames.join(", ")}`,
          });
          toast.success(
            `Removed ${membersToRemove.length} member(s) from channel`,
          );
        }
      } catch (error) {
        console.error("[AdminPanelForm] Channel update failed:", error);

        const errorInfo = analyzeChatError(error);

        if (
          errorInfo.action === "contact_support" &&
          errorInfo.message.includes("permission")
        ) {
          setErrors((prev) => ({
            ...prev,
            permissions: errorInfo.message,
          }));
        } else {
          toast.error(errorInfo.message);
        }

        throw error;
      }
    },
    [channel, canUpdateChannel, client, setErrors, originalMembers],
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
        const isTeamChannel =
          action === "create"
            ? createChannelType === "team"
            : channel?.type === "team";

        if (isTeamChannel) {
          TeamFormValuesSchema.parse(values);
        } else {
          FormValuesSchema.parse(values);
        }

        if (action === "update") {
          const membersChanged =
            JSON.stringify([...values.members].sort()) !==
            JSON.stringify([...originalMembers].sort());
          const nameChanged = values.name !== defaultValues.name;

          if (!nameChanged && !membersChanged) {
            errors = {
              name: null,
              members:
                "Please change the name or modify members to update the channel",
              permissions: null,
            };
          }
        }
      } catch (error) {
        if (error instanceof z.ZodError) {
          error.issues.forEach((err) => {
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
    [defaultValues.name, canUpdateChannel, originalMembers, channel],
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
    ],
  );

  const handleInputChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    (event) => {
      event.preventDefault();
      const value = event.target.value;
      setChannelName(value);

      setErrors((prev) => ({ ...prev, name: null, permissions: null }));

      if (channel?.type === "team" || createChannelType === "team") {
        const trimmedValue = value.trim();
        if (value && trimmedValue.length === 0) {
          setErrors((prev) => ({
            ...prev,
            name: "Channel name cannot be only whitespace",
          }));
        } else if (trimmedValue.length > 100) {
          setErrors((prev) => ({
            ...prev,
            name: "Channel name must be less than 100 characters",
          }));
        }
      }
    },
    [channel?.type, createChannelType],
  );

  const handleMemberSelect = useCallback((value: string, checked: boolean) => {
    setMembers((prev) =>
      checked ? [...prev, value] : prev.filter((id) => id !== value),
    );
    setErrors((prev) => ({ ...prev, members: null, permissions: null }));
  }, []);

  useEffect(() => {
    setChannelName(defaultValues.name || "");
    setMembers(defaultValues.members);
    setOriginalMembers(defaultValues.members);
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
