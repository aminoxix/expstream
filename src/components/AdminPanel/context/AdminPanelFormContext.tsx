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
import { Channel as StreamChannel } from "stream-chat";
import { useChatContext } from "stream-chat-react";
import { Workspace } from "../../../context/workspace-controller";

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
};

const Context = createContext<AdminPanelFormContext>({
  handleInputChange: () => null,
  handleMemberSelect: () => null,
  handleSubmit: () => null,
  members: [],
  name: "",
  errors: { name: null, members: null },
});

type AdminPanelFormProps = {
  workspace: Workspace;
  onSubmit: (newChannel?: StreamChannel) => void;
  defaultValues: FormValues;
};

const getChannelTypeFromWorkspaceName = (
  workspace: Workspace
): ChannelType | undefined =>
  workspace.match(/.*__(team|messaging)/)?.[1] as ChannelType | undefined;

const getUpsertAction = (workspace: Workspace): UpsertAction | undefined => {
  if (workspace.match("Channel-Create")) return "create";
  if (workspace.match("Channel-Edit")) return "update";
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

  const createChannelType = getChannelTypeFromWorkspaceName(workspace);
  const action = getUpsertAction(workspace);

  const createChannel = useCallback(
    async ({ name, members }: UpsertChannelParams) => {
      if (!createChannelType || members.length === 0) return undefined;

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
      return newChannel;
    },
    [createChannelType, setActiveChannel, client]
  );

  const updateChannel = useCallback(
    async ({ name, members }: UpsertChannelParams) => {
      if (name !== (channel?.data?.config?.name || channel?.data?.id)) {
        await channel?.update(
          { name },
          { text: `Channel name changed to ${name}` }
        );
      }
      if (members?.length) {
        await channel?.addMembers(members);
      }
    },
    [channel]
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
              ? "Channel name is required"
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
        return;
      }

      try {
        let newChannel: StreamChannel | undefined;
        if (action === "create")
          newChannel = await createChannel({ name, members });
        if (action === "update") await updateChannel({ name, members });
        onSubmit(newChannel);
      } catch (err) {
        console.error("[AdminPanelForm] Error:", err);
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
    },
    []
  );

  const handleMemberSelect = useCallback((value: string, checked: boolean) => {
    setMembers((prev) =>
      checked ? [...prev, value] : prev.filter((id) => id !== value)
    );
  }, []);

  useEffect(() => {
    setChannelName(defaultValues.name);
  }, [defaultValues, createChannelType]);

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
      }}
    >
      {children}
    </Context.Provider>
  );
};

export const useAdminPanelFormState = () => useContext(Context);
