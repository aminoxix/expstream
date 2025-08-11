import { useEffect, useMemo, useState } from "react";
import type { UserResponse } from "stream-chat";
import { Avatar, useChatContext } from "stream-chat-react";
import { useAdminPanelFormState } from "./context/form";
import { ValidationError } from "./error";

import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getUserFromStorage } from "@/lib/utils";

const MOCKED_LAST_ACTIVE_STRINGS = [
  "12 min ago",
  "27 min ago",
  "6 hours ago",
  "14 hours ago",
];

type UserListLoadState = "loading" | "error" | "empty";

const LOAD_STATE_NOTIFICATION: Record<UserListLoadState, string> = {
  empty: "No users found.",
  error: "Error loading, please refresh and try again.",
  loading: "Loading users...",
};

const ListContainer = ({ children }: { children: React.ReactNode }) => {
  const { errors, createChannelType } = useAdminPanelFormState();
  const showHeading = !createChannelType || createChannelType === "team";

  return (
    <div className="w-full border rounded-md p-4 bg-white shadow-sm">
      {showHeading && (
        <div className="mb-4 flex flex-col gap-1">
          <h2 className="text-lg font-semibold">Add Members</h2>
          <ValidationError errorMessage={errors.members} />
        </div>
      )}
      {children}
    </div>
  );
};

type UserItemProps = {
  index: number;
  user: UserResponse;
};

const UserItem = ({ index, user }: UserItemProps) => {
  const { handleMemberSelect } = useAdminPanelFormState();
  const lastActive = MOCKED_LAST_ACTIVE_STRINGS[index] || "Yesterday";
  const title = user.name || user.id;

  return (
    <TableRow className="hover:bg-muted/50 h-12">
      <TableCell className="flex items-center gap-3">
        <div className="size-8 rounded-md">
          <Avatar image={user.image} name={title} />
        </div>
        <span className="font-medium">{title}</span>
      </TableCell>
      <TableCell>{lastActive}</TableCell>
      <TableCell className="text-right">
        <Checkbox
          id={user.id}
          value={user.id}
          onCheckedChange={(checked) =>
            handleMemberSelect(user.id, checked === true)
          }
        />
      </TableCell>
    </TableRow>
  );
};

export const UserList = () => {
  const { client, channel } = useChatContext();
  const { createChannelType } = useAdminPanelFormState();

  const [loadState, setLoadState] = useState<UserListLoadState | null>(null);
  const [users, setUsers] = useState<UserResponse[] | undefined>();

  const channelMembers = useMemo(
    () => (channel?.state.members ? Object.keys(channel.state.members) : []),
    [channel?.state?.members]
  );

  const user = getUserFromStorage();

  useEffect(() => {
    const getUsers = async () => {
      if (loadState) return;
      setLoadState("loading");

      try {
        const response = await client.queryUsers(
          // { id: { $nin: [user.userId] } },
          {
            id: {
              // @ts-ignore - $nin not typed
              $nin: !createChannelType // not team / for edit
                ? [...channelMembers, user.userId]
                : [user.userId],
            },
          },
          { id: 1 },
          { limit: 8 }
        );

        if (response.users.length) {
          setUsers(response.users);
          setLoadState(null);
        } else {
          setLoadState("empty");
        }
      } catch {
        setLoadState("error");
      }
    };

    if (client) getUsers();
  }, [client, channelMembers, createChannelType]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ListContainer>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Last Active</TableHead>
            <TableHead className="text-right">Invite</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loadState ? (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-sm italic">
                {LOAD_STATE_NOTIFICATION[loadState]}
              </TableCell>
            </TableRow>
          ) : (
            users?.map((user, i) => (
              <UserItem index={i} key={user.id} user={user} />
            ))
          )}
        </TableBody>
      </Table>
    </ListContainer>
  );
};
