import { Label } from "@radix-ui/react-dropdown-menu";
import { ChangeEventHandler } from "react";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { ValidationError } from "./ValidationError";

type ChannelNameInputProps = {
  name: string;
  error: string | null;
  onChange: ChangeEventHandler<HTMLInputElement>;
  placeholder?: string;
};

export const ChannelNameInputField = ({
  name = "",
  error,
  placeholder = "channel-name",
  onChange,
}: ChannelNameInputProps) => {
  return (
    <Card className="p-4">
      <div>
        <Label className="font-semibold"># Channel Name</Label>
        <ValidationError errorMessage={error} />
      </div>
      <Input
        onChange={onChange}
        placeholder={placeholder}
        type="text"
        value={name}
      />
    </Card>
  );
};
