"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useWorkspaceController } from "@/context/workspace-controller";
import { XIcon } from "@phosphor-icons/react";
import {
  DialogManagerProvider,
  Message,
  useChannelStateContext,
} from "stream-chat-react";
import { TeamMessage } from "./message";

export const PinnedMessageList = () => {
  const { pinnedMessageListOpen, togglePinnedMessageListOpen } =
    useWorkspaceController();
  const { channel } = useChannelStateContext();

  if (!pinnedMessageListOpen) return null;

  const pinnedMessages = channel.state.pinnedMessages || [];
  const hasPinnedMessages = pinnedMessages.length > 0;

  return (
    <DialogManagerProvider id="pinned-message-list-dialog-manager">
      <div className="absolute top-0 right-0 z-50 h-full w-full max-w-md bg-white shadow-xl border-l border-gray-200 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Pins</h2>
          <Button
            size="icon"
            variant="secondary"
            onClick={togglePinnedMessageListOpen}
          >
            <XIcon />
          </Button>
        </div>

        {/* Divider */}
        <Separator />

        {/* Pinned messages list */}
        <div className="flex-1 overflow-y-auto p-4">
          {hasPinnedMessages ? (
            pinnedMessages.map((message) => (
              <div key={message.id} className="mb-4 last:mb-0 overflow-hidden">
                <Message
                  groupStyles={["single"]}
                  message={message}
                  Message={TeamMessage}
                />
              </div>
            ))
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500 text-sm">
              No pinned messages
            </div>
          )}
        </div>
      </div>
    </DialogManagerProvider>
  );
};
