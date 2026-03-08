import { cn } from "@/lib/utils";
import type { Icon } from "@phosphor-icons/react";
import * as React from "react";
import { Input } from "./input";

export const InputWithIcon: React.FC<
  { Icon: Icon; inputClassName?: string } & React.ComponentProps<"input">
> = ({ Icon, inputClassName, ...props }) => (
  <div className={cn("relative", props.className)}>
    <Icon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 z-10" />
    <Input
      {...props}
      className={cn(
        "flex-1 pl-10 pr-3 py-2 text-md w-full border border-gray-300 rounded-lg focus:border-gray-500 focus:ring-0 focus-visible:ring-0",
        inputClassName,
      )}
    />
  </div>
);
