"use client";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useWorkspaceController } from "@/context/workspace-controller";
import { useIsMobile } from "@/hooks/use-mobile";
import { WorkspaceKind } from "@/types/workspace";
import type { Channel } from "stream-chat";
import { AdminPanel } from "./admin/panel";

const ADMIN_WORKSPACE_KINDS: WorkspaceKind[] = [
  WorkspaceKind.AdminChannelEdit,
  WorkspaceKind.AdminChannelCreateTeam,
  WorkspaceKind.AdminChannelCreateMessaging,
];

interface ResponsiveChatLayoutProps {
  selectedChannel: Channel | undefined;
  setActiveChannel: React.Dispatch<React.SetStateAction<Channel | undefined>>;
  renderSidebar: () => React.ReactNode;
  renderChat: () => React.ReactNode;
  renderEmptyState: () => React.ReactNode;
  panelGroupClassName?: string;
  sidebarScrollClassName?: string;
}

export function ResponsiveChatLayout({
  selectedChannel,
  setActiveChannel,
  renderSidebar,
  renderChat,
  renderEmptyState,
  panelGroupClassName = "h-full",
  sidebarScrollClassName = "h-full overflow-y-auto p-4",
}: ResponsiveChatLayoutProps) {
  const isMobile = useIsMobile();
  const { activeWorkspace } = useWorkspaceController();
  const isAdminPanel = ADMIN_WORKSPACE_KINDS.includes(activeWorkspace.kind);

  const renderRightPanel = () => {
    if (isAdminPanel) {
      return <AdminPanel setActiveChannel={setActiveChannel} />;
    }
    if (selectedChannel) {
      return renderChat();
    }
    return renderEmptyState();
  };

  if (isMobile) {
    if (isAdminPanel) {
      return (
        <div className="h-full flex flex-col">
          <AdminPanel setActiveChannel={setActiveChannel} />
        </div>
      );
    }
    if (selectedChannel) {
      return <div className="h-full flex flex-col">{renderChat()}</div>;
    }
    return <div className="h-full overflow-y-auto p-4">{renderSidebar()}</div>;
  }

  return (
    <ResizablePanelGroup direction="horizontal" className={panelGroupClassName}>
      <ResizablePanel
        minSize={20}
        maxSize={35}
        defaultSize={32}
        className="border-r bg-white"
      >
        <div className={sidebarScrollClassName}>{renderSidebar()}</div>
      </ResizablePanel>

      <ResizableHandle withHandle className="bg-border" />

      <ResizablePanel className="flex-1">{renderRightPanel()}</ResizablePanel>
    </ResizablePanelGroup>
  );
}
