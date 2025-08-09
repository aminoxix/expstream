import { MouseEventHandler } from "react";
import { Button } from "../ui/button";

type AdminPanelFooterProps = {
  buttonText: string;
  onButtonClick: MouseEventHandler<HTMLButtonElement>;
};

export const AdminPanelFooter = ({
  buttonText,
  onButtonClick,
}: AdminPanelFooterProps) => (
  <div className="flex justify-end mr-2">
    <Button onClick={onButtonClick}>{buttonText}</Button>
  </div>
);
