// src/context/WorkspaceController.tsx
"use client";

import React, { useCallback, useContext, useState } from "react";
import { Workspace, WorkspaceFactory } from "../types/workspace";

type WorkspaceContext = {
  activeWorkspace: Workspace;
  closeAdminPanel: () => void;
  displayWorkspace: (workspace: Workspace) => void;
  pinnedMessageListOpen: boolean;
  togglePinnedMessageListOpen: () => void;
  closePinnedMessageListOpen: () => void;
};

const WorkspaceControllerContext = React.createContext<WorkspaceContext>({
  activeWorkspace: WorkspaceFactory.createChat(),
  closeAdminPanel: () => {},
  displayWorkspace: () => {},
  pinnedMessageListOpen: false,
  togglePinnedMessageListOpen: () => {},
  closePinnedMessageListOpen: () => {},
});

export const WorkspaceController = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace>(
    WorkspaceFactory.createChat()
  );
  const [pinnedMessageListOpen, setPinnedMessageListOpen] = useState(false);

  console.log("activeWorkspace", activeWorkspace);

  const displayWorkspace = useCallback((workspace: Workspace) => {
    console.log("workspace", workspace);
    setActiveWorkspace(workspace);
    setPinnedMessageListOpen(false);
  }, []);

  const closeAdminPanel = useCallback(() => {
    displayWorkspace(WorkspaceFactory.createChat());
  }, [displayWorkspace]);

  const togglePinnedMessageListOpen = useCallback(
    () => setPinnedMessageListOpen((prev) => !prev),
    []
  );

  const closePinnedMessageListOpen = useCallback(
    () => setPinnedMessageListOpen(false),
    []
  );

  return (
    <WorkspaceControllerContext.Provider
      value={{
        activeWorkspace,
        closeAdminPanel,
        displayWorkspace,
        pinnedMessageListOpen,
        closePinnedMessageListOpen,
        togglePinnedMessageListOpen,
      }}
    >
      {children}
    </WorkspaceControllerContext.Provider>
  );
};

export const useWorkspaceController = () =>
  useContext(WorkspaceControllerContext);
