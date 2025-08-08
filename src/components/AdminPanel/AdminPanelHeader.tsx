import { CloseIcon } from "stream-chat-react";
import { Button } from "../ui/button";

type AdminPanelHeaderProps = {
  onClose: () => void;
  title: string;
};

export const AdminPanelHeader = ({ onClose, title }: AdminPanelHeaderProps) => (
  <div className="flex p-2 justify-between">
    <h1 className="font-bold text-xl">{title}</h1>
    <Button variant="ghost" onClick={onClose}>
      <CloseIcon />
    </Button>
  </div>
);
