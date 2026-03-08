"use client";

import { ChatsCircleIcon } from "@phosphor-icons/react";

export function ChatEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
      <div className="flex items-center justify-center size-16 rounded-full bg-muted text-muted-foreground">
        <ChatsCircleIcon weight="duotone" className="size-8" />
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">No conversation selected</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Choose a conversation from the sidebar or start a new one to begin
          chatting.
        </p>
      </div>
    </div>
  );
}
