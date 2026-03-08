import { Button } from "@/components/ui/button";
import { XIcon } from "@phosphor-icons/react";

type AdminPanelHeaderProps = {
  onClose: () => void;
  title: string;
};

export const AdminPanelHeader = ({ onClose, title }: AdminPanelHeaderProps) => (
  <div className="flex items-center justify-between">
    <h1 className="font-bold text-xl">{title}</h1>
    <Button variant="outline" className="size-8" onClick={onClose}>
      <XIcon className="size-4" />
    </Button>
  </div>
);
