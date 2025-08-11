// src/components/channel-name-input.tsx
"use client";

import { ChangeEventHandler } from "react";
import { Input } from "../ui/input";

export interface ChannelNameInputProps {
  name: string | undefined;
  error: string | null;
  placeholder?: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
}

export const ChannelNameInputField = ({
  name,
  error,
  placeholder = "Channel name",
  onChange,
}: ChannelNameInputProps) => {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="channel-name" className="text-sm font-medium">
        Channel Name
      </label>
      <Input
        id="channel-name"
        value={name ?? ""}
        onChange={onChange}
        placeholder={placeholder || "Enter channel name"}
        className={`border rounded p-2 ${
          error ? "border-red-500" : "border-gray-300"
        }`}
        aria-invalid={!!error}
        aria-describedby={error ? "channel-name-error" : undefined}
      />
    </div>
  );
};
