"use client";

import { AvatarSimple } from "@/components/ui/avatar-simple";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useUsersContext } from "@/context/users-provider";
import { getFileUrl, getInitials } from "@/lib/utils";
import { getDisplayName } from "@/utils/helpers";
import { useEffect, useMemo, useRef, useState } from "react";
import type { UserFilters, UserResponse } from "stream-chat";
import { useChatContext } from "stream-chat-react";
import { useAdminPanelFormState } from "./context/form";
import { ValidationError } from "./error";

type UserListLoadState = "loading" | "error" | "empty";

const LOAD_STATE_NOTIFICATION: Record<UserListLoadState, string> = {
  empty: "No users found.",
  error: "Error loading, please refresh and try again.",
  loading: "Loading users...",
};

const ListContainer = ({ children }: { children: React.ReactNode }) => {
  const { errors, createChannelType } = useAdminPanelFormState();
  const showHeading = !createChannelType || createChannelType === "team";

  const showMemberError =
    createChannelType === "team" || createChannelType === "messaging";

  return (
    <div className="w-full border rounded-md p-4 bg-white shadow-sm">
      {showHeading && (
        <div className="mb-4 flex flex-col gap-1">
          <h2 className="text-lg font-semibold">Add Members</h2>
          {showMemberError && <ValidationError errorMessage={errors.members} />}
        </div>
      )}
      {!showHeading && showMemberError && (
        <div className="mb-4 flex flex-col gap-1">
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
  const { handleMemberSelect, members } = useAdminPanelFormState();
  const title = getDisplayName(user) || user.name || user.id;

  const isSelected = members.includes(user.id);

  return (
    <TableRow className="hover:bg-muted/50 h-12">
      <TableCell className="flex items-center gap-3">
        <AvatarSimple
          src={getFileUrl(user.image || "")}
          className="size-8 rounded-md"
          fallback={getInitials(title)}
        />
        <span className="font-medium">{title}</span>
      </TableCell>
      <TableCell className="text-right">
        <Checkbox
          id={user.id}
          value={user.id}
          checked={isSelected}
          onCheckedChange={(checked) =>
            handleMemberSelect(user.id, checked === true)
          }
        />
      </TableCell>
    </TableRow>
  );
};

interface UserListProps {
  users?: UserResponse[];
  loading?: boolean;
  onUsersChange?: (users: UserResponse[]) => void;
  useStreamChatQuery?: boolean;
}

export const UserList = ({
  users: externalUsers,
  loading: externalLoading = false,
  onUsersChange,
  useStreamChatQuery = true,
}: UserListProps = {}) => {
  const { client, channel } = useChatContext();
  const { createChannelType } = useAdminPanelFormState();
  const usersContext = useUsersContext();

  const [loadState, setLoadState] = useState<UserListLoadState | null>(null);
  const [internalUsers, setInternalUsers] = useState<
    UserResponse[] | undefined
  >();
  const hasFetchedRef = useRef(false);

  const channelMembers = useMemo(
    () => (channel?.state.members ? Object.keys(channel.state.members) : []),
    [channel?.state?.members],
  );

  const currentUserId = client.user?.id;

  // Convert channel members to UserResponse format for editing
  const channelMembersAsUsers = useMemo(() => {
    if (!channel?.state?.members || createChannelType) return [];

    return Object.values(channel.state.members)
      .filter((member) => member.user?.id !== currentUserId)
      .map(
        (member) =>
          ({
            id: member.user?.id || "",
            name: getDisplayName(member.user),
            image: getFileUrl(member.user?.image || ""),
            online: member.user?.online || false,
            created_at: member.user?.created_at || new Date().toISOString(),
            updated_at: member.user?.updated_at || new Date().toISOString(),
            last_active: member.user?.last_active || new Date().toISOString(),
            banned: member.user?.banned || false,
            role: member.user?.role || "user",
          }) as UserResponse,
      );
  }, [channel?.state?.members, currentUserId, createChannelType]);

  // Priority: external props > context > internal state, then merge with channel members
  const baseUsers = externalUsers || usersContext?.users || internalUsers;
  const users = useMemo(() => {
    if (!baseUsers && !channelMembersAsUsers.length) return undefined;

    const allUsers = [...(baseUsers || [])];

    // Add channel members that aren't already in the list
    channelMembersAsUsers.forEach((channelUser) => {
      if (!allUsers.some((user) => user.id === channelUser.id)) {
        allUsers.unshift(channelUser);
      }
    });

    return allUsers;
  }, [baseUsers, channelMembersAsUsers]);

  const { handleMemberSelect, members } = useAdminPanelFormState();

  const allSelected =
    !!users?.length && users.every((u) => members.includes(u.id));

  const handleSelectAll = (checked: boolean) => {
    users?.forEach((u) => {
      const isSelected = members.includes(u.id);
      if (checked && !isSelected) {
        handleMemberSelect(u.id, true);
      } else if (!checked && isSelected) {
        handleMemberSelect(u.id, false);
      }
    });
  };

  const isLoading = externalLoading || loadState === "loading";

  useEffect(() => {
    if (!useStreamChatQuery || externalUsers || usersContext?.users) return;
    if (!client || !currentUserId) return;
    if (hasFetchedRef.current) return;

    hasFetchedRef.current = true;
    setLoadState("loading");

    const excludeUserIds = createChannelType
      ? [currentUserId].filter(Boolean)
      : [currentUserId, ...channelMembers].filter(Boolean);

    client
      .queryUsers(
        // $nin is supported by the API but not in the SDK's TypeScript definitions
        {
          id: { $nin: excludeUserIds },
        } as unknown as UserFilters,
        { id: 1 },
        { limit: 8 },
      )
      .then((response) => {
        if (response.users.length) {
          setInternalUsers(response.users);
          setLoadState(null);
        } else {
          setLoadState("empty");
        }
      })
      .catch(() => {
        setLoadState("error");
        hasFetchedRef.current = false;
      });
  }, [
    client,
    channelMembers,
    createChannelType,
    currentUserId,
    useStreamChatQuery,
    externalUsers,
    usersContext?.users,
  ]);

  // Notify parent component of the merged user list
  useEffect(() => {
    if (users && onUsersChange) {
      onUsersChange(users);
    }
  }, [users, onUsersChange]);

  return (
    <ListContainer>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead className="text-right">
              <Checkbox
                checked={allSelected}
                onCheckedChange={(checked) => handleSelectAll(checked === true)}
              />
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loadState || isLoading ? (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-sm italic">
                {loadState
                  ? LOAD_STATE_NOTIFICATION[loadState]
                  : "Loading users..."}
              </TableCell>
            </TableRow>
          ) : !users?.length ? (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-sm italic">
                {LOAD_STATE_NOTIFICATION.empty}
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
