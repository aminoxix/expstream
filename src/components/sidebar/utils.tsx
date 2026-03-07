import type {
  Channel,
  ChannelFilters,
  StreamChat,
  UserResponse,
} from "stream-chat";

import { generateDMChannelId } from "@/utils/channel-id-generator";
import { getDisplayName } from "@/utils/helpers";

export type ChannelOrUserType = Channel | UserResponse;

export const isChannel = (channel: ChannelOrUserType): channel is Channel =>
  (channel as Channel).cid !== undefined;

type Props = {
  client: StreamChat;
  setActiveChannel: (
    newChannel?: Channel,
    watchers?: {
      limit?: number;
      offset?: number;
    },
    event?: React.SyntheticEvent,
  ) => void;
  user: UserResponse;
};

export const channelByUser = async (props: Props) => {
  const { client, setActiveChannel, user } = props;

  const targetUserId = user.id;
  const currentUserId = client.user?.id || "";

  if (!currentUserId) throw new Error("Current user not found");

  const channelId = generateDMChannelId([currentUserId, targetUserId]);

  try {
    // First, try to find existing channel with both members
    const filters: ChannelFilters = {
      type: "messaging",
      members: { $eq: [currentUserId, targetUserId] },
    };

    const channels = await client.queryChannels(
      filters,
      { last_message_at: -1 },
      { limit: 1 },
    );

    if (channels.length > 0) {
      const existingChannel = channels[0];
      if (existingChannel) {
        try {
          await existingChannel.watch();
          setActiveChannel(existingChannel);
          return existingChannel;
        } catch (watchError) {
          console.warn("Failed to watch existing channel:", watchError);
        }
      }
    }

    try {
      const specificChannel = client.channel("messaging", channelId);
      await specificChannel.watch();
      setActiveChannel(specificChannel);
      return specificChannel;
    } catch (error) {
      // Channel doesn't exist, continue to creation
    }

    try {
      await client.upsertUser({
        id: user.id,
        name: getDisplayName(user) || user.name || user.id,
        image: user.image,
        role: user.role,
      });
    } catch (upsertError) {
      console.warn("Failed to upsert user:", upsertError);
    }

    // Create new channel
    const channelData: Record<string, unknown> = {
      members: [currentUserId, targetUserId],
      name: `DM: ${getDisplayName(client.user) || client.user?.name || client.user?.id} & ${getDisplayName(user) || user.name || user.id}`,
      created_by: { id: currentUserId },
    };

    const newChannel = client.channel("messaging", channelId, channelData);

    await newChannel.create();
    await newChannel.watch();

    setActiveChannel(newChannel);
    return newChannel;
  } catch (error: unknown) {
    console.error("Error in channelByUser:", error);

    const err = error as { code?: number; message?: string };
    if (err?.code === 17 || err?.message?.includes("permission")) {
      throw new Error(
        `Cannot create direct message with ${getDisplayName(user) || user.name || user.id}. ` +
          "You don't have permission to create new channels.",
      );
    }

    if (err?.code === 4 || err?.message?.includes("already exists")) {
      try {
        const existingChannel = client.channel("messaging", channelId);
        await existingChannel.watch();
        setActiveChannel(existingChannel);
        return existingChannel;
      } catch (watchError) {
        console.error("Failed to watch existing channel:", watchError);
      }
    }

    throw new Error(
      `Failed to create or access channel: ${err?.message || "Unknown error"}`,
    );
  }
};
