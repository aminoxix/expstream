// src/components/footer.tsx
"use client";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { QuestionIcon } from "@phosphor-icons/react";
import { MouseEventHandler } from "react";
import { useAdminPanelFormState } from "./context/form";

export interface AdminPanelFooterProps {
  buttonText: string;
  disabled?: boolean;
  onButtonClick: MouseEventHandler<HTMLButtonElement>;
}

export const AdminPanelFooter = ({
  buttonText,
  onButtonClick,
  disabled = false,
}: AdminPanelFooterProps) => {
  const { canUpdateChannel } = useAdminPanelFormState();
  return (
    <div className="p-4 border-t flex justify-end items-center gap-2">
      {!canUpdateChannel ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <QuestionIcon />
          </TooltipTrigger>
          <TooltipContent>
            <p>You do not have permission to edit this channel.</p>
          </TooltipContent>
        </Tooltip>
      ) : null}
      <Button
        type="submit"
        onClick={onButtonClick}
        aria-disabled={disabled}
        disabled={disabled || !canUpdateChannel}
      >
        {buttonText}
      </Button>
    </div>
  );
};
