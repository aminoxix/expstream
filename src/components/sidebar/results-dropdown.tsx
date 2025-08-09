import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils"; // Utility for conditional classNames
import { Channel, UserResponse } from "stream-chat";
import { Avatar, useChatContext } from "stream-chat-react";
import { channelByUser, ChannelOrUserType, isChannel } from "./utils";

type SearchResultProps = {
  result: ChannelOrUserType;
  focusedId: string;
  setChannel: (channel: Channel) => void;
};

const SearchResultItem = ({
  result,
  focusedId,
  setChannel,
}: SearchResultProps) => {
  const { client, setActiveChannel } = useChatContext();

  if (isChannel(result)) {
    const channel = result as Channel;

    return (
      <DropdownMenuItem
        onSelect={() => setChannel(channel)}
        className={cn("cursor-pointer", {
          "bg-muted": focusedId === channel.id,
        })}
      >
        <span className="text-sm">
          # {channel?.data?.config?.name || channel.id}
        </span>
      </DropdownMenuItem>
    );
  } else {
    const user = result as UserResponse;

    return (
      <DropdownMenuItem
        onSelect={() => channelByUser({ client, setActiveChannel, user })}
        className={cn("flex items-center gap-2 cursor-pointer", {
          "bg-muted": focusedId === user.id,
        })}
      >
        <div className="size-8 justify-center items-center flex">
          <Avatar image={user.image} name={user.name || user.id} />
        </div>
        <span className="text-sm">
          {user.name || user.id || "Unknown User"}
        </span>
      </DropdownMenuItem>
    );
  }
};

type ResultsDropdownProps = {
  teamChannels?: Channel[];
  directChannels?: UserResponse[];
  focusedId: string;
  loading: boolean;
  setChannel: (channel: Channel) => void;
  setQuery: React.Dispatch<React.SetStateAction<string>>;
};

export const ResultsDropdown = ({
  teamChannels = [],
  directChannels = [],
  focusedId,
  loading,
  setChannel,
  setQuery,
}: ResultsDropdownProps) => {
  return (
    <DropdownMenu onOpenChange={(open) => !open && setQuery("")}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full justify-start">
          Search Results
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64 max-h-96 overflow-y-auto">
        <DropdownMenuLabel>Channels</DropdownMenuLabel>
        <DropdownMenuGroup>
          {loading && !teamChannels.length && (
            <DropdownMenuItem disabled>
              <i>Loading...</i>
            </DropdownMenuItem>
          )}
          {!loading && teamChannels.length === 0 && (
            <DropdownMenuItem disabled>
              <i>No channels found</i>
            </DropdownMenuItem>
          )}
          {teamChannels.map((channel) => (
            <SearchResultItem
              key={channel.id}
              result={channel}
              focusedId={focusedId}
              setChannel={setChannel}
            />
          ))}
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuLabel>Users</DropdownMenuLabel>
        <DropdownMenuGroup>
          {loading && !directChannels.length && (
            <DropdownMenuItem disabled>
              <i>Loading...</i>
            </DropdownMenuItem>
          )}
          {!loading && directChannels.length === 0 && (
            <DropdownMenuItem disabled>
              <i>No direct messages found</i>
            </DropdownMenuItem>
          )}
          {directChannels.map((user) => (
            <SearchResultItem
              key={user.id}
              result={user}
              focusedId={focusedId}
              setChannel={setChannel}
            />
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
